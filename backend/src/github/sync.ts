import { prisma } from "../db.js";
import type { Prisma, RepoStatus } from "../generated/prisma/client.js";
import { githubApp } from "./app.js";

export class GithubSyncError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 502) {
    super(message);
    this.name = "GithubSyncError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export interface SyncableInstallation {
  id: string;
  workspaceId: string;
  installationId: bigint;
}

export interface SyncInstallationResult {
  synced: number;
  removed: number;
  lastSyncedAt: Date;
}

function extractHttpStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") {
      return status;
    }
  }
  return null;
}

function nextSyncedStatus(current: RepoStatus): RepoStatus {
  if (current === "CONNECTED" || current === "DISCONNECTED") {
    return current;
  }
  return "AVAILABLE";
}

export async function syncInstallation(
  installation: SyncableInstallation
): Promise<SyncInstallationResult> {
  let ghRepos: Array<{
    id: number;
    full_name: string;
    default_branch?: string;
    private: boolean;
  }>;

  try {
    const installationOctokit = await githubApp.getInstallationOctokit(
      Number(installation.installationId)
    );
    ghRepos = await installationOctokit.paginate("GET /installation/repositories", {
      per_page: 100,
    });
  } catch (error) {
    const status = extractHttpStatus(error);
    if (status === 404 || status === 401) {
      await prisma.githubInstallation.updateMany({
        where: {
          id: installation.id,
          workspaceId: installation.workspaceId,
        },
        data: {
          suspendedAt: new Date(),
        },
      });
      throw new GithubSyncError(
        "GITHUB_INSTALLATION_UNAVAILABLE",
        "GitHub installation is suspended or no longer installed on GitHub.",
        409
      );
    }
    throw error;
  }

  const now = new Date();

  const { synced, removed } = await prisma.$transaction(
    async (tx) => {
      const existingRepos = await tx.repository.findMany({
        where: {
          workspaceId: installation.workspaceId,
          provider: "GITHUB",
        },
        select: {
          id: true,
          externalId: true,
          installationId: true,
          fullName: true,
          defaultBranch: true,
          isPrivate: true,
          status: true,
        },
      });

      const existingByExternalId = new Map(
        existingRepos.map((repo) => [repo.externalId, repo])
      );
      const seenExternalIds = new Set<string>();
      const toCreate: Prisma.RepositoryCreateManyInput[] = [];
      const toUpdate: Array<{
        id: string;
        installationId: string;
        fullName: string;
        defaultBranch: string;
        isPrivate: boolean;
        status: RepoStatus;
      }> = [];

      for (const ghRepo of ghRepos) {
        const externalId = String(ghRepo.id);
        if (seenExternalIds.has(externalId)) {
          continue;
        }
        seenExternalIds.add(externalId);

        const defaultBranch = ghRepo.default_branch?.trim() || "main";
        const isPrivate = Boolean(ghRepo.private);
        const existing = existingByExternalId.get(externalId);

        if (!existing) {
          toCreate.push({
            workspaceId: installation.workspaceId,
            installationId: installation.id,
            provider: "GITHUB",
            externalId,
            fullName: ghRepo.full_name,
            defaultBranch,
            isPrivate,
            status: "AVAILABLE",
          });
        } else {
          const nextStatus = nextSyncedStatus(existing.status);
          if (
            existing.installationId !== installation.id ||
            existing.fullName !== ghRepo.full_name ||
            existing.defaultBranch !== defaultBranch ||
            existing.isPrivate !== isPrivate ||
            existing.status !== nextStatus
          ) {
            toUpdate.push({
              id: existing.id,
              installationId: installation.id,
              fullName: ghRepo.full_name,
              defaultBranch,
              isPrivate,
              status: nextStatus,
            });
          }
        }
      }

      const CREATE_BATCH_SIZE = 200;
      for (let i = 0; i < toCreate.length; i += CREATE_BATCH_SIZE) {
        await tx.repository.createMany({
          data: toCreate.slice(i, i + CREATE_BATCH_SIZE),
          skipDuplicates: true,
        });
      }

      const UPDATE_BATCH_SIZE = 25;
      for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + UPDATE_BATCH_SIZE);
        await Promise.all(
          batch.map((item) =>
            tx.repository.update({
              where: { id: item.id },
              data: {
                installationId: item.installationId,
                fullName: item.fullName,
                defaultBranch: item.defaultBranch,
                isPrivate: item.isPrivate,
                status: item.status,
              },
            })
          )
        );
      }

      const removedIds = existingRepos
        .filter(
          (repo) =>
            repo.installationId === installation.id &&
            !seenExternalIds.has(repo.externalId) &&
            repo.status !== "REMOVED"
        )
        .map((repo) => repo.id);

      if (removedIds.length > 0) {
        await tx.repository.updateMany({
          where: {
            id: { in: removedIds },
            workspaceId: installation.workspaceId,
          },
          data: { status: "REMOVED" },
        });
      }

      await tx.githubInstallation.update({
        where: { id: installation.id },
        data: {
          lastSyncedAt: now,
          suspendedAt: null,
        },
      });

      return {
        synced: seenExternalIds.size,
        removed: removedIds.length,
      };
    },
    {
      maxWait: 10_000,
      timeout: 60_000,
    }
  );

  return {
    synced,
    removed,
    lastSyncedAt: now,
  };
}
