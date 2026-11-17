/**
 * billing.ts
 * Fastify routes for Razorpay subscriptions, confirmations, cancellations,
 * entitlements, and payments history.
 */

import crypto from "node:crypto";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { env, isBillingEnabled } from "../env.js";
import { requireWorkspace, workspaceWhere } from "../tenancy/workspace.js";
import { InMemoryRateLimiter } from "../lib/rate-limit.js";
import { PLANS_DISPLAY, type PlanKey } from "../billing/plans.js";
import {
  getEntitlements,
  invalidateEntitlementsCache,
} from "../billing/entitlements.js";
import {
  createRazorpaySubscription,
  cancelRazorpaySubscriptionAtCycleEnd,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
  BillingError,
} from "../billing/razorpay.js";
import { syncSubscriptionFromRazorpay } from "../billing/sync.js";

const subscribeRateLimiter = new InMemoryRateLimiter(5, 60_000);
const manageRateLimiter = new InMemoryRateLimiter(3, 60_000);
const webhookRateLimiter = new InMemoryRateLimiter(300, 60_000);
const WEBHOOK_BODY_LIMIT = 1024 * 1024; // 1 MB

const subscribeBodySchema = z.object({
  planKey: z.enum(["PREMIUM_MONTHLY", "PREMIUM_YEARLY"]),
});

