/**
 * razorpay.ts
 * Razorpay client wrapper with strict security, constant-time verification,
 * 10s request timeouts, and fixed error codes.
 */

import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env, isBillingEnabled } from "../env.js";
import { PLANS_DISPLAY } from "./plans.js";

export class BillingError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500
  ) {
    super(code ? `[${code}] ${message}` : message);
    this.name = "BillingError";
  }
}

let razorpayClient: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (!isBillingEnabled || !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new BillingError("BILLING_DISABLED", "Billing is disabled in this environment", 404);
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayClient;
}

/**
 * Timeout helper ensuring third-party SDK calls abort after 10s.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new BillingError("BILLING_UNAVAILABLE", "Billing service timed out", 504));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer!);
  }
}

/**
 * Maps raw Razorpay SDK errors to fixed internal codes without leaking stack or payload text.
 */
function mapRazorpayError(err: unknown): BillingError {
  if (err instanceof BillingError) return err;

  const errorObj = err as { statusCode?: number; error?: { code?: string; description?: string } };
  const status = errorObj?.statusCode ?? 500;

  if (status >= 400 && status < 500) {
    return new BillingError("BILLING_REJECTED", "Billing operation was rejected by provider", status);
  }

  return new BillingError("BILLING_UNAVAILABLE", "Billing provider is temporarily unavailable", 502);
}

/**
 * Create a new subscription on Razorpay.
 */
export async function createRazorpaySubscription(params: {
  planId: string;
  totalCount: number;
  notes: {
    workspaceId: string;
    userId: string;
    planKey: string;
  };
}) {
  const rzp = getRazorpayClient();
  try {
    const res = await withTimeout(
      rzp.subscriptions.create({
        plan_id: params.planId,
        total_count: params.totalCount,
        customer_notify: 1,
        notes: params.notes,
      })
    );
    return res as unknown as {
      id: string;
      status: string;
      plan_id: string;
      current_start?: number | null;
      current_end?: number | null;
      ended_at?: number | null;
      charge_at?: number | null;
    };
  } catch (err) {
    throw mapRazorpayError(err);
  }
}

/**
 * Fetch an existing subscription from Razorpay by ID.
 */
export async function fetchRazorpaySubscription(subscriptionId: string) {
  const rzp = getRazorpayClient();
  try {
    const res = await withTimeout(rzp.subscriptions.fetch(subscriptionId));
    return res as unknown as {
      id: string;
      status: string;
      plan_id: string;
      current_start?: number | null;
      current_end?: number | null;
      ended_at?: number | null;
      charge_at?: number | null;
      notes?: Record<string, string>;
    };
  } catch (err) {
    throw mapRazorpayError(err);
  }
}

/**
 * Cancel a subscription at the end of the current billing cycle.
 */
export async function cancelRazorpaySubscriptionAtCycleEnd(subscriptionId: string) {
  const rzp = getRazorpayClient();
  try {
    const res = await withTimeout(rzp.subscriptions.cancel(subscriptionId, true));
    return res as unknown as {
      id: string;
      status: string;
      current_end?: number | null;
    };
  } catch (err) {
    throw mapRazorpayError(err);
  }
}

/**
 * Fetch a plan definition from Razorpay by ID.
 */
export async function fetchRazorpayPlan(planId: string) {
  const rzp = getRazorpayClient();
  try {
    const res = await withTimeout(rzp.plans.fetch(planId));
    return res as unknown as {
      id: string;
      item?: {
        amount?: number;
        currency?: string;
        name?: string;
      };
      period?: string;
      interval?: number;
    };
  } catch (err) {
    throw mapRazorpayError(err);
  }
}

/**
 * Verifies Razorpay Webhook signature using constant-time HMAC comparison.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signature: string | undefined | null,
  secret: string
): boolean {
  if (!signature || !secret || !rawBody) return false;

  try {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const signatureBuf = Buffer.from(signature.trim(), "utf8");

    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay Checkout payment verification callback:
 * HMAC-SHA256 of razorpay_payment_id + "|" + razorpay_subscription_id with RAZORPAY_KEY_SECRET.
 */
export function verifyRazorpayCheckoutSignature(params: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const { paymentId, subscriptionId, signature, keySecret } = params;
  if (!paymentId || !subscriptionId || !signature || !keySecret) return false;

  try {
    const payload = `${paymentId.trim()}|${subscriptionId.trim()}`;
    const expected = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const signatureBuf = Buffer.from(signature.trim(), "utf8");

    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

/**
 * On startup (non-test), verify that configured Razorpay plans match display pricing.
 * Logs only plan IDs and amounts (never sensitive secrets).
 */
export async function checkPlanAmountsOnStartup(): Promise<void> {
  if (process.env.NODE_ENV === "test" || !isBillingEnabled) return;

  const monthlyId = env.RAZORPAY_PLAN_PREMIUM_MONTHLY;
  const yearlyId = env.RAZORPAY_PLAN_PREMIUM_YEARLY;

  if (monthlyId) {
    try {
      const plan = await fetchRazorpayPlan(monthlyId);
      const planAmount = plan?.item?.amount;
      const expectedAmount = PLANS_DISPLAY.PREMIUM_MONTHLY.amountPaise;
      if (planAmount !== undefined && planAmount !== expectedAmount) {
        console.warn(
          `[billing] WARNING: Razorpay monthly plan ${monthlyId} amount (${planAmount}) differs from config (${expectedAmount})`
        );
      }
    } catch {
      // Non-fatal warning on startup
      console.warn(`[billing] WARNING: Unable to verify monthly plan ${monthlyId} on startup`);
    }
  }

  if (yearlyId) {
    try {
      const plan = await fetchRazorpayPlan(yearlyId);
      const planAmount = plan?.item?.amount;
      const expectedAmount = PLANS_DISPLAY.PREMIUM_YEARLY.amountPaise;
      if (planAmount !== undefined && planAmount !== expectedAmount) {
        console.warn(
          `[billing] WARNING: Razorpay yearly plan ${yearlyId} amount (${planAmount}) differs from config (${expectedAmount})`
        );
      }
    } catch {
      console.warn(`[billing] WARNING: Unable to verify yearly plan ${yearlyId} on startup`);
    }
  }
}
