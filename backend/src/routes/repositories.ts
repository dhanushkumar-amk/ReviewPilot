import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireWorkspace, workspaceWhere } from "../tenancy/workspace.js";

const listRepositoriesQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const repositoryIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export async function repositoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/repositories", { preHandler: requireWorkspace }, async (request, reply) => {
    const parsedQuery = listRepositoriesQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.status(400).send({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid pagination query parameters",
          requestId: request.id,
        },
      });
    }

    const { cursor, limit } = parsedQuery.data;
    const scope = workspaceWhere(request);

    if (cursor) {
      const cursorRow = await prisma.repository.findFirst({
        where: { id: cursor, ...scope },
        select: { id: true },
      });

      if (!cursorRow) {
        const total = await prisma.repository.count({ where: scope });
        return {
          items: [],
          total,
          nextCursor: null,
        };
      }
    }

    const [total, rows] = await Promise.all([
      prisma.repository.count({ where: scope }),
      prisma.repository.findMany({
        where: scope,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          workspaceId: true,
          provider: true,
          externalId: true,
          fullName: true,
          defaultBranch: true,
          isPrivate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return {
      items,
      total,
      nextCursor,
    };
  });

  app.get("/api/repositories/:id", { preHandler: requireWorkspace }, async (request, reply) => {
    const parsedParams = repositoryIdParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Repository not found",
          requestId: request.id,
        },
      });
    }

    const scope = workspaceWhere(request);
    const repository = await prisma.repository.findFirst({
      where: {
        id: parsedParams.data.id,
        ...scope,
      },
      select: {
        id: true,
        workspaceId: true,
        provider: true,
        externalId: true,
        fullName: true,
        defaultBranch: true,
        isPrivate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!repository) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Repository not found",
          requestId: request.id,
        },
      });
    }

    return { repository };
  });
}
