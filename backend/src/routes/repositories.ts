import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { githubApp } from "../github/app.js";
import { inngest } from "../inngest/client.js";
import { InMemoryRateLimiter } from "../lib/rate-limit.js";
import {
  requireWorkspace,
  requireWorkspaceAdmin,
  workspaceWhere,
} from "../tenancy/workspace.js";
import {
  assertWithinLimit,
  isRepositoryAllowedByPlan,
  getEntitlements,
  invalidateEntitlementsCache,
  PlanLimitError,
} from "../billing/entitlements.js";

const repoStatusSchema = z.enum([
  "AVAILABLE",
  "CONNECTED",
  "DISCONNECTED",
  "REMOVED",
]);

const statusFilterSchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }
  const items = Array.isArray(value) ? value : [value];
  const expanded = items
    .flatMap((item) => (typeof item === "string" ? item.split(",") : [item]))
    .map((item) => (typeof item === "string" ? item.trim() : item))
    .filter((item) => item !== "");

  return expanded.length > 0 ? expanded : undefined;
}, z.array(repoStatusSchema).optional());

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).max(200).optional()
);

const listRepositoriesQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: statusFilterSchema,
  search: optionalTrimmedString,
  installationId: optionalTrimmedString,
});

const repositoryIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const manualScanRateLimiter = new InMemoryRateLimiter(6, 60_000);

const repositorySelect = {
  id: true,
  workspaceId: true,
  installationId: true,
  provider: true,
  externalId: true,
  fullName: true,
  defaultBranch: true,
  isPrivate: true,
  status: true,
  lastPushAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RepositorySelect;

const repositoryWithLastScanSelect = {
  ...repositorySelect,
  scans: {
    take: 1,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      commitSha: true,
      findingsCount: true,
      finishedAt: true,
    },
  },
} satisfies Prisma.RepositorySelect;

function serializeRepositoryWithLastScan<
  T extends { scans: Array<{ id: string; status: string; commitSha: string; findingsCount?: number; finishedAt: Date | null }> },
>(row: T) {
  const { scans, ...rest } = row;
  return {
    ...rest,
    lastScan: scans[0] ?? null,
  };
}

