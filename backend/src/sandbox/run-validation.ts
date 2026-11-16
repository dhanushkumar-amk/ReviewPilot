import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { applyReplacement } from "../ai/patch.js";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { githubApp } from "../github/app.js";
import { detectProjectConfig, type StepName } from "./detect.js";
import { createSandbox } from "./e2b-client.js";
import { validateSafeRelativePosixPath } from "./path-validator.js";
import {
  checkAndIncrementSandboxQuota,
  recordSandboxSeconds,
  SandboxQuotaError,
} from "./quota.js";
import { sanitizeOutputTail } from "./sanitize.js";

export type StepStatus = "PASSED" | "FAILED" | "SKIPPED";

export interface ValidationStepResult {
  name: StepName;
  status: StepStatus;
  durationMs: number;
  command: string;
  note?: string;
  baselineAlsoFails?: boolean;
  outputTail: string;
}

export type FixedValidationErrorCode =
  | "SANDBOX_DISABLED"
  | "SANDBOX_NOT_CONFIGURED"
  | "SANDBOX_LIMIT_REACHED"
  | "SANDBOX_BUSY"
  | "SANDBOX_ALREADY_RUNNING"
  | "NODE_UNAVAILABLE"
  | "REPO_TOO_LARGE"
  | "DOWNLOAD_FAILED"
  | "TIMEOUT"
  | "INTERNAL";

export class SandboxValidationError extends Error {
  constructor(
    public readonly code: FixedValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SandboxValidationError";
  }
}

const STEP_TIMEOUTS_MS: Record<StepName, number> = {
  install: 180_000,
  lint: 120_000,
  typecheck: 120_000,
  test: 180_000,
};

function computeOverallStatus(steps: ValidationStepResult[]): "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" {
  // If any step failed and baseline does not also fail, the fix caused a failure.
  const hasFixFailure = steps.some(
    (s) => s.status === "FAILED" && s.baselineAlsoFails !== true,
  );
  if (hasFixFailure) {
    return "FAILED";
  }

  // Pre-existing failures (failed on both patch and baseline)
  const hasPreexistingFailure = steps.some(
    (s) => s.status === "FAILED" && s.baselineAlsoFails === true,
  );

  // Checks that actually ran and passed (lint, typecheck, test)
  const realChecksPassed = steps.filter(
    (s) => (s.name === "lint" || s.name === "typecheck" || s.name === "test") && s.status === "PASSED",
  );

  // Steps that were skipped
  const hasSkipped = steps.some((s) => s.status === "SKIPPED");

  if (realChecksPassed.length === 0 || hasPreexistingFailure || hasSkipped) {
    return "PASSED_WITH_WARNINGS";
  }

  return "PASSED";
}

