/**
 * status.ts
 * Implements real-time pull request status, merge readiness calculation,
 * and CI checks aggregation with a 15-second in-memory cache.
 */

import { prisma } from "../db.js";
import { githubApp } from "../github/app.js";
import { SecurityGuardError } from "../github/guards.js";

export interface NormalizedCheckItem {
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

export type MergeReadiness =
  | "ready"
  | "checks_failing"
  | "checks_pending"
  | "conflicts"
  | "blocked"
  | "behind"
  | "merged"
  | "closed"
  | "unknown";

export interface PullRequestLiveStatus {
  pullRequest: any;
  liveStatus: {
    mergeReadiness: MergeReadiness;
    mergeable: boolean | null;
    mergeableState: string | null;
    headSha: string;
    branchHeadChanged: boolean;
    overallChecks: "SUCCESS" | "FAILURE" | "PENDING" | "NONE";
    checks: NormalizedCheckItem[];
  };
}

interface CacheEntry {
  timestamp: number;
  data: PullRequestLiveStatus;
}

const statusCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15_000;

export function clearStatusCache(pullRequestId?: string): void {
  if (pullRequestId) {
    statusCache.delete(pullRequestId);
  } else {
    statusCache.clear();
  }
}

export async function getPullRequestStatus(
  pullRequestId: string,
  workspaceId: string
): Promise<PullRequestLiveStatus> {
  const cached = statusCache.get(pullRequestId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const pr = await prisma.pullRequest.findFirst({
    where: {
      id: pullRequestId,
      workspaceId,
    },
    include: {
      repository: {
        include: {
          installation: true,
        },
      },
      finding: {
        select: {
          id: true,
          title: true,
          tool: true,
          ruleId: true,
          severity: true,
          filePath: true,
        },
      },
      fixProposal: {
        select: {
          id: true,
          startLine: true,
          endLine: true,
          explanation: true,
        },
      },
    },
  });

  if (!pr) {
    throw new SecurityGuardError("NOT_FOUND", "Pull request not found");
  }

  if (!pr.githubNumber || pr.status === "FAILED") {
    const result: PullRequestLiveStatus = {
      pullRequest: pr,
      liveStatus: {
        mergeReadiness: pr.status === "FAILED" ? "blocked" : "unknown",
        mergeable: false,
        mergeableState: null,
        headSha: pr.headSha || "",
        branchHeadChanged: false,
        overallChecks: "NONE",
        checks: [],
      },
    };
    return result;
  }

  const repo = pr.repository;
  if (!repo.installation) {
    throw new SecurityGuardError(
      "REPOSITORY_NOT_CONNECTED",
      "Repository GitHub installation is not connected"
    );
  }

  const slashIndex = repo.fullName.indexOf("/");
  const owner = repo.fullName.slice(0, slashIndex);
  const repoName = repo.fullName.slice(slashIndex + 1);

  const octokit = await githubApp.getInstallationOctokit(
    Number(repo.installation.installationId)
  );

  // 1. Fetch GitHub PR
  let ghPr: any;
  try {
    const res = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: pr.githubNumber,
    });
    ghPr = res.data;
  } catch (err: any) {
    if (err.status === 404) {
      throw new SecurityGuardError(
        "NOT_FOUND",
        "Pull request not found on GitHub"
      );
    }
    throw err;
  }

  const headSha = ghPr.head.sha;
  const branchHeadChanged = Boolean(pr.headSha && pr.headSha !== headSha);

  // 2. Fetch Check Runs and Commit Statuses
  const [checkRunsRes, statusesRes] = await Promise.allSettled([
    octokit.rest.checks.listForRef({
      owner,
      repo: repoName,
      ref: headSha,
    }),
    octokit.rest.repos.getCombinedStatusForRef({
      owner,
      repo: repoName,
      ref: headSha,
    }),
  ]);

  const checks: NormalizedCheckItem[] = [];

  if (checkRunsRes.status === "fulfilled") {
    for (const run of checkRunsRes.value.data.check_runs) {
      checks.push({
        id: `check-${run.id}`,
        name: run.name,
        type: "check_run",
        status: run.status as any,
        conclusion: run.conclusion as any,
        url: run.html_url ?? undefined,
      });
    }
  }