const confirmBodySchema = z.object({
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_subscription_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export const billingRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // GET /api/billing
  app.get(
    "/api/billing",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      const workspaceId = request.workspace!.id;
      const role = request.workspace!.role;
      const canManage = role === "owner";

      const entitlements = await getEntitlements(workspaceId);

      const [sub, payments] = await Promise.all([
        prisma.billingSubscription.findUnique({
          where: { workspaceId },
        }),
        prisma.billingPayment.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            razorpayPaymentId: true,
            amount: true,
            currency: true,
            status: true,
            paidAt: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        billingEnabled: isBillingEnabled,
        entitlements,
        subscription: sub
          ? {
              status: sub.status,
              planKey: sub.planKey,
              currentPeriodStart: sub.currentPeriodStart,
              currentPeriodEnd: sub.currentPeriodEnd,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
              graceUntil: sub.graceUntil,
            }
          : null,
        payments: payments.map((p) => ({
          id: p.id,
          reference: p.razorpayPaymentId,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          paidAt: p.paidAt,
          createdAt: p.createdAt,
        })),
        canManage,
        plans: PLANS_DISPLAY,
      };
    }
  );

  // POST /api/billing/subscribe
  app.post(
    "/api/billing/subscribe",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      if (!isBillingEnabled) {
        return reply.status(404).send({
          error: {
            code: "BILLING_DISABLED",
            message: "Billing is not enabled in this environment",
            requestId: request.id,
          },
        });
      }

      const role = request.workspace!.role;
      if (role !== "owner") {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Only the workspace owner can subscribe to plans",
            requestId: request.id,
          },
        });
      }

      const userId = request.user!.id;
      const rateLimit = subscribeRateLimiter.check(userId);
      if (!rateLimit.allowed) {
        return reply.status(429).send({
          error: {
            code: "RATE_LIMITED",
            message: "Too many subscription attempts. Please wait a moment.",
            requestId: request.id,
          },
        });
      }

      const parseResult = subscribeBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid plan key requested",
            requestId: request.id,
          },
        });
      }

      const { planKey } = parseResult.data;
      const workspaceId = request.workspace!.id;

      // Check current subscription
      const existing = await prisma.billingSubscription.findUnique({
        where: { workspaceId },
      });

      if (existing) {
        const activeStatuses = ["ACTIVE", "PENDING", "AUTHENTICATED"];
        if (activeStatuses.includes(existing.status.toUpperCase())) {
          return reply.status(409).send({
            error: {
              code: "ALREADY_SUBSCRIBED",
              message: "Workspace already has an active or pending subscription",
              requestId: request.id,
            },
          });
        }
      }

      const planId =
        planKey === "PREMIUM_MONTHLY"
          ? env.RAZORPAY_PLAN_PREMIUM_MONTHLY!
          : env.RAZORPAY_PLAN_PREMIUM_YEARLY!;

      const totalCount = planKey === "PREMIUM_MONTHLY" ? 120 : 10;

      const rzpSub = await createRazorpaySubscription({
        planId,
        totalCount,
        notes: {
          workspaceId,
          userId,
          planKey,
        },
      });

      // Replace or insert subscription in transaction
      await prisma.$transaction(async (tx) => {
        if (existing) {
          await tx.billingSubscription.delete({
            where: { id: existing.id },
          });
        }

        await tx.billingSubscription.create({
          data: {
            workspaceId,
            razorpaySubscriptionId: rzpSub.id,
            razorpayPlanId: planId,
            planKey,
            status: "CREATED",
            createdByUserId: userId,
          },
        });

        await tx.auditLog.create({
          data: {
            workspaceId,
            actorUserId: userId,
            action: "billing.subscribe_started",
            targetType: "billing_subscription",
            targetId: rzpSub.id,
            metadata: {
              planKey,
              razorpaySubscriptionId: rzpSub.id,
            },
          },
        });
      });

      invalidateEntitlementsCache(workspaceId);

      return {
        subscriptionId: rzpSub.id,
        keyId: env.RAZORPAY_KEY_ID,
        razorpayKeyId: env.RAZORPAY_KEY_ID,
        planKey,
        prefill: {
          name: request.user!.name || "",
          email: request.user!.email,
        },
      };
    }
  );

  // POST /api/billing/confirm
  app.post(
    "/api/billing/confirm",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      if (!isBillingEnabled) {
        return reply.status(404).send({
          error: {
            code: "BILLING_DISABLED",
            message: "Billing is not enabled in this environment",
            requestId: request.id,
          },
        });
      }

      const role = request.workspace!.role;
      if (role !== "owner") {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Only the workspace owner can confirm subscriptions",
            requestId: request.id,
          },
        });
      }

      const parseResult = confirmBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: "BAD_REQUEST",
            message: "Invalid confirmation parameters",
            requestId: request.id,
          },
        });
      }

      const {
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
      } = parseResult.data;

      const workspaceId = request.workspace!.id;

      // 1. Verify constant-time HMAC signature
      const valid = verifyRazorpayCheckoutSignature({
        paymentId: razorpay_payment_id,
        subscriptionId: razorpay_subscription_id,
        signature: razorpay_signature,
        keySecret: env.RAZORPAY_KEY_SECRET!,
      });

      if (!valid) {
        return reply.status(400).send({
          error: {
            code: "BILLING_SIGNATURE_INVALID",
            message: "Invalid payment verification signature",
            requestId: request.id,
          },
        });
      }

      // 2. Ensure subscription belongs to this workspace
      const sub = await prisma.billingSubscription.findFirst({
        where: {
          workspaceId,
          razorpaySubscriptionId: razorpay_subscription_id,
        },
      });

      if (!sub) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Subscription not found for this workspace",
            requestId: request.id,
          },
        });
      }

      // 3. Re-fetch from Razorpay API and update state
      const updated = await syncSubscriptionFromRazorpay(
        razorpay_subscription_id,
        workspaceId
      );

      return {
        status: updated?.status ?? "ACTIVE",
      };
    }
  );

  // POST /api/billing/cancel
  app.post(
    "/api/billing/cancel",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      if (!isBillingEnabled) {
        return reply.status(404).send({
          error: {
            code: "BILLING_DISABLED",
            message: "Billing is not enabled in this environment",
            requestId: request.id,
          },
        });
      }

      const role = request.workspace!.role;
      if (role !== "owner") {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Only the workspace owner can cancel subscriptions",
            requestId: request.id,
          },
        });
      }

      const userId = request.user!.id;
      const rateLimit = manageRateLimiter.check(userId);
      if (!rateLimit.allowed) {
        return reply.status(429).send({
          error: {
            code: "RATE_LIMITED",
            message: "Too many cancel attempts. Please wait a moment.",
            requestId: request.id,
          },
        });
      }

      const workspaceId = request.workspace!.id;
      const sub = await prisma.billingSubscription.findUnique({
        where: { workspaceId },
      });

      if (!sub) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "No active subscription found to cancel",
            requestId: request.id,
          },
        });
      }

      // Cancel at cycle end on Razorpay
      await cancelRazorpaySubscriptionAtCycleEnd(sub.razorpaySubscriptionId);

      // Update cancelAtPeriodEnd and sync
      const synced = await syncSubscriptionFromRazorpay(
        sub.razorpaySubscriptionId,
        workspaceId
      );

      await prisma.auditLog.create({
        data: {
          workspaceId,
          actorUserId: userId,
          action: "billing.cancel_requested",
          targetType: "billing_subscription",
          targetId: sub.razorpaySubscriptionId,
          metadata: {
            subscriptionId: sub.razorpaySubscriptionId,
            currentPeriodEnd: synced?.currentPeriodEnd?.toISOString(),
          },
        },
      });

      return {
        success: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: synced?.currentPeriodEnd,
      };
    }
  );

  // POST /api/billing/sync
  app.post(
    "/api/billing/sync",
    { preHandler: requireWorkspace },
    async (request, reply) => {
      if (!isBillingEnabled) {
        return reply.status(404).send({
          error: {
            code: "BILLING_DISABLED",
            message: "Billing is not enabled in this environment",
            requestId: request.id,
          },
        });
      }

      const role = request.workspace!.role;
      if (role !== "owner" && role !== "admin") {
        return reply.status(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Only workspace owners or admins can sync billing",
            requestId: request.id,
          },
        });
      }

      const userId = request.user!.id;
      const rateLimit = manageRateLimiter.check(userId);
      if (!rateLimit.allowed) {
        return reply.status(429).send({
          error: {
            code: "RATE_LIMITED",
            message: "Too many sync attempts. Please wait a moment.",
            requestId: request.id,
          },
        });
      }

      const workspaceId = request.workspace!.id;
      const sub = await prisma.billingSubscription.findUnique({
        where: { workspaceId },
      });

      if (sub) {
        await syncSubscriptionFromRazorpay(sub.razorpaySubscriptionId, workspaceId);
      }

      const entitlements = await getEntitlements(workspaceId);

      return {
        success: true,
        entitlements,
      };
    }
  );
};

