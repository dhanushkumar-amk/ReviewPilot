import { prisma } from "../../db.js";
import { isBillingEnabled } from "../../env.js";
import { syncSubscriptionFromRazorpay } from "../../billing/sync.js";
import { invalidateEntitlementsCache } from "../../billing/entitlements.js";
import { inngest } from "../client.js";

const TERMINAL_STATUSES = ["CANCELLED", "COMPLETED", "EXPIRED"];

export const billingReconcile = inngest.createFunction(
  {
    id: "billing-reconcile",
    name: "Reconcile Razorpay Subscriptions",
    triggers: [
      { cron: "0 2 * * *" }, // Run daily at 02:00 UTC
      { event: "billing/reconcile.requested" },
    ],
  },
  async ({ step }) => {
    if (!isBillingEnabled) {
      return { skipped: true, reason: "BILLING_DISABLED" };
    }

    const result = await step.run("reconcile-subscriptions", async () => {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Find non-terminal subscriptions not synced in the last 24 hours
      const subs = await prisma.billingSubscription.findMany({
        where: {
          status: { notIn: TERMINAL_STATUSES },
          OR: [
            { lastSyncedAt: null },
            { lastSyncedAt: { lt: cutoff } },
          ],
        },
        select: {
          id: true,
          workspaceId: true,
          razorpaySubscriptionId: true,
        },
      });

      let syncedCount = 0;
      let errorCount = 0;

      for (const sub of subs) {
        try {
          await syncSubscriptionFromRazorpay(
            sub.razorpaySubscriptionId,
            sub.workspaceId
          );
          syncedCount++;
        } catch {
          errorCount++;
        }
      }

      // Clear expired grace periods for PENDING subscriptions where now > graceUntil
      const expiredGraceSubs = await prisma.billingSubscription.findMany({
        where: {
          status: "PENDING",
          graceUntil: { lt: now },
        },
        select: { id: true, workspaceId: true },
      });

      if (expiredGraceSubs.length > 0) {
        await prisma.billingSubscription.updateMany({
          where: {
            id: { in: expiredGraceSubs.map((s) => s.id) },
          },
          data: {
            status: "HALTED",
          },
        });

        for (const s of expiredGraceSubs) {
          invalidateEntitlementsCache(s.workspaceId);
        }
      }

      return {
        totalFound: subs.length,
        syncedCount,
        errorCount,
        expiredGraceCleared: expiredGraceSubs.length,
      };
    });

    return result;
  }
);
