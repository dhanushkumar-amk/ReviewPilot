/**
 * plans.ts
 * Plan tiers, limits, and display pricing configurations for ReviewPilot.
 * Real subscription billing amounts are governed by Razorpay plan objects.
 */

export type PlanKey = "PREMIUM_MONTHLY" | "PREMIUM_YEARLY";
export type PlanTier = "FREE" | "PREMIUM";

export interface PlanLimits {
  maxRepositories: number;
  maxScansPerMonth: number;
  maxAiFixDraftsPerMonth: number;
  historyDays: number;
  maxMembers: number;
}

export interface PlanDisplayConfig {
  key: string;
  name: string;
  tier: PlanTier;
  interval?: "monthly" | "yearly";
  amountPaise: number; // in smallest currency unit (paise)
  currency: string;
  displayPrice: string;
  description: string;
  limits: PlanLimits;
  features: string[];
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    maxRepositories: 1,
    maxScansPerMonth: 30,
    maxAiFixDraftsPerMonth: 3,
    historyDays: 7,
    maxMembers: 1,
  },
  PREMIUM: {
    maxRepositories: 10,
    maxScansPerMonth: 1000,
    maxAiFixDraftsPerMonth: 50,
    historyDays: 90,
    maxMembers: 5,
  },
};

/**
 * Display prices for UI presentation.
 * Note: Real billing amounts, intervals, and taxes are determined by Razorpay Plan configurations.
 */
export const PLANS_DISPLAY: Record<PlanKey | "FREE", PlanDisplayConfig> = {
  FREE: {
    key: "FREE",
    name: "Free",
    tier: "FREE",
    amountPaise: 0,
    currency: "INR",
    displayPrice: "₹0",
    description: "Essential automated reviews for hobbyists and single repositories",
    limits: PLAN_LIMITS.FREE,
    features: [
      "1 connected repository",
      "30 automated scans per month",
      "3 AI fix proposals per month",
      "7-day scan & findings history",
      "1 workspace member",
      "Standard community support",
    ],
  },
  PREMIUM_MONTHLY: {
    key: "PREMIUM_MONTHLY",
    name: "Premium (Monthly)",
    tier: "PREMIUM",
    interval: "monthly",
    amountPaise: 79900, // ₹799 in paise
    currency: "INR",
    displayPrice: "₹799 per month",
    description: "Advanced multi-repo scanning and automated remediation for teams",
    limits: PLAN_LIMITS.PREMIUM,
    features: [
      "Up to 10 connected repositories",
      "1,000 automated scans per month",
      "50 AI fix proposals per month",
      "90-day scan & findings history",
      "Up to 5 workspace members",
      "Priority webhook dispatch",
      "One-click PR merge & validation",
    ],
  },
  PREMIUM_YEARLY: {
    key: "PREMIUM_YEARLY",
    name: "Premium (Yearly)",
    tier: "PREMIUM",
    interval: "yearly",
    amountPaise: 799900, // ₹7,999 in paise
    currency: "INR",
    displayPrice: "₹7,999 per year",
    description: "Best value: 2 months free with full team velocity features",
    limits: PLAN_LIMITS.PREMIUM,
    features: [
      "Up to 10 connected repositories",
      "1,000 automated scans per month",
      "50 AI fix proposals per month",
      "90-day scan & findings history",
      "Up to 5 workspace members",
      "Priority webhook dispatch",
      "One-click PR merge & validation",
      "Save ~16% compared to monthly",
    ],
  },
};