/**
 * Encapsulated Razorpay Webhook Plugin:
 * Captures RAW body buffer, verifies HMAC-SHA256 signature, deduplicates events,
 * and re-fetches authoritative subscription state.
 */
export const razorpayWebhookRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer", bodyLimit: WEBHOOK_BODY_LIMIT },
    (_req, body, done) => {
      done(null, body);
    }
  );

  app.post(
    "/api/billing/webhooks/razorpay",
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
          .send({ error: "Too many webhook requests" });
      }

      const rawBody = request.body as Buffer;
      if (!rawBody || !Buffer.isBuffer(rawBody)) {
        return reply.status(400).send({ error: "Invalid webhook payload buffer" });
      }

      const signature = request.headers["x-razorpay-signature"] as string | undefined;
      const eventIdHeader = request.headers["x-razorpay-event-id"] as string | undefined;

      const secret =
        env.RAZORPAY_WEBHOOK_SECRET ||
        (env.NODE_ENV === "test"
          ? "rzp_webhook_secret_default_test_minimum_32_characters"
          : "");
      if (!secret) {
        request.log.error({ requestId: request.id }, "Razorpay webhook secret not configured");
        return reply.status(500).send({ error: "Webhook secret missing" });
      }

      if (!signature) {
        return reply.status(400).send({ error: "Missing signature header" });
      }

      // 1. Verify constant-time HMAC signature BEFORE parsing JSON or touching DB
      const isValid = verifyRazorpayWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        request.log.warn({ requestId: request.id }, "Invalid Razorpay webhook signature");
        return reply.status(400).send({ error: "Invalid webhook signature" });
      }

      // 2. Deduplicate by event ID (or sha256 of raw body)
      const eventId =
        eventIdHeader?.trim() ||
        crypto.createHash("sha256").update(rawBody).digest("hex");

      let rawEventText = "";
      let parsedPayload: any;
      try {
        rawEventText = rawBody.toString("utf8");
        parsedPayload = JSON.parse(rawEventText);
      } catch {
        return reply.status(400).send({ error: "Malformed JSON payload" });
      }

      const eventType = String(parsedPayload.event || "unknown");

      // Check existing BillingEvent
      const existingEvent = await prisma.billingEvent.findUnique({
        where: { eventId },
      });

      if (existingEvent) {
        if (existingEvent.status === "PROCESSED" || existingEvent.status === "IGNORED") {
          return reply.status(200).send({ status: "duplicate", eventId });
        }
      } else {
        await prisma.billingEvent.create({
          data: {
            eventId,
            event: eventType,
            status: "PROCESSED",
          },
        });
      }

      try {
        const payloadData = parsedPayload.payload || {};

        // 3. Handle Subscription Events
        if (eventType.startsWith("subscription.")) {
          const subEntity = payloadData.subscription?.entity;
          const subscriptionId = subEntity?.id;

          if (subscriptionId) {
            // Find subscription row to ensure it belongs to one of our workspaces
            const dbSub = await prisma.billingSubscription.findUnique({
              where: { razorpaySubscriptionId: subscriptionId },
            });

            if (!dbSub) {
              // Unknown subscription ID: acknowledge with 200 and ignore
              await prisma.billingEvent.update({
                where: { eventId },
                data: { status: "IGNORED", processedAt: new Date() },
              });
              return reply.status(200).send({ status: "ignored_unknown_subscription" });
            }

            // Re-fetch authoritative state from Razorpay API
            const synced = await syncSubscriptionFromRazorpay(subscriptionId, dbSub.workspaceId);

            // Audit log on activated or cancelled
            if (eventType === "subscription.activated") {
              await prisma.auditLog.create({
                data: {
                  workspaceId: dbSub.workspaceId,
                  actorUserId: null,
                  action: "billing.activated",
                  targetType: "billing_subscription",
                  targetId: subscriptionId,
                  metadata: {
                    subscriptionId,
                    planKey: dbSub.planKey,
                  },
                },
              });
            } else if (eventType === "subscription.cancelled") {
              await prisma.auditLog.create({
                data: {
                  workspaceId: dbSub.workspaceId,
                  actorUserId: null,
                  action: "billing.cancelled",
                  targetType: "billing_subscription",
                  targetId: subscriptionId,
                  metadata: {
                    subscriptionId,
                  },
                },
              });
            }
          }
        }

        // 4. Handle Payment Events
        if (eventType === "payment.captured" || eventType === "payment.failed") {
          const paymentEntity = payloadData.payment?.entity;
          if (paymentEntity) {
            const paymentId = String(paymentEntity.id || "");
            const subscriptionId = paymentEntity.subscription_id || paymentEntity.invoice_id;
            const amount = Number(paymentEntity.amount || 0);
            const currency = String(paymentEntity.currency || "INR");
            const status = eventType === "payment.captured" ? "CAPTURED" : "FAILED";
            const paidAt =
              eventType === "payment.captured" && paymentEntity.created_at
                ? new Date(paymentEntity.created_at * 1000)
                : null;

            // Find associated workspace
            let targetWorkspaceId: string | null = null;
            if (subscriptionId) {
              const matchedSub = await prisma.billingSubscription.findUnique({
                where: { razorpaySubscriptionId: subscriptionId },
                select: { workspaceId: true },
              });
              targetWorkspaceId = matchedSub?.workspaceId ?? null;
            }

            // If notes include workspaceId
            if (!targetWorkspaceId && paymentEntity.notes?.workspaceId) {
              targetWorkspaceId = String(paymentEntity.notes.workspaceId);
            }

            if (targetWorkspaceId && paymentId) {
              await prisma.billingPayment.upsert({
                where: { razorpayPaymentId: paymentId },
                create: {
                  workspaceId: targetWorkspaceId,
                  razorpayPaymentId: paymentId,
                  razorpaySubscriptionId: subscriptionId || null,
                  amount,
                  currency,
                  status,
                  paidAt,
                },
                update: {
                  status,
                  paidAt: paidAt ?? undefined,
                },
              });

              if (status === "FAILED") {
                await prisma.auditLog.create({
                  data: {
                    workspaceId: targetWorkspaceId,
                    actorUserId: null,
                    action: "billing.payment_failed",
                    targetType: "billing_payment",
                    targetId: paymentId,
                    metadata: {
                      paymentId,
                      amount,
                      currency,
                    },
                  },
                });
              }
            }
          }
        }

        await prisma.billingEvent.update({
          where: { eventId },
          data: { status: "PROCESSED", processedAt: new Date() },
        });

        return reply.status(200).send({ status: "processed" });
      } catch (err) {
        request.log.error(
          { requestId: request.id, eventId, eventType, err },
          "Failed to process Razorpay webhook"
        );

        await prisma.billingEvent.update({
          where: { eventId },
          data: { status: "FAILED" },
        });

        // Return 500 so Razorpay retries later
        return reply.status(500).send({ error: "Webhook processing failed" });
      }
    }
  );
};
