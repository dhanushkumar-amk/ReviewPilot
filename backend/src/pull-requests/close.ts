/**
 * close.ts
 * Implements closing a pull request and deleting the fix branch.
 */

import { prisma } from "../db.js";
import { githubApp } from "../github/app.js";
import { assertSafeBranchName, SecurityGuardError } from "../github/guards.js";

export interface ClosePullRequestOptions {
  pullRequestId: string;
  user: {
    id: string;
    role?: string;
  };
  workspace: {
    id: string;
  };
}

export async function closePullRequest(options: ClosePullRequestOptions) {
  const { pullRequestId, user, workspace } = options;

  if (user.role !== "owner" && user.role !== "admin") {
    throw new SecurityGuardError(
      "FORBIDDEN",
      "Only workspace owners or admins can close pull requests"
    );
  }

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

  if (pr.status === "CLOSED" || pr.status === "MERGED") {
    return { pullRequest: pr, alreadyClosed: true };
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

  if (pr.githubNumber) {
    try {
      await octokit.rest.pulls.update({
        owner,
        repo: repoName,
        pull_number: pr.githubNumber,
        state: "closed",
      });
    } catch {
      // Ignore if already closed on GitHub
    }
  }

  // Delete branch (guarded)
  try {
    assertSafeBranchName(pr.branchName);
    await octokit.rest.git.deleteRef({
      owner,
      repo: repoName,
      ref: `heads/${pr.branchName}`,
    });
  } catch {
    // Branch may not exist or already deleted
  }

  const updatedPr = await prisma.pullRequest.update({
    where: { id: pr.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      lastSyncedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: user.id,
      action: "PULL_REQUEST_CLOSED",
      targetType: "PULL_REQUEST",
      targetId: pr.id,
      metadata: {
        prNumber: pr.githubNumber,
        branchName: pr.branchName,
      },
    },
  });

  return { pullRequest: updatedPr, closed: true };
}
