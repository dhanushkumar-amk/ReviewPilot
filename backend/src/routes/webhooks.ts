import crypto from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { Prisma } from "../generated/prisma/client.js";
import { inngest } from "../inngest/client.js";
import { InMemoryRateLimiter } from "../lib/rate-limit.js";

const WEBHOOK_BODY_LIMIT = 25 * 1024 * 1024;
const webhookRateLimiter = new InMemoryRateLimiter(300, 60_000);

const headerStringSchema = z.string().trim().min(1).max(128);
const numericIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/),
]);

const pushPayloadSchema = z.object({
  ref: z.string().min(1),
  after: z.string().min(1),
  deleted: z.boolean().optional(),
  repository: z.object({
    id: numericIdSchema,
    full_name: z.string().min(1),
  }),
  installation: z
    .object({
      id: numericIdSchema,
    })
    .optional(),
  sender: z
    .object({
      login: z.string(),
    })
    .optional(),
});

const installationPayloadSchema = z.object({
  action: z.string().min(1),
  installation: z.object({
    id: numericIdSchema,
  }),
});

function verifyGithubSignature(rawBody: Buffer, signatureHeader: string): boolean {
  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", env.GITHUB_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

  const actualBuf = Buffer.from(signatureHeader, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function getSingleHeader(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  return "";
}

function extractBigIntId(value: unknown): bigint | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value);
  }
  return null;
}

