import crypto from "node:crypto";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { env } from "../src/env.js";
import {
  PLAN_LIMITS,
  PLANS_DISPLAY,
} from "../src/billing/plans.js";
import {
  verifyRazorpayWebhookSignature,
  verifyRazorpayCheckoutSignature,
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

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Plan configurations & pricing", () => {
    it("enforces Free plan limits strictly", () => {
      expect(PLAN_LIMITS.FREE.maxRepositories).toBe(1);
      expect(PLAN_LIMITS.FREE.maxScansPerMonth).toBe(30);
      expect(PLAN_LIMITS.FREE.maxAiFixDraftsPerMonth).toBe(3);
      expect(PLAN_LIMITS.FREE.historyDays).toBe(7);
      expect(PLAN_LIMITS.FREE.maxMembers).toBe(1);
    });

    it("enforces Premium plan limits strictly", () => {
      expect(PLAN_LIMITS.PREMIUM.maxRepositories).toBe(10);
      expect(PLAN_LIMITS.PREMIUM.maxScansPerMonth).toBe(1000);
      expect(PLAN_LIMITS.PREMIUM.maxAiFixDraftsPerMonth).toBe(50);
      expect(PLAN_LIMITS.PREMIUM.historyDays).toBe(90);
      expect(PLAN_LIMITS.PREMIUM.maxMembers).toBe(5);
    });

    it("has server-authoritative display pricing in paise", () => {
      expect(PLANS_DISPLAY.PREMIUM_MONTHLY.amountPaise).toBe(79900);
      expect(PLANS_DISPLAY.PREMIUM_MONTHLY.currency).toBe("INR");
      expect(PLANS_DISPLAY.PREMIUM_YEARLY.amountPaise).toBe(799900);
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

      const isValid = verifyRazorpayCheckoutSignature({
        paymentId,
        subscriptionId,
        signature: validSig,
        keySecret,
      });
      expect(isValid).toBe(true);
    });

    it("rejects tampered payment_id or subscription_id in checkout callback", () => {
      const paymentId = "pay_test_payment_123";
      const subscriptionId = "sub_test_sub_456";
      const payload = `${paymentId}|${subscriptionId}`;
      const validSig = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");

      const isTampered = verifyRazorpayCheckoutSignature({
        paymentId: "pay_tampered_999",
        subscriptionId,
        signature: validSig,
        keySecret,
      });
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
        graceUntil: new Date(Date.now() + 86400000),
      });
      expect(tier).toBe("PREMIUM");
    });

    it("evaluates PENDING subscription past grace period as FREE", () => {
      const tier = evaluatePlanTier({
        status: "PENDING",
        currentPeriodEnd: new Date(Date.now() - 86400000),
        cancelAtPeriodEnd: false,
        graceUntil: new Date(Date.now() - 3600000),
      });
      expect(tier).toBe("FREE");
    });

    it("evaluates CANCELLED subscription before period end as PREMIUM", () => {
      const tier = evaluatePlanTier({
        status: "CANCELLED",
        currentPeriodEnd: new Date(Date.now() + 86400000),
        cancelAtPeriodEnd: true,
        graceUntil: null,
      });
      expect(tier).toBe("PREMIUM");
    });

    it("evaluates CANCELLED subscription after period end as FREE", () => {
      const tier = evaluatePlanTier({
        status: "CANCELLED",
        currentPeriodEnd: new Date(Date.now() - 86400000),
        cancelAtPeriodEnd: true,
        graceUntil: null,
      });
      expect(tier).toBe("FREE");
    });
  });

  describe("Multi-tenant workspace limits & repo pause enforcement", () => {
    const workspaceId = "ws-mock-billing-test";

    beforeAll(() => {
      vi.spyOn(prisma.billingSubscription, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.repository, "count").mockResolvedValue(2);
      vi.spyOn(prisma.scan, "count").mockResolvedValue(31);
      vi.spyOn(prisma.fixProposal, "count").mockResolvedValue(4);
      vi.spyOn(prisma.member, "count").mockResolvedValue(1);

      vi.spyOn(prisma.repository, "findMany").mockResolvedValue([
        { id: "repo-1" } as any,
        { id: "repo-2" } as any,
      ]);
    });

    afterAll(() => {
      vi.restoreAllMocks();
    });

    it("allows the 1st repository under Free limit and pauses the 2nd repository", async () => {
      invalidateEntitlementsCache(workspaceId);

      const check1 = await isRepositoryAllowedByPlan(workspaceId, "repo-1");
      expect(check1.allowed).toBe(true);
      expect(check1.rank).toBe(1);

      const check2 = await isRepositoryAllowedByPlan(workspaceId, "repo-2");
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

    it("assertWithinLimit throws PlanLimitError when scan limit is exceeded", async () => {
      invalidateEntitlementsCache(workspaceId);

      await expect(assertWithinLimit(workspaceId, "scans")).rejects.toThrow(
        PlanLimitError
      );
    });

    it("assertWithinLimit throws PlanLimitError when AI fix draft limit is exceeded", async () => {
      invalidateEntitlementsCache(workspaceId);

      await expect(assertWithinLimit(workspaceId, "aiFixDrafts")).rejects.toThrow(
        PlanLimitError
      );
    });

    it("calculates history cutoff date for Free tier as 7 days ago", async () => {
      invalidateEntitlementsCache(workspaceId);

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
      const secret =
        env.RAZORPAY_WEBHOOK_SECRET ||
        "rzp_webhook_secret_default_test_minimum_32_characters";
      const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      vi.spyOn(prisma.billingEvent, "findUnique").mockResolvedValue({
        id: "evt-id-1",
        eventId,
        event: "payment.captured",
        status: "PROCESSED",
        processedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

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
      expect(json.status).toBe("duplicate");

      vi.restoreAllMocks();
    });
  });
});
