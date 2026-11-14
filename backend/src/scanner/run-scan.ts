import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Octokit } from "octokit";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { runEslintAnalyzer } from "./analyzers/eslint.js";
import { runGitleaksAnalyzer } from "./analyzers/gitleaks.js";
import { runHygieneAnalyzer } from "./analyzers/hygiene.js";
import { runSemgrepAnalyzer } from "./analyzers/semgrep.js";
import { downloadAndExtract } from "./archive.js";
import type { FindingSeverity, FindingTool, NormalizedFinding } from "./normalize.js";
import { persistFindings } from "./persist.js";

export interface ScanContext {
  scanId: string;
  workspaceId: string;
  repositoryId: string;
  owner: string;
  repo: string;
  sha: string;
  octokit: Octokit;
}

export interface AnalyzerSummary {
  tool: FindingTool;
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  durationMs: number;
  findings: number;
  note?: string;
}

export interface ScanRunSummary {
  findingsCount: number;
  durationMs: number;
  analyzers: AnalyzerSummary[];
}

export class ScannerExecutionError extends Error {
  constructor(
    public readonly code:
      | "REPO_TOO_LARGE"
      | "TOO_MANY_FILES"
      | "UNSAFE_ARCHIVE"
      | "DOWNLOAD_FAILED"
      | "ANALYZERS_FAILED"
      | "TIMEOUT"
      | "INTERNAL",
    message: string,
  ) {
    super(message);
    this.name = "ScannerExecutionError";
  }
}

// Clean up stale reviewpilot-scan-* temp dirs on startup / periodically
export async function cleanStaleTempDirs(): Promise<void> {
  try {
    const tmpBase = os.tmpdir();
    const entries = await fs.readdir(tmpBase, { withFileTypes: true });
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("reviewpilot-scan-")) {
        const full = path.join(tmpBase, entry.name);
        try {
          const stats = await fs.stat(full);
          if (stats.mtimeMs < oneHourAgo) {
            await safeRemoveDir(full);
          }
        } catch {}
      }
    }
  } catch {}
}

export async function safeRemoveDir(dirPath: string): Promise<void> {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      return;
    } catch (err: any) {
      if (
        (err.code === "EBUSY" || err.code === "EPERM") &&
        attempt < maxRetries - 1
      ) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      } else {
        break;
      }
    }
  }
}

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

