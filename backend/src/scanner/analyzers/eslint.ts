import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanMessage,
  getRuleTitle,
  sanitizePosixPath,
  type FindingCategory,
  type FindingSeverity,
  type NormalizedFinding,
} from "../normalize.js";

const ESLINT_TIMEOUT_MS = 60_000;

function mapEslintSeverityAndCategory(ruleId: string): {
  severity: FindingSeverity;
  category: FindingCategory;
} {
  if (ruleId.startsWith("security/")) {
    const sec = ruleId.replace("security/", "");
    if (
      sec === "detect-eval-with-expression" ||
      sec === "detect-child-process" ||
      sec === "detect-non-literal-require"
    ) {
      return { severity: "HIGH", category: "SECURITY" };
    }
    if (
      sec === "detect-unsafe-regex" ||
      sec === "detect-non-literal-fs-filename" ||
      sec === "detect-possible-timing-attacks"
    ) {
      return { severity: "MEDIUM", category: "SECURITY" };
    }
    return { severity: "LOW", category: "SECURITY" };
  }

  // Additional Security rules
  if (
    ruleId === "no-implied-eval" ||
    ruleId === "no-new-func" ||
    ruleId === "no-script-url" ||
    ruleId === "no-proto"
  ) {
    return { severity: "HIGH", category: "SECURITY" };
  }

  // Critical Logic / Async Bug rules
  if (
    ruleId === "no-async-promise-executor" ||
    ruleId === "no-constant-binary-expression" ||
    ruleId === "no-loss-of-precision"
  ) {
    return { severity: "HIGH", category: "BUG" };
  }

  // Bug rules (@eslint/js)
  return { severity: "MEDIUM", category: "BUG" };
}

export async function runEslintAnalyzer(
  repoDir: string,
  tempDir: string,
): Promise<{ findings: NormalizedFinding[]; error?: string }> {
  const runnerPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "eslint-runner.cjs",
  );
  const outputFile = path.join(tempDir, `eslint-out-${Date.now()}.json`);

  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--max-old-space-size=512", runnerPath, repoDir, outputFile],
      {
        cwd: repoDir,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ findings: [], error: "eslint_timeout" });
    }, ESLINT_TIMEOUT_MS);

    child.on("close", async (code) => {
      clearTimeout(timeout);
      try {
        const stats = await fs.stat(outputFile).catch(() => null);
        if (!stats || stats.size > 20 * 1024 * 1024) {
          if (stderr) {
            console.error("[eslint analyzer runner error]:", stderr.trim());
          }
          return resolve({ findings: [], error: code !== 0 ? "eslint_failed" : undefined });
        }

        const rawJson = await fs.readFile(outputFile, "utf8");
        const results = JSON.parse(rawJson) as Array<{
          filePath: string;
          messages: Array<{
            ruleId: string | null;
            severity: number;
            message: string;
            line: number;
            endLine?: number;
            fatal?: boolean;
          }>;
        }>;

        const findings: NormalizedFinding[] = [];
        for (const fileResult of results) {
          const relPath = sanitizePosixPath(path.relative(repoDir, fileResult.filePath));
          if (!relPath) continue;

          for (const msg of fileResult.messages) {
            // Skip parse errors / fatal syntax errors
            if (msg.fatal || !msg.ruleId) continue;

            const { severity, category } = mapEslintSeverityAndCategory(msg.ruleId);
            findings.push({
              tool: "ESLINT",
              ruleId: msg.ruleId,
              severity,
              category,
              title: getRuleTitle(msg.ruleId),
              message: cleanMessage(msg.message),
              filePath: relPath,
              startLine: msg.line || 1,
              endLine: msg.endLine || msg.line || 1,
              snippet: null,
            });
          }
        }

        resolve({ findings });
      } catch (err) {
        resolve({ findings: [], error: "eslint_parse_failed" });
      } finally {
        await fs.unlink(outputFile).catch(() => {});
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ findings: [], error: "eslint_spawn_failed" });
    });
  });
}

