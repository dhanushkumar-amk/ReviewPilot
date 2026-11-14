import { NonRetriableError } from "inngest";
import { prisma } from "../../db.js";
import { githubApp } from "../../github/app.js";
import { inngest } from "../client.js";
import {
  cleanStaleTempDirs,
  runScan,
  ScannerExecutionError,
} from "../../scanner/run-scan.js";
import { ScannerArchiveError } from "../../scanner/archive.js";

export interface ScanEventData {
  deliveryId: string;
  workspaceId: string;
  repositoryId: string;
  installationId: string;
  branch: string;
  commitSha: string;
  senderLogin?: string;
  receivedAt: string;
  trigger?: "PUSH" | "MANUAL";
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

// Validation helpers for subprocess & URL safety
const COMMIT_SHA_REGEX = /^[0-9a-f]{40}$/;
const GITHUB_NAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

export function isValidCommitSha(sha: string): boolean {
  return typeof sha === "string" && COMMIT_SHA_REGEX.test(sha);
}

export function isValidOwnerOrRepo(name: string): boolean {
  return (
    typeof name === "string" &&
    name.length > 0 &&
    name.length <= 100 &&
    GITHUB_NAME_REGEX.test(name) &&
    !name.startsWith("-") &&
    !name.startsWith(".")
  );
}

export const scanRepository = inngest.createFunction(
  {
    id: "scan-repository",
    name: "Scan Repository",
    triggers: [
      { event: "github/push.received" },
      { event: "github/scan.requested" },
    ],
    debounce: {
      key: "event.data.repositoryId",
      period: "10s",
      timeout: "60s",
    },
    concurrency: [{ key: "event.data.repositoryId", limit: 1 }],
    retries: 3,
    onFailure: async ({ event, step }) => {
      const originalEvent = event.data.event as
        | { data?: Partial<ScanEventData> }
        | undefined;
      const repositoryId = originalEvent?.data?.repositoryId;
      const commitSha = originalEvent?.data?.commitSha;

      if (!repositoryId || !commitSha) {
        return;
      }

      const rawErr = event.data.error;
      const msg = typeof rawErr === "object" && rawErr ? (rawErr as any).message || "" : "";

      let errorCode = "INTERNAL";
      if (msg.includes("REPO_TOO_LARGE")) errorCode = "REPO_TOO_LARGE";
      else if (msg.includes("TOO_MANY_FILES")) errorCode = "TOO_MANY_FILES";
      else if (msg.includes("UNSAFE_ARCHIVE")) errorCode = "UNSAFE_ARCHIVE";
      else if (msg.includes("DOWNLOAD_FAILED")) errorCode = "DOWNLOAD_FAILED";
      else if (msg.includes("TIMEOUT")) errorCode = "TIMEOUT";
      else if (msg.includes("ANALYZERS_FAILED")) errorCode = "ANALYZERS_FAILED";

      await step.run("mark-scan-failed", async () => {
        await prisma.scan.updateMany({
          where: {
            repositoryId,
            commitSha,
            status: { not: "COMPLETED" },
          },
          data: {
            status: "FAILED",
            phase: "failed",
            errorCode,
            finishedAt: new Date(),
          },
        });
      });
    },
  },
  async ({ event, step, logger }) => {
    const data = event.data as ScanEventData;
    const trigger =
      event.name === "github/scan.requested" || data.trigger === "MANUAL"
        ? "MANUAL"
        : "PUSH";

    // Clean any stale temp directories on invocation
    await cleanStaleTempDirs().catch(() => {});

    // Step 1: Start scan
    const startResult = await step.run("start-scan", async () => {
      if (!isValidCommitSha(data.commitSha)) {
        throw new NonRetriableError("UNSAFE_ARCHIVE: Invalid commit SHA format");
      }

      const repo = await prisma.repository.findUnique({
        where: { id: data.repositoryId },
        include: {
          installation: {
            select: {
              id: true,
              installationId: true,
              suspendedAt: true,
            },
          },
        },
      });

      if (
        !repo ||
        repo.status !== "CONNECTED" ||
        repo.installation.suspendedAt !== null
      ) {
        return {
          skipped: true as const,
          reason: !repo
            ? "repository_not_found"
            : repo.status !== "CONNECTED"
              ? "repository_not_connected"
              : "installation_suspended",
          scanId: null,
          fullName: repo?.fullName ?? null,
        };
      }

      const slashIndex = repo.fullName.indexOf("/");
      const owner = repo.fullName.slice(0, slashIndex);
      const repoName = repo.fullName.slice(slashIndex + 1);

      if (!isValidOwnerOrRepo(owner) || !isValidOwnerOrRepo(repoName)) {
        throw new NonRetriableError("UNSAFE_ARCHIVE: Invalid owner or repository name");
      }

      const existing = await prisma.scan.findUnique({
        where: {
          repositoryId_commitSha: {
            repositoryId: repo.id,
            commitSha: data.commitSha,
          },
        },
      });

      if (existing?.status === "COMPLETED") {
        return {
          skipped: true as const,
          reason: "already_completed",
          scanId: existing.id,
          fullName: repo.fullName,
        };
      }

      const now = new Date();
      let scanId: string;

      if (existing) {
        const updated = await prisma.scan.update({
          where: { id: existing.id },
          data: {
            status: "RUNNING",
            phase: "starting",
            progress: 5,
            startedAt: existing.startedAt ?? now,
            finishedAt: null,
            errorCode: null,
          },
          select: { id: true },
        });
        scanId = updated.id;
      } else {
        const created = await prisma.scan.create({
          data: {
            workspaceId: repo.workspaceId,
            repositoryId: repo.id,
            branch: data.branch,
            commitSha: data.commitSha,
            trigger,
            status: "RUNNING",
            phase: "starting",
            progress: 5,
            startedAt: now,
          },
          select: { id: true },
        });
        scanId = created.id;
      }

      return {
        skipped: false as const,
        reason: null,
        scanId,
        fullName: repo.fullName,
        owner,
        repoName,
        installationId: Number(repo.installation.installationId),
      };
    });

    if (startResult.skipped || !startResult.scanId) {
      logger.info(
        {
          repositoryId: data.repositoryId,
          fullName: startResult.fullName,
          commitSha: shortSha(data.commitSha),
          reason: startResult.reason,
        },
        "Scan skipped",
      );
      return { status: "skipped", reason: startResult.reason };
    }

    // Step 2: Analyze
    const scanSummary = await step.run("analyze", async () => {
      const octokit = await githubApp.getInstallationOctokit(
        startResult.installationId!,
      );

      try {
        return await runScan({
          scanId: startResult.scanId!,
          workspaceId: data.workspaceId,
          repositoryId: data.repositoryId,
          owner: startResult.owner!,
          repo: startResult.repoName!,
          sha: data.commitSha,
          octokit,
        });
      } catch (err: any) {
        if (err instanceof ScannerArchiveError || err instanceof ScannerExecutionError) {
          if (
            err.code === "REPO_TOO_LARGE" ||
            err.code === "TOO_MANY_FILES" ||
            err.code === "UNSAFE_ARCHIVE" ||
            err.code === "ANALYZERS_FAILED"
          ) {
            throw new NonRetriableError(`${err.code}: ${err.message}`);
          }
          throw err;
        }
        throw err;
      }
    });

    // Step 3: Finish scan
    await step.run("finish-scan", async () => {
      await prisma.scan.update({
        where: { id: startResult.scanId! },
        data: {
          status: "COMPLETED",
          phase: "completed",
          progress: 100,
          finishedAt: new Date(),
          durationMs: scanSummary.durationMs,
          findingsCount: scanSummary.findingsCount,
          analyzers: scanSummary.analyzers as any,
          errorCode: null,
        },
      });
    });

    logger.info(
      {
        scanId: startResult.scanId,
        repositoryId: data.repositoryId,
        fullName: startResult.fullName,
        commitSha: shortSha(data.commitSha),
        durationMs: scanSummary.durationMs,
        findingsCount: scanSummary.findingsCount,
      },
      "Scan completed successfully",
    );

    return {
      status: "completed",
      scanId: startResult.scanId,
      findingsCount: scanSummary.findingsCount,
      durationMs: scanSummary.durationMs,
    };
  },
);
