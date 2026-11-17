import crypto from "node:crypto";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { env } from "../src/env.js";
import {
  PLAN_LIMITS,
  PLANS_DISPLAY,
  FREE_PLAN_LIMITS,
  PREMIUM_PLAN_LIMITS,
} from "../src/billing/plans.js";
import {
  verifyRazorpayWebhookSignature,
  verifyRazorpayCheckoutSignature,
  createRazorpaySubscription,
} from "../src/billing/razorpay.js";
import {
  getEntitlements,
  assertWithinLimit,
  isRepositoryAllowedByPlan,
  getHistoryCutoffDate,
  evaluatePlanTier,
  PlanLimitError,
  invalidateEntitlementsCache,
} from "../src/billing/entitlements.js";

describe("Razorpay Billing & Plan Limits", () => {
  let app: FastifyInstance;
  const createdWorkspaceIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (createdWorkspaceIds.length > 0) {
      await prisma.billingPayment.deleteMany({
        where: { workspaceId: { in: createdWorkspaceIds } },
      });
      await prisma.billingSubscription.deleteMany({
        where: { workspaceId: { in: createdWorkspaceIds } },
      });
      await prisma.repository.deleteMany({
        where: { workspaceId: { in: createdWorkspaceIds } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: createdWorkspaceIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    await app.close();
  });

  describe("Plan configurations & pricing", () => {
    it("enforces Free plan limits strictly", () => {
      expect(FREE_PLAN_LIMITS.maxRepositories).toBe(1);
      expect(FREE_PLAN_LIMITS.maxScansPerMonth).toBe(30);
      expect(FREE_PLAN_LIMITS.maxAiFixDraftsPerMonth).toBe(3);
      expect(FREE_PLAN_LIMITS.historyDays).toBe(7);
      expect(FREE_PLAN_LIMITS.maxMembers).toBe(1);
    });

    it("enforces Premium plan limits strictly", () => {
      expect(PREMIUM_PLAN_LIMITS.maxRepositories).toBe(10);
      expect(PREMIUM_PLAN_LIMITS.maxScansPerMonth).toBe(1000);
      expect(PREMIUM_PLAN_LIMITS.maxAiFixDraftsPerMonth).toBe(50);
      expect(PREMIUM_PLAN_LIMITS.historyDays).toBe(90);
      expect(PREMIUM_PLAN_LIMITS.maxMembers).toBe(5);
    });

    it("has server-authoritative display pricing in paise", () => {
      expect(PLANS_DISPLAY.PREMIUM_MONTHLY.amount).toBe(79900);
      expect(PLANS_DISPLAY.PREMIUM_MONTHLY.currency).toBe("INR");
      expect(PLANS_DISPLAY.PREMIUM_YEARLY.amount).toBe(799900);
      expect(PLANS_DISPLAY.PREMIUM_YEARLY.currency).toBe("INR");
    });
  });

  describe("Constant-time Signature Verification", () => {
    const testSecret = "test_webhook_secret_32_characters_long_min";
    const keySecret = "test_razorpay_key_secret_for_tests";

    it("verifies matching webhook signature correctly", () => {
      const payload = JSON.stringify({ event: "subscription.activated", id: "sub_123" });
      const validSig = crypto.createHmac("sha256", testSecret).update(payload).digest("hex");

      const isValid = verifyRazorpayWebhookSignature(payload, validSig, testSecret);
      expect(isValid).toBe(true);
    });

    it("rejects mismatched webhook signatures safely", () => {
      const payload = JSON.stringify({ event: "subscription.activated" });
      const invalidSig = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      const isValid = verifyRazorpayWebhookSignature(payload, invalidSig, testSecret);
      expect(isValid).toBe(false);
    });

    it("rejects signatures with length mismatch without timing leak", () => {
      const payload = JSON.stringify({ event: "subscription.activated" });
      const shortSig = "abcdef";

      const isValid = verifyRazorpayWebhookSignature(payload, shortSig, testSecret);
      expect(isValid).toBe(false);
    });

    it("verifies valid Checkout callback signature (payment_id|subscription_id)", () => {
      const paymentId = "pay_test_payment_123";
      const subscriptionId = "sub_test_sub_456";
      const payload = `${paymentId}|${subscriptionId}`;
      const validSig = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");

      const isValid = verifyRazorpayCheckoutSignature(paymentId, subscriptionId, validSig, keySecret);
      expect(isValid).toBe(true);
    });

    it("rejects tampered payment_id or subscription_id in checkout callback", () => {
      const paymentId = "pay_test_payment_123";
      const subscriptionId = "sub_test_sub_456";
      const payload = `${paymentId}|${subscriptionId}`;
      const validSig = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");

      const isTampered = verifyRazorpayCheckoutSignature(
        "pay_tampered_999",
        subscriptionId,
        validSig,
        keySecret
      );
      expect(isTampered).toBe(false);
    });
  });

  describe("Entitlements & Plan Tier Evaluation", () => {
    it("defaults to FREE plan tier when no subscription exists", () => {
      const tier = evaluatePlanTier(null);
      expect(tier).toBe("FREE");
    });

    it("evaluates ACTIVE subscription as PREMIUM", () => {
      const tier = evaluatePlanTier({
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + 86400000),
        cancelAtPeriodEnd: false,
        graceUntil: null,
      });
      expect(tier).toBe("PREMIUM");
    });

    it("evaluates PENDING subscription within grace period as PREMIUM", () => {
      const tier = evaluatePlanTier({
        status: "PENDING",
        currentPeriodEnd: new Date(Date.now() - 86400000),
        cancelAtPeriodEnd: false,
        graceUntil: new Date(Date.now() + 86400000), // grace active
      });
      expect(tier).toBe("PREMIUM");
    });

    it("evaluates PENDING subscription past grace period as FREE", () => {
      const tier = evaluatePlanTier({
        status: "PENDING",
        currentPeriodEnd: new Date(Date.now() - 86400000),
        cancelAtPeriodEnd: false,
        graceUntil: new Date(Date.now() - 3600000), // grace expired
      });
      expect(tier).toBe("FREE");
    });

    it("evaluates CANCELLED subscription before period end as PREMIUM", () => {
      const tier = evaluatePlanTier({
        status: "CANCELLED",
        currentPeriodEnd: new Date(Date.now() + 86400000), // still in current cycle
        cancelAtPeriodEnd: true,
        graceUntil: null,
      });
      expect(tier).toBe("PREMIUM");
    });

    it("evaluates CANCELLED subscription after period end as FREE", () => {
      const tier = evaluatePlanTier({
        status: "CANCELLED",
        currentPeriodEnd: new Date(Date.now() - 86400000), // period has elapsed
        cancelAtPeriodEnd: true,
        graceUntil: null,
      });
      expect(tier).toBe("FREE");
    });
  });

  describe("Multi-tenant workspace limits & repo pause enforcement", () => {
    let workspaceId: string;
    let repo1Id: string;
    let repo2Id: string;

    beforeAll(async () => {
      const org = await prisma.organization.create({
        data: {
          id: `org_test_billing_${crypto.randomUUID().slice(0, 8)}`,
          name: "Test Billing Org",
          slug: `test-billing-${crypto.randomUUID().slice(0, 8)}`,
        },
      });
      workspaceId = org.id;
      createdWorkspaceIds.push(workspaceId);

      const r1 = await prisma.repository.create({
        data: {
          workspaceId,
          provider: "GITHUB",
          externalId: `ext_${crypto.randomUUID().slice(0, 8)}`,
          fullName: "test-owner/test-repo-1",
          defaultBranch: "main",
          status: "CONNECTED",
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      });
      repo1Id = r1.id;

      const r2 = await prisma.repository.create({
        data: {
          workspaceId,
          provider: "GITHUB",
          externalId: `ext_${crypto.randomUUID().slice(0, 8)}`,
          fullName: "test-owner/test-repo-2",
          defaultBranch: "main",
          status: "CONNECTED",
          createdAt: new Date("2026-01-02T00:00:00Z"),
        },
      });
      repo2Id = r2.id;
    });

    it("allows the 1st repository under Free limit and pauses the 2nd repository", async () => {
      invalidateEntitlementsCache(workspaceId);

      const check1 = await isRepositoryAllowedByPlan(workspaceId, repo1Id);
      expect(check1.allowed).toBe(true);
      expect(check1.rank).toBe(1);

      const check2 = await isRepositoryAllowedByPlan(workspaceId, repo2Id);
      expect(check2.allowed).toBe(false);
      expect(check2.rank).toBe(2);
      expect(check2.limit).toBe(1);
    });

    it("assertWithinLimit throws PlanLimitError when repository limit is exceeded", async () => {
      invalidateEntitlementsCache(workspaceId);

      await expect(assertWithinLimit(workspaceId, "repositories")).rejects.toThrow(
        PlanLimitError
      );
    });

    it("calculates history cutoff date for Free tier as 7 days ago", async () => {
      const cutoff = await getHistoryCutoffDate(workspaceId);
      expect(cutoff).toBeInstanceOf(Date);

      const diffMs = Math.abs(Date.now() - cutoff!.getTime());
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(7);
    });
  });

  describe("Razorpay Webhook Endpoint", () => {
    it("rejects webhook request with missing signature", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/billing/webhooks/razorpay",
        headers: {
          "content-type": "application/json",
          "x-razorpay-event-id": `evt_${crypto.randomUUID().slice(0, 8)}`,
        },
        payload: JSON.stringify({ event: "payment.captured" }),
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe("Missing signature header");
    });

    it("rejects webhook request with invalid HMAC signature", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/billing/webhooks/razorpay",
        headers: {
          "content-type": "application/json",
          "x-razorpay-signature": "invalid_signature_that_does_not_match",
          "x-razorpay-event-id": `evt_${crypto.randomUUID().slice(0, 8)}`,
        },
        payload: JSON.stringify({ event: "payment.captured" }),
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.error).toBe("Invalid webhook signature");
    });

    it("deduplicates already processed webhook events", async () => {
      const eventId = `evt_dedupe_${crypto.randomUUID().slice(0, 10)}`;
      const payload = JSON.stringify({ event: "payment.captured", id: "pay_test_123" });
      const secret = env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret_default_test_minimum_32_characters";
      const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      // Seed already processed event
      await prisma.billingEvent.create({
        data: {
          eventId,
          event: "payment.captured",
          status: "PROCESSED",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/billing/webhooks/razorpay",
        headers: {
          "content-type": "application/json",
          "x-razorpay-signature": signature,
          "x-razorpay-event-id": eventId,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.status).toBe("deduplicated");

      await prisma.billingEvent.delete({ where: { eventId } });
    });
  });
});