  if (statusesRes.status === "fulfilled") {
    for (const st of statusesRes.value.data.statuses) {
      const isCompleted = st.state === "success" || st.state === "failure" || st.state === "error";
      checks.push({
        id: `status-${st.id}`,
        name: st.context,
        type: "status",
        status: isCompleted ? "completed" : "pending",
        conclusion:
          st.state === "success"
            ? "success"
            : st.state === "failure" || st.state === "error"
            ? "failure"
            : null,
        url: st.target_url ?? undefined,
        description: st.description ?? undefined,
      });
    }
  }

  // 3. Compute overall checks status
  let overallChecks: "SUCCESS" | "FAILURE" | "PENDING" | "NONE" = "NONE";
  if (checks.length > 0) {
    const hasFailure = checks.some(
      (c) =>
        c.conclusion === "failure" ||
        c.conclusion === "timed_out" ||
        c.conclusion === "cancelled"
    );
    const hasPending = checks.some(
      (c) => c.status === "queued" || c.status === "in_progress" || c.status === "pending"
    );

    if (hasFailure) {
      overallChecks = "FAILURE";
    } else if (hasPending) {
      overallChecks = "PENDING";
    } else {
      overallChecks = "SUCCESS";
    }
  }

  // 4. Compute mergeReadiness
  let mergeReadiness: MergeReadiness = "unknown";
  if (ghPr.merged || pr.status === "MERGED") {
    mergeReadiness = "merged";
  } else if (ghPr.state === "closed" || pr.status === "CLOSED") {
    mergeReadiness = "closed";
  } else if (ghPr.mergeable === false) {
    if (ghPr.mergeable_state === "dirty") {
      mergeReadiness = "conflicts";
    } else if (ghPr.mergeable_state === "behind") {
      mergeReadiness = "behind";
    } else {
      mergeReadiness = "blocked";
    }
  } else if (ghPr.mergeable_state === "unstable" || overallChecks === "FAILURE") {
    mergeReadiness = "checks_failing";
  } else if (overallChecks === "PENDING") {
    mergeReadiness = "checks_pending";
  } else if (ghPr.mergeable_state === "clean" || ghPr.mergeable_state === "has_hooks" || ghPr.mergeable === true) {
    mergeReadiness = "ready";
  } else if (ghPr.mergeable_state === "blocked") {
    mergeReadiness = "blocked";
  }

  // 5. Update DB if state changed on GitHub
  let dbStatus = pr.status;
  let mergedAt = pr.mergedAt;
  let closedAt = pr.closedAt;

  if (ghPr.state === "closed") {
    if (ghPr.merged) {
      dbStatus = "MERGED";
      mergedAt = ghPr.merged_at ? new Date(ghPr.merged_at) : new Date();
    } else {
      dbStatus = "CLOSED";
      closedAt = ghPr.closed_at ? new Date(ghPr.closed_at) : new Date();
    }
  } else if (ghPr.state === "open" && pr.status !== "OPEN") {
    dbStatus = "OPEN";
  }

  const updatedPr = await prisma.pullRequest.update({
    where: { id: pr.id },
    data: {
      status: dbStatus,
      headSha,
      mergedAt,
      closedAt,
      lastSyncedAt: new Date(),
    },
    include: {
      repository: {
        select: {
          id: true,
          fullName: true,
          defaultBranch: true,
        },
      },
      finding: {
        select: {
          id: true,
          title: true,
          tool: true,
          ruleId: true,
          severity: true,
          filePath: true,
        },
      },
      fixProposal: {
        select: {
          id: true,
          startLine: true,
          endLine: true,
          explanation: true,
        },
      },
    },
  });

  const response: PullRequestLiveStatus = {
    pullRequest: updatedPr,
    liveStatus: {
      mergeReadiness,
      mergeable: ghPr.mergeable,
      mergeableState: ghPr.mergeable_state,
      headSha,
      branchHeadChanged,
      overallChecks,
      checks,
    },
  };

  statusCache.set(pullRequestId, {
    timestamp: Date.now(),
    data: response,
  });

  return response;
}