export async function runScan(ctx: ScanContext): Promise<ScanRunSummary> {
  const startTime = Date.now();
  const baseTmp = os.tmpdir();
  const scanTempDir = path.join(
    baseTmp,
    `reviewpilot-scan-${ctx.scanId}-${Date.now()}`,
  );

  const updateScan = async (phase: string, progress: number) => {
    await prisma.scan.update({
      where: { id: ctx.scanId },
      data: { phase, progress },
    });
  };

  await fs.mkdir(scanTempDir, { recursive: true, mode: 0o700 });
  const repoExtractDir = path.join(scanTempDir, "repo");
  await fs.mkdir(repoExtractDir, { recursive: true });

  try {
    // 1. Starting phase (5%)
    await updateScan("starting", 5);

    // 2. Downloading & Extracting phase
    await updateScan("downloading", 15);
    const extractResult = await downloadAndExtract({
      octokit: ctx.octokit,
      owner: ctx.owner,
      repo: ctx.repo,
      sha: ctx.sha,
      destDir: repoExtractDir,
      limits: {
        maxArchiveMb: env.SCAN_MAX_ARCHIVE_MB || 50,
        maxFiles: env.SCAN_MAX_FILES || 20000,
        maxFileKb: env.SCAN_MAX_FILE_KB || 512,
      },
    });

    await updateScan("extracting", 30);
    await prisma.scan.update({
      where: { id: ctx.scanId },
      data: { filesScanned: extractResult.fileCount },
    });

    // 3. Analyzing phase (40..80%)
    await updateScan("analyzing", 40);

    const analyzersSummary: AnalyzerSummary[] = [];
    const allFindings: NormalizedFinding[] = [];
    const completedTools: FindingTool[] = [];

    // Run analyzers concurrently with Promise.allSettled
    const [eslintRes, gitleaksRes, semgrepRes, hygieneRes] = await Promise.allSettled([
      (async () => {
        const start = Date.now();
        const res = await runEslintAnalyzer(repoExtractDir, scanTempDir);
        return { ...res, durationMs: Date.now() - start };
      })(),
      (async () => {
        const start = Date.now();
        const res = await runGitleaksAnalyzer(repoExtractDir, scanTempDir);
        return { ...res, durationMs: Date.now() - start };
      })(),
      (async () => {
        const start = Date.now();
        const res = await runSemgrepAnalyzer(
          repoExtractDir,
          scanTempDir,
          env.SCAN_MAX_FILE_KB || 512,
        );
        return { ...res, durationMs: Date.now() - start };
      })(),
      (async () => {
        const start = Date.now();
        const res = await runHygieneAnalyzer(repoExtractDir);
        return { ...res, durationMs: Date.now() - start };
      })(),
    ]);

    // Process ESLint
    if (eslintRes.status === "fulfilled" && !eslintRes.value.error) {
      analyzersSummary.push({
        tool: "ESLINT",
        status: "COMPLETED",
        durationMs: eslintRes.value.durationMs,
        findings: eslintRes.value.findings.length,
      });
      allFindings.push(...eslintRes.value.findings);
      completedTools.push("ESLINT");
    } else {
      analyzersSummary.push({
        tool: "ESLINT",
        status: "FAILED",
        durationMs: eslintRes.status === "fulfilled" ? eslintRes.value.durationMs : 0,
        findings: 0,
        note: "analyzer error",
      });
    }

    // Process Gitleaks
    if (gitleaksRes.status === "fulfilled") {
      const g = gitleaksRes.value;
      if (g.skipped) {
        analyzersSummary.push({
          tool: "GITLEAKS",
          status: "SKIPPED",
          durationMs: g.durationMs,
          findings: 0,
          note: g.note || "gitleaks not installed",
        });
      } else if (!g.error) {
        analyzersSummary.push({
          tool: "GITLEAKS",
          status: "COMPLETED",
          durationMs: g.durationMs,
          findings: g.findings.length,
        });
        allFindings.push(...g.findings);
        completedTools.push("GITLEAKS");
      } else {
        analyzersSummary.push({
          tool: "GITLEAKS",
          status: "FAILED",
          durationMs: g.durationMs,
          findings: 0,
          note: "analyzer error",
        });
      }
    } else {
      analyzersSummary.push({
        tool: "GITLEAKS",
        status: "FAILED",
        durationMs: 0,
        findings: 0,
        note: "analyzer error",
      });
    }

    // Process Semgrep
    if (semgrepRes.status === "fulfilled") {
      const s = semgrepRes.value;
      if (s.skipped) {
        analyzersSummary.push({
          tool: "SEMGREP",
          status: "SKIPPED",
          durationMs: s.durationMs,
          findings: 0,
          note: s.note || "semgrep not installed",
        });
      } else if (!s.error) {
        analyzersSummary.push({
          tool: "SEMGREP",
          status: "COMPLETED",
          durationMs: s.durationMs,
          findings: s.findings.length,
        });
        allFindings.push(...s.findings);
        completedTools.push("SEMGREP");
      } else {
        analyzersSummary.push({
          tool: "SEMGREP",
          status: "FAILED",
          durationMs: s.durationMs,
          findings: 0,
          note: "analyzer error",
        });
      }
    } else {
      analyzersSummary.push({
        tool: "SEMGREP",
        status: "FAILED",
        durationMs: 0,
        findings: 0,
        note: "analyzer error",
      });
    }

    // Process Repo Hygiene findings
    if (hygieneRes.status === "fulfilled" && hygieneRes.value.findings.length > 0) {
      allFindings.push(...hygieneRes.value.findings);
    }

    // Check if every available analyzer failed
    const hasAnySuccess = analyzersSummary.some((a) => a.status === "COMPLETED");
    const allWereSkippedOrFailed = analyzersSummary.every(
      (a) => a.status === "FAILED" || a.status === "SKIPPED",
    );
    if (!hasAnySuccess && allWereSkippedOrFailed) {
      const anyInstalledFailed = analyzersSummary.some((a) => a.status === "FAILED");
      if (anyInstalledFailed) {
        throw new ScannerExecutionError("ANALYZERS_FAILED", "All analyzers failed to run");
      }
    }

    await updateScan("saving", 90);

    // Cap at 5000 findings per scan keeping highest severities
    let finalFindings = allFindings;
    if (finalFindings.length > 5000) {
      finalFindings.sort(
        (a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0),
      );
      finalFindings = finalFindings.slice(0, 5000);
      for (const a of analyzersSummary) {
        a.note = a.note ? `${a.note}, truncated` : "truncated";
      }
    }

    await persistFindings({
      workspaceId: ctx.workspaceId,
      repositoryId: ctx.repositoryId,
      scanId: ctx.scanId,
      repoDir: repoExtractDir,
      findings: finalFindings,
      completedTools,
    });

    const durationMs = Date.now() - startTime;

    return {
      findingsCount: finalFindings.length,
      durationMs,
      analyzers: analyzersSummary,
    };
  } finally {
    await safeRemoveDir(scanTempDir);
  }
}

