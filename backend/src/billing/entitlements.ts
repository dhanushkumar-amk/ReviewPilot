/**
 * entitlements.ts
 * In-memory cached workspace entitlements, plan limits, and usage calculation.
 */

import { prisma } from "../db.js";
import { env } from "../env.js";
import { PLAN_LIMITS, type PlanLimits, type PlanTier } from "./plans.js";

export interface WorkspaceUsage {
  connectedRepositories: number;
  scansThisMonth: number;
  aiFixDraftsThisMonth: number;
  members: number;
}

export interface WorkspaceEntitlements {
  plan: PlanTier;
  limits: PlanLimits;
  usage: WorkspaceUsage;
  status: string | null;
  planKey: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: Date | null;
}

export class PlanLimitError extends Error {
  constructor(
    public readonly kind: "repositories" | "scans" | "aiFixDrafts" | "members",
    public readonly limit: number,
    public readonly used: number,
    public readonly plan: PlanTier
  ) {
    super(`PLAN_LIMIT_REACHED: ${kind} limit of ${limit} reached on ${plan} plan (used: ${used})`);
    this.name = "PlanLimitError";
  }
}

// 30-second in-memory cache per workspace
interface CachedEntitlement {
  data: WorkspaceEntitlements;
  cachedAt: number;
}
const entitlementsCache = new Map<string, CachedEntitlement>();
const CACHE_TTL_MS = 30 * 1000;

export function invalidateEntitlementsCache(workspaceId?: string): void {
  if (workspaceId) {
    entitlementsCache.delete(workspaceId);
  } else {
    entitlementsCache.clear();
  }
}

/**
 * Computes the first millisecond of the current UTC calendar month.
 */
function getStartOfCurrentUtcMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Calculates whether a subscription row grants Premium status.
 */
export function evaluatePlanTier(
  sub: {
    status: string;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    graceUntil: Date | null;
  } | null
): PlanTier {
  // Support dev/test override
  if (env.NODE_ENV !== "production" && env.BILLING_FORCE_PLAN) {
    return env.BILLING_FORCE_PLAN === "premium" ? "PREMIUM" : "FREE";
  }

  if (!sub) return "FREE";

  const now = new Date();
  const status = sub.status.toUpperCase();

  // 1. ACTIVE grants Premium
  if (status === "ACTIVE") {
    return "PREMIUM";
  }

  // 2. PENDING while now < graceUntil grants Premium
  if (status === "PENDING" && sub.graceUntil && now < sub.graceUntil) {
    return "PREMIUM";
  }

  // 3. CANCELLED or cancelAtPeriodEnd while now < currentPeriodEnd grants Premium
  if (
    (status === "CANCELLED" || sub.cancelAtPeriodEnd) &&
    sub.currentPeriodEnd &&
    now < sub.currentPeriodEnd
  ) {
    return "PREMIUM";
  }

  // AUTHENTICATED, HALTED, EXPIRED, COMPLETED, PAUSED, CREATED count as FREE
  return "FREE";
}

/**
 * Fetches workspace entitlements and usage with 30-second in-memory caching.
 */
export async function getEntitlements(workspaceId: string): Promise<WorkspaceEntitlements> {
  const cached = entitlementsCache.get(workspaceId);
  const nowMs = Date.now();
  if (cached && nowMs - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const startOfMonth = getStartOfCurrentUtcMonth();

  const [sub, connectedRepos, scansThisMonth, aiDraftsThisMonth, membersCount] = await Promise.all([
    prisma.billingSubscription.findUnique({
      where: { workspaceId },
    }),
    prisma.repository.count({
      where: { workspaceId, status: "CONNECTED" },
    }),
    prisma.scan.count({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
        status: { not: "SKIPPED" },
      },
    }),
    prisma.fixProposal.count({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.member.count({
      where: { organizationId: workspaceId },
    }),
  ]);

  const plan = evaluatePlanTier(sub);
  const limits = PLAN_LIMITS[plan];

  const usage: WorkspaceUsage = {
    connectedRepositories: connectedRepos,
    scansThisMonth,
    aiFixDraftsThisMonth: aiDraftsThisMonth,
    members: membersCount,
  };

  const result: WorkspaceEntitlements = {
    plan,
    limits,
    usage,
    status: sub?.status ?? null,
    planKey: sub?.planKey ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    graceUntil: sub?.graceUntil ?? null,
  };

  entitlementsCache.set(workspaceId, {
    data: result,
    cachedAt: nowMs,
  });

  return result;
}

/**
 * Enforces plan limits. Throws PlanLimitError (HTTP 403) when exceeded.
 */
export async function assertWithinLimit(
  workspaceId: string,
  kind: "repositories" | "scans" | "aiFixDrafts" | "members"
): Promise<void> {
  const entitlements = await getEntitlements(workspaceId);
  const { plan, limits, usage } = entitlements;

  let limit = 0;
  let used = 0;

  switch (kind) {
    case "repositories":
      limit = limits.maxRepositories;
      used = usage.connectedRepositories;
      break;
    case "scans":
      limit = limits.maxScansPerMonth;
      used = usage.scansThisMonth;
      break;
    case "aiFixDrafts":
      limit = limits.maxAiFixDraftsPerMonth;
      used = usage.aiFixDraftsThisMonth;
      break;
    case "members":
      limit = limits.maxMembers;
      used = usage.members;
      break;
  }

  if (used >= limit) {
    throw new PlanLimitError(kind, limit, used, plan);
  }
}

/**
 * Checks whether a repository is allowed to be scanned under the plan limits.
 * Repositories beyond the plan's limit (ranked by connection/creation date, oldest first)
 * are paused by plan and should NOT be scanned.
 */
export async function isRepositoryAllowedByPlan(
  workspaceId: string,
  repositoryId: string
): Promise<{ allowed: boolean; rank: number; limit: number; plan: PlanTier }> {
  const entitlements = await getEntitlements(workspaceId);
  const limit = entitlements.limits.maxRepositories;

  // Fetch all CONNECTED repositories ordered by createdAt asc (oldest first allowed)
  const repos = await prisma.repository.findMany({
    where: { workspaceId, status: "CONNECTED" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const index = repos.findIndex((r) => r.id === repositoryId);
  const rank = index === -1 ? repos.length + 1 : index + 1;

  return {
    allowed: rank <= limit,
    rank,
    limit,
    plan: entitlements.plan,
  };
}

/**
 * Computes the minimum date for items to show based on plan history limits.
 * For FREE (7 days), items older than now - 7 days are hidden from list endpoints.
 */
export async function getHistoryCutoffDate(workspaceId: string): Promise<Date | null> {
  const entitlements = await getEntitlements(workspaceId);
  const days = entitlements.limits.historyDays;
  if (days >= 365) return null; // unlimited / 1 year

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}
