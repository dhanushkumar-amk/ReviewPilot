import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { requireWorkspace, workspaceWhere } from "../tenancy/workspace.js";

const findingSeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
const findingStatusSchema = z.enum(["OPEN", "ACCEPTED", "REJECTED", "FIXED"]);
const findingToolSchema = z.enum(["ESLINT", "SEMGREP", "GITLEAKS"]);

const arrayOrSingle = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (Array.isArray(val)) return val;
    return typeof val === "string" ? val.split(",").map((s) => s.trim()) : [val];
  }, z.array(schema).optional());

const listFindingsQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  repositoryId: z.string().trim().min(1).optional(),
  severity: arrayOrSingle(findingSeveritySchema),
  status: arrayOrSingle(findingStatusSchema),
  tool: arrayOrSingle(findingToolSchema),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(["severity", "lastSeenAt", "firstSeenAt"]).default("lastSeenAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const patchStatusBodySchema = z.object({
  status: z.enum(["OPEN", "ACCEPTED", "REJECTED"]),
});

export async function findingRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/findings
  app.get("/api/findings", { preHandler: requireWorkspace }, async (request, reply) => {
    const parseRes = listFindingsQuerySchema.safeParse(request.query);
    if (!parseRes.success) {
      return reply.status(400).send({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid query parameters",
          requestId: request.id,
        },
      });
    }

    const {
      cursor,
      limit,
      repositoryId,
      severity,
      status,
      tool,
      search,
      sortBy,
      sortDir,
    } = parseRes.data;

    const where: Prisma.FindingWhereInput = {
      ...workspaceWhere(request),
      ...(repositoryId ? { repositoryId } : {}),
      ...(severity && severity.length > 0 ? { severity: { in: severity } } : {}),
      ...(status && status.length > 0 ? { status: { in: status } } : {}),
      ...(tool && tool.length > 0 ? { tool: { in: tool } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { ruleId: { contains: search, mode: "insensitive" } },
              { filePath: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.FindingOrderByWithRelationInput[] = [];
    if (sortBy === "severity") {
      orderBy.push({ severity: sortDir });
    } else if (sortBy === "firstSeenAt") {
      orderBy.push({ firstSeenAt: sortDir });
    } else {
      orderBy.push({ lastSeenAt: sortDir });
    }
    orderBy.push({ id: sortDir });

    const rows = await prisma.finding.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        repository: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      items,
      nextCursor,
    };
  });

  // GET /api/findings/summary
  app.get("/api/findings/summary", { preHandler: requireWorkspace }, async (request) => {
    const wsWhere = workspaceWhere(request);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [severityGroups, scansToday, lastScan] = await Promise.all([
      prisma.finding.groupBy({
        by: ["severity"],
        where: { ...wsWhere, status: "OPEN" },
        _count: { _all: true },
      }),
      prisma.scan.count({
        where: {
          ...wsWhere,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.scan.findFirst({
        where: { ...wsWhere, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        select: {
          status: true,
          durationMs: true,
          finishedAt: true,
        },
      }),
    ]);

    let openCount = 0;
    let critCount = 0;
    let highCount = 0;
    let medCount = 0;
    let lowCount = 0;

    for (const group of severityGroups) {
      const count = group._count._all;
      openCount += count;
      if (group.severity === "CRITICAL") critCount = count;
      else if (group.severity === "HIGH") highCount = count;
      else if (group.severity === "MEDIUM") medCount = count;
      else if (group.severity === "LOW") lowCount = count;
    }

    return {
      open: openCount,
      critical: critCount,
      high: highCount,
      medium: medCount,
      low: lowCount,
      scansToday,
      lastScan,
    };
  });

  // GET /api/findings/:id
  app.get("/api/findings/:id", { preHandler: requireWorkspace }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const finding = await prisma.finding.findFirst({
      where: {
        id,
        ...workspaceWhere(request),
      },
      include: {
        repository: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!finding) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Finding not found",
          requestId: request.id,
        },
      });
    }

    return { finding };
  });

  // PATCH /api/findings/:id/status
  app.patch("/api/findings/:id/status", { preHandler: requireWorkspace }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseRes = patchStatusBodySchema.safeParse(request.body);
    if (!parseRes.success) {
      return reply.status(400).send({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid status value",
          requestId: request.id,
        },
      });
    }

    const { status } = parseRes.data;

    const existing = await prisma.finding.findFirst({
      where: {
        id,
        ...workspaceWhere(request),
      },
    });

    if (!existing) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Finding not found",
          requestId: request.id,
        },
      });
    }

    const updated = await prisma.finding.update({
      where: { id: existing.id },
      data: {
        status,
        resolvedAt: status === "OPEN" ? null : existing.resolvedAt,
      },
    });

    return { finding: updated };
  });
}

