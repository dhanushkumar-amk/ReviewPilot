/**
 * sync.ts
 * Centralized subscription synchronization from Razorpay API to database.
 * Handles out-of-order events, status mapping, and grace period calculations.
 */

import { prisma } from "../db.js";
import { fetchRazorpaySubscription } from "./razorpay.js";
import { invalidateEntitlementsCache } from "./entitlements.js";

export async function syncSubscriptionFromRazorpay(
  razorpaySubscriptionId: string,
  existingWorkspaceId?: string
) {
  // 1. Fetch source of truth from Razorpay API
  const rzpSub = await fetchRazorpaySubscription(razorpaySubscriptionId);
  const statusUpper = (rzpSub.status || "CREATED").toUpperCase();

  const currentPeriodStart = rzpSub.current_start
    ? new Date(rzpSub.current_start * 1000)
    : null;
  const currentPeriodEnd = rzpSub.current_end
    ? new Date(rzpSub.current_end * 1000)
    : null;

  // 2. Locate subscription in DB
  let existing = await prisma.billingSubscription.findUnique({
    where: { razorpaySubscriptionId },
  });

  if (!existing && existingWorkspaceId) {
    existing = await prisma.billingSubscription.findUnique({
      where: { workspaceId: existingWorkspaceId },
    });
  }

  if (!existing) {
    return null;
  }

  const now = new Date();
  let graceUntil = existing.graceUntil;

  // Handle grace period on PENDING
  if (statusUpper === "PENDING") {
    if (!graceUntil) {
      // 3 days grace
      graceUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    }
  } else if (statusUpper === "ACTIVE") {
    graceUntil = null;
  }

  // If status is CANCELLED or COMPLETED or EXPIRED, cancelAtPeriodEnd is true or settled
  let cancelAtPeriodEnd = existing.cancelAtPeriodEnd;
  if (statusUpper === "CANCELLED") {
    cancelAtPeriodEnd = true;
  }

  const updated = await prisma.billingSubscription.update({
    where: { id: existing.id },
    data: {
      status: statusUpper,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      graceUntil,
      lastSyncedAt: now,
    },
  });

  // Invalidate in-memory entitlements cache
  invalidateEntitlementsCache(updated.workspaceId);

  return updated;
}
