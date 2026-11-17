"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/src/lib/api";

export interface PlanLimitData {
  maxRepositories: number;
  maxScansPerMonth: number;
  maxAiFixDraftsPerMonth: number;
  maxMembers: number;
  historyDays: number;
}

export interface WorkspaceUsageData {
  connectedRepositories: number;
  scansThisMonth: number;
  aiFixDraftsThisMonth: number;
  members: number;
}

export interface EntitlementsData {
  plan: "FREE" | "PREMIUM";
  limits: PlanLimitData;
  usage: WorkspaceUsageData;
  status: string | null;
  planKey: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
}

export interface BillingSubscriptionData {
  status: string;
  planKey: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  graceUntil: string | null;
}

export interface BillingPaymentData {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PlanDisplayInfo {
  name: string;
  amount: number;
  currency: string;
  period: string;
  displayPrice: string;
}

export interface BillingResponse {
  billingEnabled: boolean;
  entitlements: EntitlementsData;
  subscription: BillingSubscriptionData | null;
  payments: BillingPaymentData[];
  canManage: boolean;
  plans: {
    PREMIUM_MONTHLY: PlanDisplayInfo;
    PREMIUM_YEARLY: PlanDisplayInfo;
  };
}

export interface SubscribeResponse {
  subscriptionId: string;
  keyId: string;
  razorpayKeyId?: string;
  planKey: "PREMIUM_MONTHLY" | "PREMIUM_YEARLY";
  prefill?: {
    name?: string;
    email?: string;
  };
}

export const BILLING_QUERY_KEY = ["billing"] as const;

export function useBilling() {
  return useQuery<BillingResponse>({
    queryKey: BILLING_QUERY_KEY,
    queryFn: ({ signal }) => apiFetch<BillingResponse>("/api/billing", { signal }),
    staleTime: 10_000,
  });
}

export function useSubscribe() {
  return useMutation<SubscribeResponse, Error, { planKey: "PREMIUM_MONTHLY" | "PREMIUM_YEARLY" }>({
    mutationFn: (body) =>
      apiFetch<SubscribeResponse>("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

export function useConfirmSubscription() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string; plan: string },
    Error,
    {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    }
  >({
    mutationFn: (body) =>
      apiFetch<{ status: string; plan: string }>("/api/billing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; cancelAtPeriodEnd: boolean }, Error, void>({
    mutationFn: () =>
      apiFetch<{ status: string; cancelAtPeriodEnd: boolean }>("/api/billing/cancel", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
      toast.success("Subscription scheduled for cancellation at the end of the billing period.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel subscription.");
    },
  });
}

export function useSyncBilling() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; plan: string }, Error, void>({
    mutationFn: () =>
      apiFetch<{ status: string; plan: string }>("/api/billing/sync", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLING_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Billing status synchronized with Razorpay.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to sync billing.");
    },
  });
}
