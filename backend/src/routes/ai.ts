import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { draftFix, explainFinding } from "../ai/insights.js";
import { getEnabledProviders } from "../ai/providers.js";
import { getWorkspaceUsageToday } from "../ai/quota.js";
import { prisma } from "../db.js";
import { InMemoryRateLimiter } from "../lib/rate-limit.js";
import {
  requireWorkspace,
  requireWorkspaceAdmin,
  workspaceWhere,
} from "../tenancy/workspace.js";

const explainRateLimiter = new InMemoryRateLimiter(10, 60_000);
const fixRateLimiter = new InMemoryRateLimiter(5, 60_000);

const patchAiSettingsSchema = z.object({
  aiEnabled: z.boolean(),
});

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/workspace/ai-settings
  app.get(
    "/api/workspace/ai-settings",
    { preHandler: requireWorkspace },
    async (request) => {
      const workspace = request.workspace!;
      const org = await prisma.organization.findUnique({
        where: { id: workspace.id },
        select: { aiEnabled: true },
      });

      const enabledProviders = getEnabledProviders();

      return {
        aiEnabled: org?.aiEnabled ?? false,
        providersAvailable: enabledProviders.length > 0,
      };
    },
  );

  // PATCH /api/workspace/ai-settings (owner/admin only)
  app.patch(
    "/api/workspace/ai-settings",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
      const parseRes = patchAiSettingsSchema.safeParse(request.body);
      if (!parseRes.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid settings payload",
            requestId: request.id,
          },
        });
      }

      const { aiEnabled } = parseRes.data;
      const workspaceId = request.workspace!.id;
      const userId = (request as any).user?.id || "unknown";

      await prisma.organization.update({
        where: { id: workspaceId },
        data: {
          aiEnabled,
          aiEnabledBy: userId,
          aiEnabledAt: new Date(),
        },
      });

      request.log.info(
        {
          userId,
          workspaceId,
          aiEnabled,
          requestId: request.id,
        },
        "Updated workspace AI settings",
      );

      return { aiEnabled };
    },
  );

  // GET /api/workspace/ai-usage
  app.get(
    "/api/workspace/ai-usage",
    { preHandler: requireWorkspace },
    async (request) => {
      const workspaceId = request.workspace!.id;
      return await getWorkspaceUsageToday(workspaceId);
    },
  );

  // POST /api/findings/:id/explain
  app.post(
    "/api/findings/:id/explain",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const userId = (request as any).user?.id || "anonymous";
      const rate = explainRateLimiter.check(userId);
      if (!rate.allowed) {
        return reply
          .header("Retry-After", String(rate.retryAfterSeconds))
          .status(429)
          .send({
            error: {
              code: "AI_BUSY",
              message: "Too many explain requests. Please wait a moment.",
              requestId: request.id,
            },
          });
      }

      const workspaceId = request.workspace!.id;
      const org = await prisma.organization.findUnique({
        where: { id: workspaceId },
        select: { aiEnabled: true },
      });

      if (!org?.aiEnabled) {
        return reply.status(403).send({
          error: {
            code: "AI_DISABLED",
            message: "AI assist is disabled for this workspace",
            requestId: request.id,
          },
        });
      }

      const { id } = request.params as { id: string };

      try {
        const result = await explainFinding({
          findingId: id,
          workspaceId,
        });
        return result;
      } catch (err: any) {
        const code = err.code || "AI_UNAVAILABLE";
        const status =
          code === "FILE_NOT_FOUND"
            ? 404
            : code === "AI_LIMIT_REACHED" || code === "AI_BUSY"
              ? 429
              : 500;

        return reply.status(status).send({
          error: {
            code,
            message: err.message || "Failed to explain finding",
            requestId: request.id,
          },
        });
      }
    },
  );

  // POST /api/findings/:id/fix-draft
  app.post(
    "/api/findings/:id/fix-draft",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const userId = (request as any).user?.id || "anonymous";
      const rate = fixRateLimiter.check(userId);
      if (!rate.allowed) {
        return reply
          .header("Retry-After", String(rate.retryAfterSeconds))
          .status(429)
          .send({
            error: {
              code: "AI_BUSY",
              message: "Too many fix draft requests. Please wait a moment.",
              requestId: request.id,
            },
          });
      }

      const workspaceId = request.workspace!.id;
      const org = await prisma.organization.findUnique({
        where: { id: workspaceId },
        select: { aiEnabled: true },
      });

      if (!org?.aiEnabled) {
        return reply.status(403).send({
          error: {
            code: "AI_DISABLED",
            message: "AI assist is disabled for this workspace",
            requestId: request.id,
          },
        });
      }

      const { id } = request.params as { id: string };

      try {
        const result = await draftFix({
          findingId: id,
          workspaceId,
          userId,
        });
        return result;
      } catch (err: any) {
        const code = err.code || "AI_UNAVAILABLE";
        const status =
          code === "FILE_NOT_FOUND"
            ? 404
            : code === "SECRET_FINDING"
              ? 400
              : code === "AI_LIMIT_REACHED" || code === "AI_BUSY"
                ? 429
                : 500;

        return reply.status(status).send({
          error: {
            code,
            message: err.message || "Failed to draft fix",
            requestId: request.id,
          },
        });
      }
    },
  );

  // GET /api/findings/:id/fix-proposals
  app.get(
    "/api/findings/:id/fix-proposals",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const wsScope = workspaceWhere(request);

      const proposals = await prisma.fixProposal.findMany({
        where: {
          findingId: id,
          ...wsScope,
        },
        orderBy: { createdAt: "desc" },
      });

      return { proposals };
    },
  );

  // GET /api/fix-proposals/:id
  app.get(
    "/api/fix-proposals/:id",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const proposal = await prisma.fixProposal.findFirst({
        where: {
          id,
          ...workspaceWhere(request),
        },
      });

      if (!proposal) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Fix proposal not found",
            requestId: request.id,
          },
        });
      }

      return { proposal };
    },
  );

  // POST /api/fix-proposals/:id/discard
  app.post(
    "/api/fix-proposals/:id/discard",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.fixProposal.findFirst({
        where: {
          id,
          ...workspaceWhere(request),
        },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Fix proposal not found",
            requestId: request.id,
          },
        });
      }

      const updated = await prisma.fixProposal.update({
        where: { id: existing.id },
        data: { status: "DISCARDED" },
      });

      return { proposal: updated };
    },
  );
}

