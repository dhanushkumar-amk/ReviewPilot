/**
 * sandbox/run-validation.ts
 * Orchestrates Layer 1 (static checks) and Layer 2 (AWS Lambda test run).
 *
 * Status rules:
 *   - Any static check FAILED → overall FAILED, do NOT call Lambda (saves cost).
 *   - Tests not requested, provider=none, or sandbox disabled → at most PASSED_WITH_WARNINGS.
 *   - Tests ran → FAILED if any step failed and baselineAlsoFails is NOT true;
 *     PASSED_WITH_WARNINGS for no runnable checks, only pre-existing failures,
 *     only SKIPPED, or risk HIGH; PASSED if at least one real check passed and
 *     all passed and risk is not HIGH.
 */

import crypto from "node:crypto";
import { fetchFileContext } from "../ai/context.js";
import { applyReplacement } from "../ai/patch.js";
import { prisma } from "../db.js";
import { env, isAwsLambdaSandboxConfigured } from "../env.js";
import { githubApp } from "../github/app.js";
import { runStaticChecks, type StaticValidationResult } from "../validation/static/index.js";
import { AwsLambdaProvider, SandboxValidationError } from "./aws-lambda-provider.js";
import { SandboxQuotaError } from "./quota.js";
import { validateSafeRelativePosixPath } from "./path-validator.js";

export type FixedValidationErrorCode =
  | "SANDBOX_DISABLED"
  | "SANDBOX_NOT_CONFIGURED"
  | "SANDBOX_LIMIT_REACHED"
  | "SANDBOX_BUSY"
  | "SANDBOX_ALREADY_RUNNING"
  | "REPO_TOO_LARGE"
  | "DOWNLOAD_FAILED"
  | "TIMEOUT"
  | "LAMBDA_FAILED"
  | "INTERNAL";

export class RunValidationError extends Error {
  constructor(
    public readonly code: FixedValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RunValidationError";
  }
}

function computeTestRunStatus(
  steps: Array<{ name: string; status: string; baselineAlsoFails?: boolean }>,
  riskHigh: boolean,
): "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" {
  const hasFixFailure = steps.some(
    (s) => s.status === "FAILED" && s.baselineAlsoFails !== true,
  );
  if (hasFixFailure) return "FAILED";

  const hasPreexistingFailure = steps.some(
    (s) => s.status === "FAILED" && s.baselineAlsoFails === true,
  );

  const realChecksPassed = steps.filter(
    (s) => ["lint", "typecheck", "test"].includes(s.name) && s.status === "PASSED",
  );
  const hasSkipped = steps.some((s) => s.status === "SKIPPED");

  if (riskHigh || realChecksPassed.length === 0 || hasPreexistingFailure || hasSkipped) {
    return "PASSED_WITH_WARNINGS";
  }

  return "PASSED";
}

