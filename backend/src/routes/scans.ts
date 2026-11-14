import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { requireWorkspace, workspaceWhere } from "../tenancy/workspace.js";

const scanStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
]);

const optionalTrimmedString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value,
  z.string().trim().min(1).max(200).optional(),
);

const listScansQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  repositoryId: optionalTrimmedString,
  status: scanStatusSchema.optional(),
});

const scanIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const scanSelect = {
  id: true,
  workspaceId: true,
  repositoryId: true,
  branch: true,
  commitSha: true,
  trigger: true,
  status: true,
  phase: true,
  progress: true,
  filesScanned: true,
  findingsCount: true,
  durationMs: true,
  analyzers: true,
  errorCode: true,
  startedAt: true,
  finishedAt: true,
  createdAt: true,
  updatedAt: true,
  repository: {
    select: {
      id: true,
      fullName: true,
      defaultBranch: true,
    },
  },
} satisfies Prisma.ScanSelect;

// Track active SSE streams per user (max 3)
const activeStreamsPerUser = new Map<string, number>();

export async function scanRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/scans
  app.get(
    "/api/scans",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const parsedQuery = listScansQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid scan query parameters",
            requestId: request.id,
          },
        });
      }

      const { cursor, limit, repositoryId, status } = parsedQuery.data;
      const where: Prisma.ScanWhereInput = {
        ...workspaceWhere(request),
        ...(repositoryId ? { repositoryId } : {}),
        ...(status ? { status } : {}),
      };

      if (cursor) {
        const cursorRow = await prisma.scan.findFirst({
          where: { id: cursor, ...where },
          select: { id: true },
        });
        if (!cursorRow) {
          return {
            items: [],
            nextCursor: null,
          };
        }
      }

      const rows = await prisma.scan.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: scanSelect,
      });

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

      return {
        items,
        nextCursor,
      };
    },
  );

  // GET /api/scans/stream (SSE)
  app.get(
    "/api/scans/stream",
    { preHandler: requireWorkspace },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const userId = user?.id || "anonymous";

      const currentCount = activeStreamsPerUser.get(userId) || 0;
      if (currentCount >= 3) {
        return reply.status(429).send({
          error: {
            code: "TOO_MANY_STREAMS",
            message: "Maximum concurrent scan streams reached (limit 3).",
            requestId: request.id,
          },
        });
      }

      activeStreamsPerUser.set(userId, currentCount + 1);

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");

      reply.raw.write("retry: 5000\n\n");

      let lastCursor = new Date(Date.now() - 30_000);
      let idleSecondsWithoutActiveScans = 0;

      const wsWhere = workspaceWhere(request);

      const pollInterval = setInterval(async () => {
        try {
          const changedScans = await prisma.scan.findMany({
            where: {
              ...wsWhere,
              updatedAt: { gt: lastCursor },
            },
            select: {
              id: true,
              repositoryId: true,
              status: true,
              phase: true,
              progress: true,
              findingsCount: true,
              finishedAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "asc" },
          });

          if (changedScans.length > 0) {
            for (const scan of changedScans) {
              reply.raw.write(
                `event: scan\ndata: ${JSON.stringify({
                  id: scan.id,
                  repositoryId: scan.repositoryId,
                  status: scan.status,
                  phase: scan.phase,
                  progress: scan.progress,
                  findingsCount: scan.findingsCount,
                  finishedAt: scan.finishedAt,
                })}\n\n`,
              );
            }
            lastCursor = changedScans[changedScans.length - 1].updatedAt;
          }

          // Check if any scan in this workspace is queued or running
          const activeScansCount = await prisma.scan.count({
            where: {
              ...wsWhere,
              status: { in: ["QUEUED", "RUNNING"] },
            },
          });

          if (activeScansCount === 0) {
            idleSecondsWithoutActiveScans += 1.5;
            if (idleSecondsWithoutActiveScans >= 60) {
              cleanup();
              reply.raw.end();
            }
          } else {
            idleSecondsWithoutActiveScans = 0;
          }
        } catch (err) {
          cleanup();
          reply.raw.end();
        }
      }, 1500);

      const heartbeatInterval = setInterval(() => {
        try {
          reply.raw.write(": heartbeat\n\n");
        } catch {
          cleanup();
        }
      }, 15_000);

      const cleanup = () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        const count = activeStreamsPerUser.get(userId) || 1;
        if (count <= 1) {
          activeStreamsPerUser.delete(userId);
        } else {
          activeStreamsPerUser.set(userId, count - 1);
        }
      };

      request.raw.on("close", cleanup);
      request.raw.on("error", cleanup);
    },
  );

  // GET /api/scans/:id
  app.get(
    "/api/scans/:id",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const parsedParams = scanIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Scan not found",
            requestId: request.id,
          },
        });
      }

      const scan = await prisma.scan.findFirst({
        where: {
          id: parsedParams.data.id,
          ...workspaceWhere(request),
        },
        select: scanSelect,
      });

      if (!scan) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Scan not found",
            requestId: request.id,
          },
        });
      }

      // Group counts by severity for this scan
      const severityCounts = await prisma.finding.groupBy({
        by: ["severity"],
        where: {
          lastScanId: scan.id,
          ...workspaceWhere(request),
        },
        _count: {
          _all: true,
        },
      });

      const countsBySeverity = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0,
      };

      for (const group of severityCounts) {
        countsBySeverity[group.severity] = group._count._all;
      }

      return {
        scan: {
          ...scan,
          countsBySeverity,
        },
      };
    },
  );
}
