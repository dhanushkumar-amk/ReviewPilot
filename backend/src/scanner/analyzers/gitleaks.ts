import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../env.js";
import {
  cleanMessage,
  sanitizePosixPath,
  type NormalizedFinding,
} from "../normalize.js";

const GITLEAKS_TIMEOUT_MS = 60_000;

interface GitleaksResultItem {
  RuleID: string;
  Description: string;
  File: string;
  StartLine: number;
  EndLine: number;
}

export async function runGitleaksAnalyzer(
  repoDir: string,
  tempDir: string,
): Promise<{
  findings: NormalizedFinding[];
  skipped?: boolean;
  note?: string;
  error?: string;
}> {
  const binary = env.GITLEAKS_BIN || "gitleaks";
  const configPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../config/gitleaks.toml",
  );
  const reportPath = path.join(tempDir, `gitleaks-out-${Date.now()}.json`);

  return new Promise((resolve) => {
    // spawn gitleaks dir <extractedDir> --config <my config> --report-format json --report-path <tmp>/gitleaks.json --redact --exit-code 0 --no-banner
    const args = [
      "dir",
      repoDir,
      "--config",
      configPath,
      "--report-format",
      "json",
      "--report-path",
      reportPath,
      "--redact",
      "--exit-code",
      "0",
      "--no-banner",
    ];

    let child;
    try {
      child = spawn(binary, args, {
        cwd: repoDir,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch {
      return resolve({
        findings: [],
        skipped: true,
        note: "gitleaks not installed",
      });
    }

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ findings: [], error: "gitleaks_timeout" });
    }, GITLEAKS_TIMEOUT_MS);

    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === "ENOENT") {
        resolve({
          findings: [],
          skipped: true,
          note: "gitleaks not installed",
        });
      } else {
        resolve({ findings: [], error: "gitleaks_spawn_failed" });
      }
    });

    child.on("close", async () => {
      clearTimeout(timeout);
      try {
        const stats = await fs.stat(reportPath).catch(() => null);
        if (!stats) {
          // Gitleaks returns 0 when no leaks found and might not write file or writes empty
          return resolve({ findings: [] });
        }

        const content = await fs.readFile(reportPath, "utf8");
        if (!content.trim()) {
          return resolve({ findings: [] });
        }

        const items = JSON.parse(content) as GitleaksResultItem[];
        const findings: NormalizedFinding[] = [];

        for (const item of items) {
          const relPath = sanitizePosixPath(
            path.isAbsolute(item.File)
              ? path.relative(repoDir, item.File)
              : item.File,
          );
          if (!relPath) continue;

          // SECRET findings discard Secret / Match fields immediately
          findings.push({
            tool: "GITLEAKS",
            ruleId: item.RuleID || "gitleaks-secret",
            severity: "CRITICAL",
            category: "SECRET",
            title: item.Description || item.RuleID || "Secret detected",
            message: cleanMessage(item.Description || "Secret detected"),
            filePath: relPath,
            startLine: item.StartLine || 1,
            endLine: item.EndLine || item.StartLine || 1,
            snippet: null, // NEVER for SECRET
          });
        }

        resolve({ findings });
      } catch (err) {
        resolve({ findings: [], error: "gitleaks_parse_failed" });
      } finally {
        await fs.unlink(reportPath).catch(() => {});
      }
    });
  });
}

