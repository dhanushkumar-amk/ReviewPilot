/**
 * merge.ts
 * Implements human-gated merge operation for ReviewPilot pull requests.
 * Enforces role restriction (owner/admin), head SHA verification, branch protection respect,
 * failing checks confirmation, and cleanup of the fix branch after merge.
 */

import { prisma } from "../db.js";
import { githubApp } from "../github/app.js";
import { assertSafeBranchName, SecurityGuardError } from "../github/guards.js";

export interface MergePullRequestOptions {
  pullRequestId: string;
  user: {
    id: string;
    role?: string;
  };
  workspace: {
    id: string;
  };
  expectedHeadSha: string;
  method?: "merge" | "squash" | "rebase";
  confirmFailingChecks?: boolean;
}

export async function mergePullRequest(options: MergePullRequestOptions) {
  const {
    pullRequestId,
    user,
    workspace,
    expectedHeadSha,
    method = "squash",
    confirmFailingChecks = false,
  } = options;

  // 1. Role verification: owner or admin only
  if (user.role !== "owner" && user.role !== "admin") {
    throw new SecurityGuardError(
      "FORBIDDEN",
      "Only workspace owners or admins can merge pull requests"
    );
  }

  // 2. Load PR in workspace
  const pr = await prisma.pullRequest.findFirst({
    where: {
      id: pullRequestId,
      workspaceId: workspace.id,
    },
    include: {
      repository: {
        include: {
          installation: true,
        },
      },
    },
  });

  if (!pr) {
    throw new SecurityGuardError("NOT_FOUND", "Pull request not found");
  }

  if (pr.status === "MERGED") {
    return { pullRequest: pr, alreadyMerged: true };
  }

  if (pr.status !== "OPEN" || !pr.githubNumber) {
    throw new SecurityGuardError(
      "PR_NOT_OPEN",
      `Pull request is currently ${pr.status} and cannot be merged`
    );
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

  // 3. Fetch PR from GitHub with retry for async mergeable computation
  let ghPr: any;
  let retries = 3;
  while (retries >= 0) {
    const res = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: pr.githubNumber,
    });
    ghPr = res.data;

    if (ghPr.mergeable !== null || retries === 0) {
      break;
    }
    retries--;
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (ghPr.state === "closed" && ghPr.merged) {
    const updatedPr = await prisma.pullRequest.update({
      where: { id: pr.id },
      data: {
        status: "MERGED",
        mergedAt: ghPr.merged_at ? new Date(ghPr.merged_at) : new Date(),
        lastSyncedAt: new Date(),
      },
    });
    return { pullRequest: updatedPr, alreadyMerged: true };
  }

  // 4. Verify head SHA matches client expectedHeadSha (HEAD_CHANGED gate)
  if (!expectedHeadSha || ghPr.head.sha !== expectedHeadSha) {
    throw new SecurityGuardError(
      "HEAD_CHANGED",
      "Branch head SHA has changed on GitHub. Please review the updated commit before merging."
    );
  }

  // 5. Evaluate mergeable state
  const mergeableState = ghPr.mergeable_state; // "clean", "unstable", "dirty", "blocked", "behind", "draft", etc.

  if (ghPr.mergeable === false) {
    if (mergeableState === "dirty") {
      throw new SecurityGuardError(
        "MERGE_CONFLICT",
        "Pull request has merge conflicts that must be resolved on GitHub"
      );
    }
    if (mergeableState === "blocked") {
      throw new SecurityGuardError(
        "MERGE_BLOCKED",
        "Merge is blocked by repository branch protection rules or required reviews"
      );
    }
    if (mergeableState === "behind") {
      throw new SecurityGuardError(
        "BRANCH_BEHIND",
        "Branch is behind the base branch. Update the branch before merging."
      );
    }
    if (mergeableState === "draft") {
      throw new SecurityGuardError("PR_IS_DRAFT", "Pull request is in draft mode");
    }
    throw new SecurityGuardError(
      "MERGE_BLOCKED",
      `Pull request cannot be merged (state: ${mergeableState || "unmergeable"})`
    );
  }

  if (mergeableState === "unstable" && !confirmFailingChecks) {
    throw new SecurityGuardError(
      "MERGE_UNSTABLE",
      "CI checks are currently failing. Explicit confirmation is required to merge."
    );
  }

  // 6. Execute merge
  try {
    await octokit.rest.pulls.merge({
      owner,
      repo: repoName,
      pull_number: pr.githubNumber,
      sha: expectedHeadSha,
      merge_method: method,
    });
  } catch (err: any) {
    if (err.status === 405) {
      throw new SecurityGuardError(
        "MERGE_METHOD_NOT_ALLOWED",
        `Merge method '${method}' is not allowed for this repository`
      );
    }
    if (err.status === 409) {
      throw new SecurityGuardError(
        "HEAD_CHANGED",
        "Head commit has changed during merge attempt. Refresh and try again."
      );
    }
    throw err;
  }

  // 7. Update PR in DB
  const updatedPr = await prisma.pullRequest.update({
    where: { id: pr.id },
    data: {
      status: "MERGED",
      mergedAt: new Date(),
      mergedByUserId: user.id,
      lastSyncedAt: new Date(),
    },
  });

  // 8. Delete branch (best effort, strictly guarded)
  try {
    assertSafeBranchName(pr.branchName);
    await octokit.rest.git.deleteRef({
      owner,
      repo: repoName,
      ref: `heads/${pr.branchName}`,
    });
  } catch {
    // Branch may be automatically deleted by GitHub or already removed
  }

  // 9. Audit log
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "PULL_REQUEST_MERGED",
      targetType: "PULL_REQUEST",
      targetId: pr.id,
      metadata: {
        prNumber: pr.githubNumber,
        branchName: pr.branchName,
        method,
        headSha: expectedHeadSha,
      },
    },
  });

  return { pullRequest: updatedPr, merged: true };
}
