/**
 * index.mjs — Lambda handler
 * Orchestrates the full validation run:
 *   1. Validate event
 *   2. Wipe /tmp
 *   3. Create run directory
 *   4. Download and extract repo archive
 *   5. Write patched file (verify SHA-256)
 *   6. Record node/npm versions
 *   7. Run steps: install → lint → typecheck → test
 *   8. Baseline reruns for failed steps
 *   9. Cleanup in finally
 *
 * Security: child processes receive a SCRUBBED environment.
 * No AWS_*, LAMBDA_*, secrets, or database URLs are passed to any subprocess.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { validateEvent, validateSafeRelativePosixPath, EventValidationError } from "./validate-event.mjs";
import { downloadAndExtract } from "./archive.mjs";
import { detectProjectConfig } from "./detect.mjs";
import { runStep, spawnProcessGroup, buildScrubbedEnv } from "./run-step.mjs";

const MIN_STEP_TIME_MS = 10_000; // must have at least 10s before we'll run a step
const RESERVE_MS = 25_000; // reserve 25s for cleanup

const STEP_MAX_MS = {
  install: 120_000,
  lint: 45_000,
  typecheck: 45_000,
  test: 60_000,
};

async function wipeDir(dir) {
  try {
    const entries = await fs.readdir(dir);
    await Promise.all(
      entries.map((e) => fs.rm(path.join(dir, e), { recursive: true, force: true }).catch(() => {}))
    );
  } catch {}
}

async function getNodeNpmVersions(runDir) {
  const env = buildScrubbedEnv(runDir);
  let nodeVersion = "unknown";
  let npmVersion = "unknown";

  try {
    const nodeRes = await spawnProcessGroup("node", ["--version"], {
      env, cwd: "/tmp", timeoutMs: 10_000,
    });
    nodeVersion = (nodeRes.outputTail || "").trim().replace(/\n.*$/s, "");
  } catch {}

  try {
    const npmRes = await spawnProcessGroup("npm", ["--version"], {
      env, cwd: "/tmp", timeoutMs: 10_000,
    });
    npmVersion = (npmRes.outputTail || "").trim().replace(/\n.*$/s, "");
  } catch {}

  return { nodeVersion, npmVersion };
}

export async function handler(event, context) {
  // ── Wipe /tmp at the start of every invocation (warm container safety) ──
  await wipeDir("/tmp");

  let runDir = null;

  try {
    // ── 1. Validate event ──────────────────────────────────────────────────
    let validated;
    try {
      validated = validateEvent(event);
    } catch (err) {
      return {
        runId: (event && typeof event.runId === "string") ? event.runId : "unknown",
        errorCode: err instanceof EventValidationError ? "INVALID_EVENT" : "INTERNAL",
        steps: [],
      };
    }

    const { runId, downloadUrl, targetPath, patchedContent, originalContent, patchedSha256, limits } = validated;

    // ── 2. Create run directory with subfolders ────────────────────────────
    const runId8 = runId.replace(/-/g, "").slice(0, 8);
    runDir = `/tmp/run-${runId8}-${Date.now()}`;
    const homeDir = path.join(runDir, "home");
    const repoDir = path.join(runDir, "repo");
    const archivePath = path.join(runDir, "archive.tar.gz");
    const cacheDir = path.join(runDir, ".npm");

    await fs.mkdir(homeDir, { recursive: true });
    await fs.mkdir(repoDir, { recursive: true });
    await fs.mkdir(cacheDir, { recursive: true });

    // ── 3. Download and extract ────────────────────────────────────────────
    try {
      await downloadAndExtract({ downloadUrl, archivePath, destDir: repoDir, limits });
    } catch (err) {
      const code = err.code || "DOWNLOAD_FAILED";
      return { runId, errorCode: code, steps: [] };
    }

    // ── 4. Write patched file (verify SHA-256) ────────────────────────────
    // Validate path stays inside repoDir
    if (!validateSafeRelativePosixPath(targetPath)) {
      return { runId, errorCode: "INVALID_EVENT", steps: [] };
    }
    const resolvedTarget = path.resolve(repoDir, targetPath);
    if (!resolvedTarget.startsWith(repoDir + path.sep) && resolvedTarget !== repoDir) {
      return { runId, errorCode: "INVALID_EVENT", steps: [] };
    }

    // Verify content hash before writing
    const computedSha = crypto.createHash("sha256").update(patchedContent, "utf8").digest("hex");
    if (computedSha !== patchedSha256) {
      return { runId, errorCode: "INVALID_EVENT", steps: [] };
    }

    // Create parent dirs and write
    await fs.mkdir(path.dirname(resolvedTarget), { recursive: true });
    await fs.writeFile(resolvedTarget, patchedContent, "utf8");

    // ── 5. Record node/npm versions ───────────────────────────────────────
    const { nodeVersion, npmVersion } = await getNodeNpmVersions(homeDir);

    // ── 6. Detect project config ──────────────────────────────────────────
    const config = await detectProjectConfig(repoDir);
    const steps = [];

    if (!config.isSupported) {
      // All steps SKIPPED
      for (const name of ["install", "lint", "typecheck", "test"]) {
        steps.push({ name, status: "SKIPPED", durationMs: 0, note: config.skipReason });
      }
      return { runId, nodeVersion, npmVersion, steps };
    }

    // ── 7. Run steps ──────────────────────────────────────────────────────
    let installFailed = false;

    for (const stepDef of config.steps) {
      const { name, command, shouldRun, skipReason } = stepDef;
      const remaining = context.getRemainingTimeInMillis();
      const stepMaxMs = STEP_MAX_MS[name] || 60_000;
      const budget = remaining - RESERVE_MS;

      if (installFailed && name !== "install") {
        steps.push({ name, status: "SKIPPED", durationMs: 0, note: "Install failed" });
        continue;
      }

      if (!shouldRun) {
        steps.push({ name, status: "SKIPPED", durationMs: 0, note: skipReason });
        continue;
      }

      if (budget < MIN_STEP_TIME_MS) {
        steps.push({ name, status: "SKIPPED", durationMs: 0, note: "Not enough time left" });
        installFailed = installFailed || (name === "install"); // propagate
        continue;
      }

      const timeoutMs = Math.min(stepMaxMs, budget);

      const result = await runStep({
        command,
        cwd: repoDir,
        timeoutMs,
        runDir: homeDir,
      });

      steps.push({
        name,
        status: result.status,
        durationMs: result.durationMs,
        outputTail: result.outputTail,
        exitCode: result.exitCode,
      });

      if (result.status === "FAILED" && name === "install") {
        installFailed = true;
      }
    }

    // ── 8. Baseline reruns for failed steps (lint, typecheck, test) ───────
    const failedNonInstall = steps.filter(
      (s) => s.status === "FAILED" && s.name !== "install"
    );

    if (failedNonInstall.length > 0) {
      // Write original file back
      await fs.writeFile(resolvedTarget, originalContent, "utf8");

      for (const stepResult of failedNonInstall) {
        const stepDef = config.steps.find((s) => s.name === stepResult.name);
        if (!stepDef || !stepDef.command) continue;

        const remaining = context.getRemainingTimeInMillis();
        const budget = remaining - RESERVE_MS;
        if (budget < MIN_STEP_TIME_MS) {
          // Can't run baseline — leave baselineAlsoFails undefined (unknown)
          continue;
        }

        const stepMaxMs = STEP_MAX_MS[stepResult.name] || 60_000;
        const timeoutMs = Math.min(stepMaxMs, budget);

        const baselineResult = await runStep({
          command: stepDef.command,
          cwd: repoDir,
          timeoutMs,
          runDir: homeDir,
        });

        stepResult.baselineAlsoFails = baselineResult.status === "FAILED";
        if (stepResult.baselineAlsoFails) {
          stepResult.note = "Also fails without the fix, so the fix is not the cause.";
        }
      }

      // Restore patched file
      await fs.writeFile(resolvedTarget, patchedContent, "utf8");
    }

    return { runId, nodeVersion, npmVersion, steps };

  } finally {
    // ── Cleanup: always wipe run directory and /tmp ────────────────────────
    if (runDir) {
      await fs.rm(runDir, { recursive: true, force: true }).catch(() => {});
    }
    await wipeDir("/tmp");
  }
}
