import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { env, isAwsLambdaSandboxConfigured } from "../env.js";
import { inngest } from "../inngest/client.js";
import { InMemoryRateLimiter } from "../lib/rate-limit.js";
import { getSandboxWorkspaceUsageToday } from "../sandbox/quota.js";
import {
  requireWorkspace,
  requireWorkspaceAdmin,
  workspaceWhere,
} from "../tenancy/workspace.js";

const validateRateLimiter = new InMemoryRateLimiter(3, 60_000);

const patchSandboxSettingsSchema = z.object({
  sandboxEnabled: z.boolean(),
});

const validateBodySchema = z.object({
  runTests: z.boolean().default(false),
});

export async function sandboxRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/workspace/sandbox-settings
  app.get(
    "/api/workspace/sandbox-settings",
    { preHandler: requireWorkspace },
    async (request) => {
      const workspaceId = request.workspace!.id;
      const org = await prisma.organization.findUnique({
        where: { id: workspaceId },
        select: { sandboxEnabled: true },
      });

      return {
        sandboxEnabled: org?.sandboxEnabled ?? false,
        sandboxAvailable: isAwsLambdaSandboxConfigured,
      };
    },
  );

  // PATCH /api/workspace/sandbox-settings (owner/admin only)
  app.patch(
    "/api/workspace/sandbox-settings",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
      const parseRes = patchSandboxSettingsSchema.safeParse(request.body);
      if (!parseRes.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid settings payload",
            requestId: request.id,
          },
        });
      }

      const { sandboxEnabled } = parseRes.data;
      const workspaceId = request.workspace!.id;
      const userId = (request as any).user?.id || "unknown";

      await prisma.organization.update({
        where: { id: workspaceId },
        data: {
          sandboxEnabled,
          sandboxEnabledBy: userId,
          sandboxEnabledAt: new Date(),
        },
      });

      request.log.info(
        { userId, workspaceId, sandboxEnabled, requestId: request.id },
        "Updated workspace sandbox settings",
      );

      return { sandboxEnabled };
    },
  );

  // GET /api/workspace/sandbox-usage
  app.get(
    "/api/workspace/sandbox-usage",
    { preHandler: requireWorkspace },
    async (request) => {
      const workspaceId = request.workspace!.id;
      return await getSandboxWorkspaceUsageToday(workspaceId);
    },
  );

  // POST /api/fix-proposals/:id/validate (rate limit 3/min per user)
  app.post(
    "/api/fix-proposals/:id/validate",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const userId = (request as any).user?.id || "anonymous";
      const workspaceId = request.workspace!.id;
      const { id } = request.params as { id: string };

      // Rate limit
      const rate = validateRateLimiter.check(userId);
      if (!rate.allowed) {
        return reply
          .header("Retry-After", String(rate.retryAfterSeconds))
          .status(429)
          .send({
            error: { code: "SANDBOX_BUSY", message: "Too many validation requests. Please wait a moment.", requestId: request.id },
          });
      }

      // Parse body
      const bodyParse = validateBodySchema.safeParse(request.body);
      const runTests = bodyParse.success ? bodyParse.data.runTests : false;

      // If runTests requested: check consent and provider
      if (runTests) {
        const org = await prisma.organization.findUnique({
          where: { id: workspaceId },
          select: { sandboxEnabled: true },
        });
        if (!org?.sandboxEnabled) {
          return reply.status(400).send({
            error: { code: "SANDBOX_DISABLED", message: "Test runs are disabled for this workspace", requestId: request.id },
          });
        }
        if (!isAwsLambdaSandboxConfigured) {
          return reply.status(400).send({
            error: { code: "SANDBOX_NOT_CONFIGURED", message: "Test run provider is not configured on the server", requestId: request.id },
          });
        }
      }

      // Check proposal exists, belongs to workspace, and is active (not discarded)
      const proposal = await prisma.fixProposal.findFirst({
        where: { id, ...workspaceWhere(request) },
      });
      if (!proposal || proposal.status === "DISCARDED") {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Fix proposal not found or has been discarded", requestId: request.id },
        });
      }

      // No QUEUED or RUNNING validation for the same proposal
      const existingRunning = await prisma.fixValidation.findFirst({
        where: { fixProposalId: id, workspaceId, status: { in: ["QUEUED", "RUNNING"] } },
      });
      if (existingRunning) {
        return reply.status(409).send({
          error: { code: "SANDBOX_ALREADY_RUNNING", message: "A validation is already queued or running for this proposal", requestId: request.id },
        });
      }

      // Create FixValidation record
      const validation = await prisma.fixValidation.create({
        data: {
          workspaceId,
          fixProposalId: id,
          status: "QUEUED",
          testsRequested: runTests,
          createdByUserId: userId,
        },
      });

      // Send Inngest event
      await inngest.send({
        name: "fix/validation.requested",
        data: { validationId: validation.id, workspaceId },
      });

      return reply.status(202).send({ validationId: validation.id });
    },
  );

  // GET /api/fix-proposals/:id/validations
  app.get(
    "/api/fix-proposals/:id/validations",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const workspaceId = request.workspace!.id;

      const proposal = await prisma.fixProposal.findFirst({
        where: { id, ...workspaceWhere(request) },
      });
      if (!proposal) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Fix proposal not found", requestId: request.id },
        });
      }

      const validations = await prisma.fixValidation.findMany({
        where: { fixProposalId: id, workspaceId },
        orderBy: { createdAt: "desc" },
      });
      return { validations };
    },
  );

  // GET /api/fix-validations/:id
  app.get(
    "/api/fix-validations/:id",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const workspaceId = request.workspace!.id;

      const validation = await prisma.fixValidation.findFirst({
        where: { id, workspaceId },
      });
      if (!validation) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Validation not found", requestId: request.id },
        });
      }
      return { validation };
    },
  );
}