export async function repositoryRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/api/repositories",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const parsedQuery = listRepositoriesQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid repository query parameters",
            requestId: request.id,
          },
        });
      }

      const { cursor, limit, status, search, installationId } = parsedQuery.data;
      const scope = workspaceWhere(request);

      const where: Prisma.RepositoryWhereInput = {
        ...scope,
        ...(status && status.length > 0 ? { status: { in: status } } : {}),
        ...(search ? { fullName: { contains: search, mode: "insensitive" } } : {}),
        ...(installationId ? { installationId } : {}),
      };

      if (cursor) {
        const cursorRow = await prisma.repository.findFirst({
          where: { id: cursor, ...where },
          select: { id: true },
        });

        if (!cursorRow) {
          const total = await prisma.repository.count({ where });
          return {
            items: [],
            total,
            nextCursor: null,
          };
        }
      }

      const [total, rows, entitlements, connectedRepos] = await Promise.all([
        prisma.repository.count({ where }),
        prisma.repository.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: repositoryWithLastScanSelect,
        }),
        getEntitlements(request.workspace!.id),
        prisma.repository.findMany({
          where: { ...scope, status: "CONNECTED" },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        }),
      ]);

      const allowedRepoIds = new Set(
        connectedRepos.slice(0, entitlements.limits.maxRepositories).map((r) => r.id)
      );

      const hasMore = rows.length > limit;
      const sliced = hasMore ? rows.slice(0, limit) : rows;
      const items = sliced.map((row) => ({
        ...serializeRepositoryWithLastScan(row),
        pausedByPlan: row.status === "CONNECTED" && !allowedRepoIds.has(row.id),
      }));
      const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

      return {
        items,
        total,
        nextCursor,
      };
    }
  );

  app.get(
    "/api/repositories/:id",
    { preHandler: requireWorkspace },
    async (request, reply) => {
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
      const repositoryRow = await prisma.repository.findFirst({
        where: {
          id: parsedParams.data.id,
          ...scope,
        },
        select: repositoryWithLastScanSelect,
      });

      if (!repositoryRow) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Repository not found",
            requestId: request.id,
          },
        });
      }

      const check = await isRepositoryAllowedByPlan(request.workspace!.id, repositoryRow.id);
      return {
        repository: {
          ...serializeRepositoryWithLastScan(repositoryRow),
          pausedByPlan: repositoryRow.status === "CONNECTED" && !check.allowed,
        },
      };
    }
  );

  app.post(
    "/api/repositories/:id/connect",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
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
      const existing = await prisma.repository.findFirst({
        where: {
          id: parsedParams.data.id,
          ...scope,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Repository not found",
            requestId: request.id,
          },
        });
      }

      try {
        await assertWithinLimit(scope.workspaceId, "repositories");
      } catch (err) {
        if (err instanceof PlanLimitError) {
          return reply.status(403).send({
            error: {
              code: "PLAN_LIMIT_REACHED",
              message: err.message,
              details: {
                kind: err.kind,
                limit: err.limit,
                used: err.used,
                plan: err.plan,
              },
              requestId: request.id,
            },
          });
        }
        throw err;
      }

      if (existing.status !== "AVAILABLE" && existing.status !== "DISCONNECTED") {
        return reply.status(409).send({
          error: {
            code: "INVALID_REPOSITORY_STATUS",
            message: "Repository can only be connected when available or disconnected",
            requestId: request.id,
          },
        });
      }

      const repository = await prisma.repository.update({
        where: { id: existing.id },
        data: { status: "CONNECTED" },
        select: repositorySelect,
      });

      invalidateEntitlementsCache(scope.workspaceId);

      return { repository };
    }
  );

  app.post(
    "/api/repositories/:id/disconnect",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
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
      const existing = await prisma.repository.findFirst({
        where: {
          id: parsedParams.data.id,
          ...scope,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Repository not found",
            requestId: request.id,
          },
        });
      }

      if (existing.status !== "CONNECTED") {
        return reply.status(409).send({
          error: {
            code: "INVALID_REPOSITORY_STATUS",
            message: "Only connected repositories can be disconnected",
            requestId: request.id,
          },
        });
      }

      const repository = await prisma.repository.update({
        where: { id: existing.id },
        data: { status: "DISCONNECTED" },
        select: repositorySelect,
      });

      invalidateEntitlementsCache(scope.workspaceId);

      return { repository };
    }
  );

  app.post(
    "/api/repositories/:id/scan",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const workspaceId = request.workspace!.id;
      const rateLimit = manualScanRateLimiter.check(workspaceId);
      if (!rateLimit.allowed) {
        return reply
          .header("Retry-After", String(rateLimit.retryAfterSeconds))
          .status(429)
          .send({
            error: {
              code: "RATE_LIMITED",
              message: "Too many scan requests. Please wait a moment.",
              requestId: request.id,
            },
          });
      }

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

      const repo = await prisma.repository.findFirst({
        where: {
          id: parsedParams.data.id,
          ...workspaceWhere(request),
        },
        include: {
          installation: {
            select: {
              installationId: true,
              suspendedAt: true,
            },
          },
        },
      });

      if (!repo || repo.status !== "CONNECTED") {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Repository not found",
            requestId: request.id,
          },
        });
      }

      const repoAllowed = await isRepositoryAllowedByPlan(repo.workspaceId, repo.id);
      if (!repoAllowed.allowed) {
        return reply.status(403).send({
          error: {
            code: "PLAN_LIMIT_REACHED",
            message: `Repository is paused by plan (${repoAllowed.plan} plan allows up to ${repoAllowed.limit} connected repository). Upgrade to Premium to scan this repository.`,
            requestId: request.id,
          },
        });
      }

      try {
        await assertWithinLimit(repo.workspaceId, "scans");
      } catch (err) {
        if (err instanceof PlanLimitError) {
          return reply.status(403).send({
            error: {
              code: "PLAN_LIMIT_REACHED",
              message: err.message,
              details: {
                kind: err.kind,
                limit: err.limit,
                used: err.used,
                plan: err.plan,
              },
              requestId: request.id,
            },
          });
        }
        throw err;
      }

      if (repo.installation.suspendedAt !== null) {
        return reply.status(409).send({
          error: {
            code: "INSTALLATION_SUSPENDED",
            message: "GitHub installation is suspended",
            requestId: request.id,
          },
        });
      }

      const slashIndex = repo.fullName.indexOf("/");
      if (slashIndex <= 0 || slashIndex === repo.fullName.length - 1) {
        return reply.status(400).send({
          error: {
            code: "INVALID_REPOSITORY",
            message: "Repository name is invalid",
            requestId: request.id,
          },
        });
      }

      const owner = repo.fullName.slice(0, slashIndex);
      const repoName = repo.fullName.slice(slashIndex + 1);

      const octokit = await githubApp.getInstallationOctokit(
        Number(repo.installation.installationId),
      );
      const branchRes = await octokit.rest.repos.getBranch({
        owner,
        repo: repoName,
        branch: repo.defaultBranch,
      });
      const commitSha = branchRes.data.commit.sha;

      await inngest.send({
        name: "github/scan.requested",
        data: {
          deliveryId: `manual-${crypto.randomUUID()}`,
          workspaceId: repo.workspaceId,
          repositoryId: repo.id,
          installationId: repo.installation.installationId.toString(),
          branch: repo.defaultBranch,
          commitSha,
          receivedAt: new Date().toISOString(),
          trigger: "MANUAL",
        },
      });

      request.log.info(
        {
          requestId: request.id,
          repositoryId: repo.id,
          fullName: repo.fullName,
          commitSha: commitSha.slice(0, 7),
        },
        "Enqueued manual scan",
      );

      return reply.status(202).send({ ok: true });
    },
  );
}
