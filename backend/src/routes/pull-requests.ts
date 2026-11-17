/**
 * pull-requests.ts
 * Fastify routes for Step 11: PR creation, live status, merging, closing, and usage metrics.
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import type { Prisma, PullRequestStatus } from "../generated/prisma/client.js";
import { SecurityGuardError } from "../github/guards.js";
import { InMemoryRateLimiter } from "../lib/rate-limit.js";
import {
  closePullRequest,
  createFixPullRequest,
  getPullRequestStatus,
  mergePullRequest,
} from "../pull-requests/index.js";
import {
  requireWorkspace,
  requireWorkspaceAdmin,
  workspaceWhere,
} from "../tenancy/workspace.js";

const createPrRateLimiter = new InMemoryRateLimiter(3, 60_000);
const mergePrRateLimiter = new InMemoryRateLimiter(5, 60_000);

const createPrBodySchema = z.object({
  acknowledgeRisk: z.boolean().optional(),
});

const mergePrBodySchema = z.object({
  expectedHeadSha: z.string().min(1),
  method: z.enum(["merge", "squash", "rebase"]).default("squash"),
  confirmFailingChecks: z.boolean().default(false),
});

const listPrsQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  repositoryId: z.string().trim().min(1).optional(),
  status: z.enum(["CREATING", "OPEN", "MERGED", "CLOSED", "FAILED"]).optional(),
});

export async function pullRequestRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/fix-proposals/:id/pull-request
  app.post(
    "/api/fix-proposals/:id/pull-request",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.id || "unknown";
      const userRole = (request as any).user?.role || request.workspace?.role || "member";

      // Rate limit check (3/min per user)
      const rateLimitRes = createPrRateLimiter.check(`create-pr:${userId}`);
      if (!rateLimitRes.allowed) {
        return reply.status(429).send({
          error: {
            code: "RATE_LIMITED",
            message: `Too many pull request creation attempts. Please wait ${rateLimitRes.retryAfterSeconds} seconds.`,
            requestId: request.id,
          },
        });
      }

      const parseRes = createPrBodySchema.safeParse(request.body || {});
      if (!parseRes.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid request payload",
            requestId: request.id,
          },
        });
      }

      try {
        const result = await createFixPullRequest({
          fixProposalId: id,
          user: { id: userId, role: userRole },
          workspace: request.workspace!,
          acknowledgeRisk: parseRes.data.acknowledgeRisk,
        });

        return result;
      } catch (err: any) {
        const code = err.code || "PR_CREATION_FAILED";
        let status = 500;

        if (code === "NOT_FOUND") status = 404;
        else if (code === "FORBIDDEN") status = 403;
        else if (
          code === "PROPOSAL_NOT_DRAFT" ||
          code === "PR_BLOCKED_VALIDATION" ||
          code === "PR_RISK_ACK_REQUIRED" ||
          code === "PR_BLOCKED_SECRET" ||
          code === "STALE_FIX" ||
          code === "INVALID_FILE_PATH" ||
          code === "SENSITIVE_FILE_FORBIDDEN" ||
          code === "INVALID_BRANCH" ||
          code === "INVALID_BRANCH_NAME" ||
          code === "FORBIDDEN_BRANCH" ||
          code === "FILE_TOO_LARGE" ||
          code === "REPOSITORY_NOT_CONNECTED"
        ) {
          status = 400;
        } else if (code === "PR_LIMIT_REACHED") {
          status = 429;
        } else if (code === "GITHUB_PERMISSION_MISSING") {
          status = 403;
        }

        request.log.error(
          { requestId: request.id, errCode: code, message: err.message },
          "Pull request creation failed"
        );

        return reply.status(status).send({
          error: {
            code,
            message: err.message || "Failed to create pull request",
            requestId: request.id,
          },
        });
      }
    }
  );

  // GET /api/pull-requests
  app.get(
    "/api/pull-requests",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const parseRes = listPrsQuerySchema.safeParse(request.query);
      if (!parseRes.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid query parameters",
            requestId: request.id,
          },
        });
      }

      const { cursor, limit, repositoryId, status } = parseRes.data;
      const wsScope = workspaceWhere(request);

      const where: Prisma.PullRequestWhereInput = {
        ...wsScope,
        ...(repositoryId ? { repositoryId } : {}),
        ...(status ? { status: status as PullRequestStatus } : {}),
      };

      const pullRequests = await prisma.pullRequest.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        include: {
          repository: {
            select: {
              id: true,
              fullName: true,
              defaultBranch: true,
            },
          },
          finding: {
            select: {
              id: true,
              title: true,
              severity: true,
              tool: true,
              ruleId: true,
              filePath: true,
            },
          },
        },
      });

      let nextCursor: string | null = null;
      if (pullRequests.length > limit) {
        const nextItem = pullRequests.pop();
        nextCursor = nextItem?.id ?? null;
      }

      return {
        pullRequests,
        nextCursor,
      };
    }
  );

  // GET /api/pull-requests/:id
  app.get(
    "/api/pull-requests/:id",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const result = await getPullRequestStatus(id, request.workspace!.id);
        return result;
      } catch (err: any) {
        const code = err.code || "FAILED";
        const status = code === "NOT_FOUND" ? 404 : 500;
        return reply.status(status).send({
          error: {
            code,
            message: err.message || "Failed to get pull request status",
            requestId: request.id,
          },
        });
      }
    }
  );

  // POST /api/pull-requests/:id/merge
  app.post(
    "/api/pull-requests/:id/merge",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.id || "unknown";
      const userRole = (request as any).user?.role || request.workspace?.role || "admin";

      // Rate limit check (5/min per user)
      const rateLimitRes = mergePrRateLimiter.check(`merge-pr:${userId}`);
      if (!rateLimitRes.allowed) {
        return reply.status(429).send({
          error: {
            code: "RATE_LIMITED",
            message: `Too many merge attempts. Please wait ${rateLimitRes.retryAfterSeconds} seconds.`,
            requestId: request.id,
          },
        });
      }

      const parseRes = mergePrBodySchema.safeParse(request.body);
      if (!parseRes.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "expectedHeadSha is required",
            requestId: request.id,
          },
        });
      }

      const { expectedHeadSha, method, confirmFailingChecks } = parseRes.data;

      try {
        const result = await mergePullRequest({
          pullRequestId: id,
          user: { id: userId, role: userRole },
          workspace: request.workspace!,
          expectedHeadSha,
          method,
          confirmFailingChecks,
        });

        return result;
      } catch (err: any) {
        const code = err.code || "MERGE_FAILED";
        let status = 500;

        if (code === "NOT_FOUND") status = 404;
        else if (code === "FORBIDDEN") status = 403;
        else if (code === "HEAD_CHANGED") status = 409;
        else if (
          code === "MERGE_CONFLICT" ||
          code === "MERGE_BLOCKED" ||
          code === "MERGE_UNSTABLE" ||
          code === "BRANCH_BEHIND" ||
          code === "PR_NOT_OPEN" ||
          code === "MERGE_METHOD_NOT_ALLOWED"
        ) {
          status = 400;
        }

        request.log.warn(
          { requestId: request.id, prId: id, code, message: err.message },
          "Merge rejected"
        );

        return reply.status(status).send({
          error: {
            code,
            message: err.message || "Failed to merge pull request",
            requestId: request.id,
          },
        });
      }
    }
  );

  // POST /api/pull-requests/:id/close
  app.post(
    "/api/pull-requests/:id/close",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request as any).user?.id || "unknown";
      const userRole = (request as any).user?.role || request.workspace?.role || "admin";

      try {
        const result = await closePullRequest({
          pullRequestId: id,
          user: { id: userId, role: userRole },
          workspace: request.workspace!,
        });

        return result;
      } catch (err: any) {
        const code = err.code || "CLOSE_FAILED";
        const status = code === "NOT_FOUND" ? 404 : code === "FORBIDDEN" ? 403 : 500;
        return reply.status(status).send({
          error: {
            code,
            message: err.message || "Failed to close pull request",
            requestId: request.id,
          },
        });
      }
    }
  );

  // GET /api/workspace/pull-request-usage
  app.get(
    "/api/workspace/pull-request-usage",
    { preHandler: requireWorkspace },
    async (request) => {
      const workspaceId = request.workspace!.id;
      const now = new Date();
      const startOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );

      const countToday = await prisma.pullRequest.count({
        where: {
          workspaceId,
          createdAt: { gte: startOfDay },
          status: { not: "FAILED" },
        },
      });

      const limit = 10;
      const remaining = Math.max(0, limit - countToday);

      return {
        countToday,
        limit,
        remaining,
      };
    }
  );
}