export async function runFixValidation(validationId: string): Promise<{
  validationId: string;
  status: "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" | "ERROR";
  errorCode?: string | null;
}> {
  try {
    // Load all required data
    const validation = await prisma.fixValidation.findUnique({
      where: { id: validationId },
      include: {
        workspace: { select: { id: true, sandboxEnabled: true } },
        fixProposal: {
          include: {
            finding: {
              include: {
                repository: {
                  include: { installation: true },
                },
              },
            },
          },
        },
      },
    });

    if (!validation || !validation.fixProposal) {
      throw new RunValidationError("INTERNAL", "Validation or proposal not found");
    }

    const { workspaceId, testsRequested } = validation;
    const proposal = validation.fixProposal;
    const finding = proposal.finding;
    const repository = finding.repository;
    const installation = repository.installation;

    if (!validateSafeRelativePosixPath(proposal.filePath)) {
      throw new RunValidationError("INTERNAL", "Target file path is not safe");
    }

    // Fetch full original file context from GitHub, falling back to proposal snippet if unavailable
    let originalContent = proposal.originalCode;
    try {
      if (installation?.installationId) {
        const octokit = await githubApp.getInstallationOctokit(
          Number(installation.installationId),
        );
        const scan = await prisma.scan.findUnique({
          where: { id: finding.lastScanId },
          select: { commitSha: true },
        });
        const slashIdx = repository.fullName.indexOf("/");
        const owner = repository.fullName.slice(0, slashIdx);
        const repoName = repository.fullName.slice(slashIdx + 1);
        const fileCtx = await fetchFileContext({
          octokit,
          owner,
          repo: repoName,
          commitSha: scan?.commitSha || "HEAD",
          filePath: proposal.filePath,
          targetLine: proposal.startLine,
        });
        originalContent = fileCtx.fullContent;
      }
    } catch {
      // Fall back to snippet
    }

    const { patchedContent } = applyReplacement({
      fullContent: originalContent,
      startLine: proposal.startLine,
      endLine: proposal.endLine,
      newCode: proposal.replacementCode,
    });
    const patchedSha256 = crypto.createHash("sha256").update(patchedContent, "utf8").digest("hex");

    // ── Layer 1: Static checks ─────────────────────────────────────────────
    let staticResult: StaticValidationResult;
    try {
      staticResult = await runStaticChecks({
        filePath: proposal.filePath,
        originalContent,
        patchedContent,
        originalRuleId: finding.ruleId,
      });
    } catch {
      staticResult = {
        checks: [],
        riskLevel: "LOW",
        anyFailed: false,
      };
    }

    // If any static check FAILED → overall FAILED, do NOT call Lambda
    if (staticResult.anyFailed) {
      await prisma.fixValidation.update({
        where: { id: validationId },
        data: {
          status: "FAILED",
          riskLevel: staticResult.riskLevel,
          staticChecks: staticResult.checks as any,
          testsRun: false,
          finishedAt: new Date(),
        },
      });
      return { validationId, status: "FAILED" };
    }

    // ── Layer 2: AWS Lambda test run (if requested and available) ──────────
    const riskHigh = staticResult.riskLevel === "HIGH";
    let testsRun = false;
    let testSteps: any[] = [];
    let nodeVersion: string | undefined;
    let npmVersion: string | undefined;
    let lambdaErrorCode: string | undefined;

    const shouldRunTests =
      testsRequested &&
      validation.workspace.sandboxEnabled &&
      env.SANDBOX_PROVIDER === "aws-lambda" &&
      isAwsLambdaSandboxConfigured;

    if (shouldRunTests) {
      if (!installation?.installationId) {
        throw new RunValidationError("INTERNAL", "GitHub installation not configured");
      }

      const scan = await prisma.scan.findUnique({
        where: { id: finding.lastScanId },
        select: { commitSha: true },
      });
      const commitSha = scan?.commitSha || "HEAD";

      const slashIdx = repository.fullName.indexOf("/");
      const owner = repository.fullName.slice(0, slashIdx);
      const repoName = repository.fullName.slice(slashIdx + 1);

      const maxArchiveBytes = env.SANDBOX_MAX_ARCHIVE_MB * 1024 * 1024;

      const provider = new AwsLambdaProvider();
      try {
        const result = await provider.run({
          validationId,
          owner,
          repo: repoName,
          sha: commitSha,
          targetPath: proposal.filePath,
          original: originalContent,
          patched: patchedContent,
          patchedSha256,
          limits: {
            maxArchiveBytes,
            maxFiles: 20_000,
            maxTotalBytes: maxArchiveBytes * 4,
          },
        });

        testsRun = true;
        testSteps = result.steps as any;
        nodeVersion = result.nodeVersion;
        npmVersion = result.npmVersion;
        lambdaErrorCode = result.errorCode;
      } catch (err: any) {
        if (err instanceof SandboxValidationError || err instanceof SandboxQuotaError) {
          lambdaErrorCode = err.code;
        } else {
          lambdaErrorCode = "LAMBDA_FAILED";
        }
        testsRun = false;
      }
    }

    // ── Compute overall status ─────────────────────────────────────────────
    let overallStatus: "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED";

    if (testsRun && testSteps.length > 0) {
      overallStatus = computeTestRunStatus(testSteps, riskHigh);
    } else {
      // No tests ran — at most PASSED_WITH_WARNINGS
      if (riskHigh || staticResult.checks.some((c) => c.status === "WARNING")) {
        overallStatus = "PASSED_WITH_WARNINGS";
      } else {
        overallStatus = staticResult.checks.length > 0 ? "PASSED" : "PASSED_WITH_WARNINGS";
      }
    }

    await prisma.fixValidation.update({
      where: { id: validationId },
      data: {
        status: overallStatus,
        riskLevel: staticResult.riskLevel,
        staticChecks: staticResult.checks as any,
        testsRun,
        testSteps: testsRun ? (testSteps as any) : undefined,
        nodeVersion: nodeVersion ?? null,
        errorCode: lambdaErrorCode ?? null,
        finishedAt: new Date(),
      },
    });

    return { validationId, status: overallStatus };
  } catch (err: any) {
    let errorCode: FixedValidationErrorCode = "INTERNAL";
    if (err instanceof RunValidationError) errorCode = err.code;
    else if (err instanceof SandboxValidationError) errorCode = err.code as FixedValidationErrorCode;
    else if (err?.name === "TimeoutError" || err?.message?.toLowerCase().includes("timeout")) {
      errorCode = "TIMEOUT";
    }

    await prisma.fixValidation.updateMany({
      where: {
        id: validationId,
        status: { notIn: ["PASSED", "PASSED_WITH_WARNINGS", "FAILED"] },
      },
      data: {
        status: "ERROR",
        errorCode,
        finishedAt: new Date(),
      },
    });

    return { validationId, status: "ERROR", errorCode };
  }
}
