"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/src/lib/api";

export interface PullRequestItem {
  id: string;
  workspaceId: string;
  repositoryId: string;
  findingId: string;
  fixProposalId: string;
  validationId: string | null;
  githubNumber: number | null;
  htmlUrl: string | null;
  branchName: string;
  baseBranch: string;
  headSha: string | null;
  title: string;
  status: "CREATING" | "OPEN" | "MERGED" | "CLOSED" | "FAILED";
  errorCode: string | null;
  riskLevel: string;
  testsRun: boolean;
  mergedAt: string | null;
  mergedByUserId: string | null;
  closedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
  repository: {
    id: string;
    fullName: string;
    defaultBranch: string;
  };
  finding: {
    id: string;
    title: string;
    severity: string;
    tool: string;
    ruleId: string;
    filePath: string;
  };
}

export interface CheckItem {
  id: string;
  name: string;
  type: "check_run" | "status";
  status: "queued" | "in_progress" | "completed" | "pending";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "cancelled"
    | "timed_out"
    | "action_required"
    | "skipped"
    | null;
  url?: string;
  description?: string;
}

export interface PullRequestLiveStatus {
  pullRequest: PullRequestItem;
  liveStatus: {
    mergeReadiness:
      | "ready"
      | "checks_failing"
      | "checks_pending"
      | "conflicts"
      | "blocked"
      | "behind"
      | "merged"
      | "closed"
      | "unknown";
    mergeable: boolean | null;
    mergeableState: string | null;
    headSha: string;
    branchHeadChanged: boolean;
    overallChecks: "SUCCESS" | "FAILURE" | "PENDING" | "NONE";
    checks: CheckItem[];
  };
}

export interface PullRequestUsage {
  countToday: number;
  limit: number;
  remaining: number;
}

export function usePullRequests(
  params?: {
    repositoryId?: string;
    status?: string;
    limit?: number;
  },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["pull-requests", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.repositoryId) searchParams.set("repositoryId", params.repositoryId);
      if (params?.status && params.status !== "ALL") searchParams.set("status", params.status);
      if (params?.limit) searchParams.set("limit", String(params.limit));

      const qs = searchParams.toString();
      const url = qs ? `/api/pull-requests?${qs}` : "/api/pull-requests";
      return apiFetch<{ pullRequests: PullRequestItem[]; nextCursor: string | null }>(url);
    },
    enabled: options?.enabled,
  });
}

export function usePullRequest(
  id: string | null | undefined,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: ["pull-request", id],
    queryFn: async () => {
      if (!id) throw new Error("ID required");
      return apiFetch<PullRequestLiveStatus>(`/api/pull-requests/${id}`);
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  });
}

export function usePullRequestUsage() {
  return useQuery({
    queryKey: ["pull-request-usage"],
    queryFn: async () => {
      return apiFetch<PullRequestUsage>("/api/workspace/pull-request-usage");
    },
  });
}

export function useCreatePullRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fixProposalId,
      acknowledgeRisk,
    }: {
      fixProposalId: string;
      acknowledgeRisk?: boolean;
    }) => {
      return apiFetch<{ pullRequest: PullRequestItem; alreadyExists?: boolean }>(
        `/api/fix-proposals/${fixProposalId}/pull-request`,
        {
          method: "POST",
          body: JSON.stringify({ acknowledgeRisk }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pull-request-usage"] });
      queryClient.invalidateQueries({ queryKey: ["fix-proposal"] });
    },
  });
}

export function useMergePullRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pullRequestId,
      expectedHeadSha,
      method = "squash",
      confirmFailingChecks = false,
    }: {
      pullRequestId: string;
      expectedHeadSha: string;
      method?: "merge" | "squash" | "rebase";
      confirmFailingChecks?: boolean;
    }) => {
      return apiFetch<{ pullRequest: PullRequestItem; merged?: boolean; alreadyMerged?: boolean }>(
        `/api/pull-requests/${pullRequestId}/merge`,
        {
          method: "POST",
          body: JSON.stringify({ expectedHeadSha, method, confirmFailingChecks }),
        }
      );
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pull-request", vars.pullRequestId] });
      queryClient.invalidateQueries({ queryKey: ["findings"] });
    },
  });
}

export function useClosePullRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pullRequestId: string) => {
      return apiFetch<{ pullRequest: PullRequestItem; closed?: boolean }>(
        `/api/pull-requests/${pullRequestId}/close`,
        {
          method: "POST",
        }
      );
    },
    onSuccess: (_, pullRequestId) => {
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pull-request", pullRequestId] });
    },
  });
}