async function markDelivery(
  deliveryId: string,
  status: "PROCESSED" | "IGNORED" | "FAILED",
  ignoreReason?: string,
) {
  await prisma.webhookDelivery.update({
    where: { deliveryId },
    data: {
      status,
      ignoreReason: ignoreReason ?? null,
      processedAt: new Date(),
    },
  });
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Encapsulated raw-body parser: only affects routes inside this plugin.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer", bodyLimit: WEBHOOK_BODY_LIMIT },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post(
    "/api/github/webhooks",
    {
      config: { rawBody: true },
      bodyLimit: WEBHOOK_BODY_LIMIT,
    },
    async (request, reply) => {
      const rateLimit = webhookRateLimiter.check(request.ip);
      if (!rateLimit.allowed) {
        return reply
          .header("Retry-After", String(rateLimit.retryAfterSeconds))
          .status(429)
          .send({ error: "Too many requests" });
      }

      const rawBody = Buffer.isBuffer(request.body) ? request.body : null;
      const signature = getSingleHeader(
        request.headers["x-hub-signature-256"],
      );

      if (!rawBody || !signature || !verifyGithubSignature(rawBody, signature)) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const eventParse = headerStringSchema.safeParse(
        getSingleHeader(request.headers["x-github-event"]),
      );
      const deliveryParse = headerStringSchema.safeParse(
        getSingleHeader(request.headers["x-github-delivery"]),
      );

      if (!eventParse.success || !deliveryParse.success) {
        return reply.status(400).send({ error: "Missing required webhook headers" });
      }

      const event = eventParse.data;
      const deliveryId = deliveryParse.data;

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return reply.status(400).send({ error: "Malformed JSON payload" });
      }

      if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        return reply.status(400).send({ error: "Malformed JSON payload" });
      }

      const record = parsedBody as Record<string, unknown>;
      const action = typeof record.action === "string" ? record.action : null;
      const installationObj =
        record.installation && typeof record.installation === "object"
          ? (record.installation as Record<string, unknown>)
          : null;
      const installationId = installationObj
        ? extractBigIntId(installationObj.id)
        : null;

      try {
        await prisma.webhookDelivery.create({
          data: {
            deliveryId,
            event,
            action,
            installationId,
            status: "RECEIVED",
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          request.log.info(
            { requestId: request.id, deliveryId, event, action },
            "Duplicate GitHub webhook delivery ignored",
          );
          return reply.status(200).send({ status: "duplicate" });
        }
        throw err;
      }

      if (event === "ping") {
        await markDelivery(deliveryId, "PROCESSED");
        request.log.info(
          { requestId: request.id, deliveryId, event },
          "Processed GitHub ping webhook",
        );
        return reply.status(200).send({ ok: true });
      }

      if (event === "push") {
        const pushParsed = pushPayloadSchema.safeParse(parsedBody);
        if (!pushParsed.success) {
          await markDelivery(deliveryId, "IGNORED", "invalid_payload");
          return reply.status(400).send({ error: "Invalid push payload" });
        }

        const push = pushParsed.data;
        const shortSha = push.after.slice(0, 7);

        const ignore = async (reason: string) => {
          await markDelivery(deliveryId, "IGNORED", reason);
          request.log.info(
            {
              requestId: request.id,
              deliveryId,
              event,
              fullName: push.repository.full_name,
              commitSha: shortSha,
              reason,
            },
            "Ignored GitHub push webhook",
          );
          return reply.status(202).send({ status: "ignored", reason });
        };

        if (push.deleted === true) {
          return ignore("branch_deleted");
        }
        if (push.ref.startsWith("refs/tags/")) {
          return ignore("tag_push");
        }
        if (/^0+$/.test(push.after)) {
          return ignore("zero_commit_sha");
        }
        if (!push.ref.startsWith("refs/heads/")) {
          return ignore("non_branch_ref");
        }

        const branch = push.ref.slice("refs/heads/".length);
        if (branch.startsWith("reviewpilot/")) {
          return ignore("reviewpilot_branch");
        }

        const senderLogin = push.sender?.login ?? "";
        if (
          senderLogin.endsWith("[bot]") &&
          senderLogin === `${env.GITHUB_APP_SLUG}[bot]`
        ) {
          return ignore("self_bot_push");
        }

        const pushInstallationId = push.installation
          ? BigInt(push.installation.id)
          : null;
        if (pushInstallationId === null) {
          return ignore("missing_installation");
        }

        const repo = await prisma.repository.findFirst({
          where: {
            provider: "GITHUB",
            externalId: String(push.repository.id),
            installation: {
              installationId: pushInstallationId,
            },
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

        if (!repo) {
          return ignore("repository_not_found");
        }
        if (repo.status !== "CONNECTED") {
          return ignore("repository_not_connected");
        }
        if (repo.installation.suspendedAt !== null) {
          return ignore("installation_suspended");
        }
        if (branch !== repo.defaultBranch) {
          return ignore("non_default_branch");
        }

        const now = new Date();
        await prisma.repository.update({
          where: { id: repo.id },
          data: { lastPushAt: now },
        });

        try {
          await inngest.send({
            name: "github/push.received",
            data: {
              deliveryId,
              workspaceId: repo.workspaceId,
              repositoryId: repo.id,
              installationId: repo.installation.installationId.toString(),
              branch,
              commitSha: push.after,
              senderLogin,
              receivedAt: now.toISOString(),
            },
          });
        } catch (err) {
          await markDelivery(deliveryId, "FAILED");
          request.log.error(
            {
              requestId: request.id,
              deliveryId,
              event,
              fullName: repo.fullName,
              commitSha: shortSha,
              err,
            },
            "Failed to enqueue push scan event",
          );
          return reply.status(500).send({ error: "Failed to enqueue scan" });
        }

        await markDelivery(deliveryId, "PROCESSED");
        request.log.info(
          {
            requestId: request.id,
            deliveryId,
            event,
            fullName: repo.fullName,
            commitSha: shortSha,
          },
          "Enqueued scan from GitHub push webhook",
        );

        return reply.status(202).send({ status: "queued" });
      }

      if (event === "installation") {
        const instParsed = installationPayloadSchema.safeParse(parsedBody);
        if (!instParsed.success) {
          await markDelivery(deliveryId, "IGNORED", "invalid_payload");
          return reply.status(400).send({ error: "Invalid installation payload" });
        }

        const { action: instAction, installation: instInfo } = instParsed.data;
        const instBigInt = BigInt(instInfo.id);

        const existing = await prisma.githubInstallation.findUnique({
          where: { installationId: instBigInt },
          select: { id: true, installationId: true },
        });

        if (!existing) {
          await markDelivery(deliveryId, "IGNORED", "installation_not_found");
          return reply
            .status(202)
            .send({ status: "ignored", reason: "installation_not_found" });
        }

        if (instAction === "deleted") {
          await prisma.githubInstallation.delete({
            where: { id: existing.id },
          });
          await markDelivery(deliveryId, "PROCESSED");
          request.log.info(
            { requestId: request.id, deliveryId, event, action: instAction },
            "Deleted GitHub installation from webhook",
          );
          return reply.status(200).send({ ok: true });
        }

        if (instAction === "suspend") {
          await prisma.githubInstallation.update({
            where: { id: existing.id },
            data: { suspendedAt: new Date() },
          });
          await markDelivery(deliveryId, "PROCESSED");
          request.log.info(
            { requestId: request.id, deliveryId, event, action: instAction },
            "Suspended GitHub installation from webhook",
          );
          return reply.status(200).send({ ok: true });
        }

        if (instAction === "unsuspend") {
          await prisma.githubInstallation.update({
            where: { id: existing.id },
            data: { suspendedAt: null },
          });

          try {
            await inngest.send({
              name: "github/installation.changed",
              data: {
                deliveryId,
                installationId: existing.installationId.toString(),
                action: instAction,
              },
            });
          } catch (err) {
            await markDelivery(deliveryId, "FAILED");
            request.log.error(
              { requestId: request.id, deliveryId, event, action: instAction, err },
              "Failed to enqueue installation sync event",
            );
            return reply.status(500).send({ error: "Failed to enqueue sync" });
          }

          await markDelivery(deliveryId, "PROCESSED");
          request.log.info(
            { requestId: request.id, deliveryId, event, action: instAction },
            "Unsuspended GitHub installation and enqueued sync",
          );
          return reply.status(202).send({ status: "queued" });
        }

        await markDelivery(deliveryId, "IGNORED", "unsupported_action");
        return reply
          .status(202)
          .send({ status: "ignored", reason: "unsupported_action" });
      }

      if (event === "installation_repositories") {
        const instParsed = installationPayloadSchema.safeParse(parsedBody);
        if (!instParsed.success) {
          await markDelivery(deliveryId, "IGNORED", "invalid_payload");
          return reply
            .status(400)
            .send({ error: "Invalid installation_repositories payload" });
        }

        const { action: repoAction, installation: instInfo } = instParsed.data;
        if (repoAction !== "added" && repoAction !== "removed") {
          await markDelivery(deliveryId, "IGNORED", "unsupported_action");
          return reply
            .status(202)
            .send({ status: "ignored", reason: "unsupported_action" });
        }

        const instBigInt = BigInt(instInfo.id);
        const existing = await prisma.githubInstallation.findUnique({
          where: { installationId: instBigInt },
          select: { id: true, installationId: true },
        });

        if (!existing) {
          await markDelivery(deliveryId, "IGNORED", "installation_not_found");
          return reply
            .status(202)
            .send({ status: "ignored", reason: "installation_not_found" });
        }

        try {
          await inngest.send({
            name: "github/installation.changed",
            data: {
              deliveryId,
              installationId: existing.installationId.toString(),
              action: repoAction,
            },
          });
        } catch (err) {
          await markDelivery(deliveryId, "FAILED");
          request.log.error(
            { requestId: request.id, deliveryId, event, action: repoAction, err },
            "Failed to enqueue installation_repositories sync",
          );
          return reply.status(500).send({ error: "Failed to enqueue sync" });
        }

        await markDelivery(deliveryId, "PROCESSED");
        request.log.info(
          { requestId: request.id, deliveryId, event, action: repoAction },
          "Enqueued installation sync from installation_repositories webhook",
        );
        return reply.status(202).send({ status: "queued" });
      }

      await markDelivery(deliveryId, "IGNORED", "unsupported_event");
      request.log.info(
        { requestId: request.id, deliveryId, event, action },
        "Ignored unsupported GitHub webhook event",
      );
      return reply
        .status(202)
        .send({ status: "ignored", reason: "unsupported_event" });
    },
  );
};