export async function runFixValidation(validationId: string): Promise<{
  validationId: string;
  status: "PASSED" | "PASSED_WITH_WARNINGS" | "FAILED" | "ERROR";
  errorCode?: string | null;
}> {
  const startTime = Date.now();
  let tempDir: string | null = null;
  let sandboxInstance: any = null;
  let workspaceId = "";

  try {
    // 1. Load FixValidation, FixProposal, Finding, Repository, Installation
    const validation = await prisma.fixValidation.findUnique({
      where: { id: validationId },
      include: {
        workspace: {
          select: { id: true, sandboxEnabled: true },
        },
        fixProposal: {
          include: {
            finding: {
              include: {
                repository: {
                  include: {
                    installation: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!validation || !validation.fixProposal) {
      throw new SandboxValidationError("INTERNAL", "Validation or proposal not found");
    }

    workspaceId = validation.workspaceId;

    if (!validation.workspace.sandboxEnabled) {
      throw new SandboxValidationError("SANDBOX_DISABLED", "Sandbox validation is disabled for this workspace");
    }

    if (!env.E2B_API_KEY) {
      throw new SandboxValidationError("SANDBOX_NOT_CONFIGURED", "E2B API key is not configured on the server");
    }

    const proposal = validation.fixProposal;
    if (proposal.status !== "DRAFT") {
      throw new SandboxValidationError("INTERNAL", "Proposal is not in DRAFT status");
    }

    const checksObj = (proposal.checks && typeof proposal.checks === "object" ? proposal.checks : {}) as any;
    if (!checksObj.staticRecheck || checksObj.staticRecheck.passed !== true) {
      throw new SandboxValidationError("INTERNAL", "Static recheck did not pass for this proposal");
    }

    const finding = proposal.finding;
    const repository = finding.repository;
    const installation = repository.installation;

    if (!installation || !installation.installationId) {
      throw new SandboxValidationError("INTERNAL", "GitHub installation not configured for repository");
    }

    // 2. Quota check & atomic increment BEFORE creating the sandbox
    try {
      await checkAndIncrementSandboxQuota(workspaceId);
    } catch (err) {
      if (err instanceof SandboxQuotaError) {
        throw new SandboxValidationError(err.code, err.message);
      }
      throw err;
    }

    // 3. Download repository archive at the scan commit
    const scan = await prisma.scan.findUnique({
      where: { id: finding.lastScanId },
      select: { commitSha: true },
    });
    const commitSha = scan?.commitSha || "HEAD";

    const slashIdx = repository.fullName.indexOf("/");
    const owner = repository.fullName.slice(0, slashIdx);
    const repoName = repository.fullName.slice(slashIdx + 1);

    const octokit = await githubApp.getInstallationOctokit(Number(installation.installationId));

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rp-sandbox-"));
    const tarballPath = path.join(tempDir, "archive.tar.gz");

    let downloadedBytes = 0;
    const maxArchiveBytes = env.SANDBOX_MAX_ARCHIVE_MB * 1024 * 1024;
    const chunks: Buffer[] = [];

    try {
      const response = await octokit.request("GET /repos/{owner}/{repo}/tarball/{sha}", {
        owner,
        repo: repoName,
        sha: commitSha,
        request: {
          parseSuccessResponseBody: false,
        },
      });

      const rawStream = response.data as unknown as (ReadableStream<Uint8Array> | NodeJS.ReadableStream);
      const nodeStream =
        typeof (rawStream as NodeJS.ReadableStream).on === "function"
          ? (rawStream as NodeJS.ReadableStream)
          : Readable.fromWeb(rawStream as unknown as import("node:stream/web").ReadableStream);

      for await (const chunk of nodeStream) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        downloadedBytes += buf.length;
        if (downloadedBytes > maxArchiveBytes) {
          throw new SandboxValidationError(
            "REPO_TOO_LARGE",
            `Repository archive exceeds size limit of ${env.SANDBOX_MAX_ARCHIVE_MB}MB`,
          );
        }
        chunks.push(buf);
      }
    } catch (err: any) {
      if (err instanceof SandboxValidationError) {
        throw err;
      }
      throw new SandboxValidationError("DOWNLOAD_FAILED", `Failed to download archive: ${err.message || String(err)}`);
    }

    const archiveBuffer = Buffer.concat(chunks);
    await fs.writeFile(tarballPath, archiveBuffer);

    // 4. Create sandbox with restricted network and empty envs
    sandboxInstance = await createSandbox({
      timeoutMs: env.SANDBOX_TIMEOUT_MS,
      metadata: {
        validationId,
        workspaceId,
      },
    });

    // Upload archive and extract
    await sandboxInstance.files.write("/home/user/archive.tar.gz", archiveBuffer);
    await sandboxInstance.commands.run("mkdir -p /home/user/repo && tar -xzf /home/user/archive.tar.gz --strip-components=1 -C /home/user/repo", {
      timeoutMs: 60_000,
    });

    // Check node and npm availability
    let nodeVersion = "";
    try {
      const nodeRes = await sandboxInstance.commands.run("node -v", { timeoutMs: 15_000 });
      nodeVersion = (nodeRes.stdout || "").trim();
      await sandboxInstance.commands.run("npm -v", { timeoutMs: 15_000 });
    } catch {
      throw new SandboxValidationError("NODE_UNAVAILABLE", "Node.js or npm is unavailable in the sandbox");
    }

    if (!nodeVersion) {
      throw new SandboxValidationError("NODE_UNAVAILABLE", "Node.js is unavailable in the sandbox");
    }

    // Inspect files in /home/user/repo
    const lsResult = await sandboxInstance.commands.run("ls -1a", {
      cwd: "/home/user/repo",
      timeoutMs: 15_000,
    });
    const repoFileList = (lsResult.stdout || "").split(/\r?\n/).filter(Boolean);

    let packageJsonContent: string | null = null;
    try {
      packageJsonContent = await sandboxInstance.files.read("/home/user/repo/package.json");
    } catch {
      packageJsonContent = null;
    }

    // Detect project config
    const projectConfig = detectProjectConfig(repoFileList, packageJsonContent);

    // Non-Node repositories
    if (!projectConfig.isNodeProject) {
      const nonNodeSteps: ValidationStepResult[] = [
        {
          name: "install",
          status: "SKIPPED",
          durationMs: 0,
          command: "npm ci",
          note: "Only Node.js projects are supported right now",
          outputTail: "",
        },
        {
          name: "lint",
          status: "SKIPPED",
          durationMs: 0,
          command: "npm run lint",
          note: "Only Node.js projects are supported right now",
          outputTail: "",
        },
        {
          name: "typecheck",
          status: "SKIPPED",
          durationMs: 0,
          command: "npm run typecheck",
          note: "Only Node.js projects are supported right now",
          outputTail: "",
        },
        {
          name: "test",
          status: "SKIPPED",
          durationMs: 0,
          command: "npm test",
          note: "Only Node.js projects are supported right now",
          outputTail: "",
        },
      ];

      const finalStatus = "PASSED_WITH_WARNINGS";
      await prisma.fixValidation.update({
        where: { id: validationId },
        data: {
          status: finalStatus,
          steps: nonNodeSteps as any,
          finishedAt: new Date(),
        },
      });

      return { validationId, status: finalStatus, errorCode: null };
    }

    // Safe relative posix path check
    if (!validateSafeRelativePosixPath(proposal.filePath)) {
      throw new SandboxValidationError("INTERNAL", "Target file path failed safe relative posix path validation");
    }

    const targetSandboxPath = `/home/user/repo/${proposal.filePath}`;

    // Read original full content from extracted repository
    const originalFullContent = await sandboxInstance.files.read(targetSandboxPath);

    // Compute patched content
    const { patchedContent } = applyReplacement({
      fullContent: originalFullContent,
      startLine: proposal.startLine,
      endLine: proposal.endLine,
      newCode: proposal.replacementCode,
    });

    // Write patched file
    await sandboxInstance.files.write(targetSandboxPath, patchedContent);

    // Verify inside the sandbox that the file's content matches the expected patched content hash
    const expectedSha = crypto.createHash("sha256").update(patchedContent).digest("hex");
    const shaRes = await sandboxInstance.commands.run(`sha256sum "${targetSandboxPath}"`, { timeoutMs: 15_000 });
    const actualSha = (shaRes.stdout || "").trim().split(/\s+/)[0];
    if (actualSha.toLowerCase() !== expectedSha.toLowerCase()) {
      throw new SandboxValidationError("INTERNAL", "Patched file content hash verification failed in sandbox");
    }

    // Step definitions
    interface StepPlan {
      name: StepName;
      command: string;
      shouldRun: boolean;
      skipNote?: string;
    }

    const stepPlans: StepPlan[] = [
      {
        name: "install",
        command: projectConfig.installCommand,
        shouldRun: true,
      },
      {
        name: "lint",
        command: projectConfig.lintCommand || "npm run lint",
        shouldRun: projectConfig.hasLint,
        skipNote: "No lint script in package.json",
      },
      {
        name: "typecheck",
        command: projectConfig.typecheckCommand || "npm run typecheck",
        shouldRun: projectConfig.hasTypecheck,
        skipNote: "No typecheck script or tsconfig.json found",
      },
      {
        name: "test",
        command: projectConfig.testCommand || "npm test",
        shouldRun: projectConfig.hasTest,
        skipNote: "No test script in package.json",
      },
    ];

    const results: ValidationStepResult[] = [];
    let installFailed = false;

    for (const plan of stepPlans) {
      if (installFailed) {
        results.push({
          name: plan.name,
          status: "SKIPPED",
          durationMs: 0,
          command: plan.command,
          note: "Install failed",
          outputTail: "",
        });
        continue;
      }

      if (!plan.shouldRun) {
        results.push({
          name: plan.name,
          status: "SKIPPED",
          durationMs: 0,
          command: plan.command,
          note: plan.skipNote || "Script not configured",
          outputTail: "",
        });
        continue;
      }

      // Execute step on patched code
      const stepTimeout = STEP_TIMEOUTS_MS[plan.name];
      const stepStart = Date.now();
      let stepStatus: StepStatus = "PASSED";
      let stepOutput = "";

      try {
        const cmdRes = await sandboxInstance.commands.run(plan.command, {
          cwd: "/home/user/repo",
          timeoutMs: stepTimeout,
          envs: { CI: "true" },
        });
        stepOutput = (cmdRes.stdout || "") + "\n" + (cmdRes.stderr || "");
      } catch (err: any) {
        stepStatus = "FAILED";
        stepOutput = (err.stdout || "") + "\n" + (err.stderr || "") + "\n" + (err.message || "");
        if (plan.name === "install") {
          installFailed = true;
        }
      }

      const stepDuration = Date.now() - stepStart;
      const sanitizedOutput = sanitizeOutputTail(stepOutput);

      results.push({
        name: plan.name,
        status: stepStatus,
        durationMs: stepDuration,
        command: plan.command,
        outputTail: sanitizedOutput,
      });
    }

    // Baseline execution: for each step that FAILED on the patched code, write original file back and rerun only that step once
    const failedSteps = results.filter((r) => r.status === "FAILED");
    if (failedSteps.length > 0) {
      // Restore original file
      await sandboxInstance.files.write(targetSandboxPath, originalFullContent);

      for (const step of failedSteps) {
        let baselineFailed = false;
        try {
          await sandboxInstance.commands.run(step.command, {
            cwd: "/home/user/repo",
            timeoutMs: STEP_TIMEOUTS_MS[step.name],
            envs: { CI: "true" },
          });
          baselineFailed = false;
        } catch {
          baselineFailed = true;
        }

        step.baselineAlsoFails = baselineFailed;
        if (baselineFailed) {
          step.note = "Also fails without the fix, so the fix is not the cause.";
        }
      }

      // Restore patched file back
      await sandboxInstance.files.write(targetSandboxPath, patchedContent);
    }

    // Compute overall status
    const overallStatus = computeOverallStatus(results);

    await prisma.fixValidation.update({
      where: { id: validationId },
      data: {
        status: overallStatus,
        steps: results as any,
        finishedAt: new Date(),
      },
    });

    return {
      validationId,
      status: overallStatus,
      errorCode: null,
    };
  } catch (err: any) {
    let errorCode: FixedValidationErrorCode = "INTERNAL";

    if (err instanceof SandboxValidationError) {
      errorCode = err.code;
    } else if (err?.name === "TimeoutError" || err?.message?.toLowerCase().includes("timeout")) {
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

    return {
      validationId,
      status: "ERROR",
      errorCode,
    };
  } finally {
    // ALWAYS kill the sandbox in a finally block
    if (sandboxInstance) {
      try {
        await sandboxInstance.kill();
      } catch {
        // Ignored
      }
    }

    // Record seconds used in SandboxUsage
    if (workspaceId) {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      await recordSandboxSeconds(workspaceId, elapsedSeconds);
    }

    // Delete private temp files in finally
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignored
      }
    }
  }
}

