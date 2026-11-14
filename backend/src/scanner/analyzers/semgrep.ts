import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../env.js";
import {
  cleanMessage,
  sanitizePosixPath,
  type FindingCategory,
  type FindingSeverity,
  type NormalizedFinding,
} from "../normalize.js";

const SEMGREP_TIMEOUT_MS = 60_000;

let semgrepInstalledCache: boolean | null = null;

async function checkSemgrepInstalled(binary: string): Promise<boolean> {
  if (semgrepInstalledCache !== null) {
    return semgrepInstalledCache;
  }

  return new Promise((resolve) => {
    try {
      const child = spawn(binary, ["--version"], {
        shell: false,
        stdio: "ignore",
      });
      child.on("error", () => {
        semgrepInstalledCache = false;
        resolve(false);
      });
      child.on("close", (code) => {
        semgrepInstalledCache = code === 0;
        resolve(code === 0);
      });
    } catch {
      semgrepInstalledCache = false;
      resolve(false);
    }
  });
}

function mapSemgrepSeverity(rawSev?: string): FindingSeverity {
  const upper = (rawSev || "").toUpperCase();
  if (upper === "ERROR") return "HIGH";
  if (upper === "WARNING") return "MEDIUM";
  return "LOW";
}

export async function runSemgrepAnalyzer(
  repoDir: string,
  tempDir: string,
  maxFileKb: number,
): Promise<{
  findings: NormalizedFinding[];
  skipped?: boolean;
  note?: string;
  error?: string;
}> {
  const binary = env.SEMGREP_BIN || "semgrep";
  const isAvailable = await checkSemgrepInstalled(binary);
  if (!isAvailable) {
    return {
      findings: [],
      skipped: true,
      note: "semgrep not installed",
    };
  }

  const reportPath = path.join(tempDir, `semgrep-out-${Date.now()}.json`);
  const maxBytes = String(maxFileKb * 1024);

  return new Promise((resolve) => {
    // spawn semgrep scan --config <SEMGREP_CONFIG> --json --metrics=off --disable-version-check --timeout 20 --quiet <extractedDir> --max-target-bytes ...
    const args = [
      "scan",
      "--config",
      env.SEMGREP_CONFIG || "p/default",
      "--json",
      "--metrics=off",
      "--disable-version-check",
      "--timeout",
      "20",
      "--quiet",
      "--max-target-bytes",
      maxBytes,
      repoDir,
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
        note: "semgrep not installed",
      });
    }

    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d));

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ findings: [], error: "semgrep_timeout" });
    }, SEMGREP_TIMEOUT_MS);

    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === "ENOENT") {
        resolve({
          findings: [],
          skipped: true,
          note: "semgrep not installed",
        });
      } else {
        resolve({ findings: [], error: "semgrep_spawn_failed" });
      }
    });

    child.on("close", async () => {
      clearTimeout(timeout);
      try {
        if (!stdout.trim()) {
          return resolve({ findings: [] });
        }

        const data = JSON.parse(stdout) as {
          results?: Array<{
            check_id: string;
            path: string;
            start?: { line?: number };
            end?: { line?: number };
            extra?: {
              severity?: string;
              message?: string;
              metadata?: { category?: string };
            };
          }>;
        };

        const results = data.results || [];
        const findings: NormalizedFinding[] = [];

        for (const res of results) {
          const relPath = sanitizePosixPath(
            path.isAbsolute(res.path)
              ? path.relative(repoDir, res.path)
              : res.path,
          );
          if (!relPath) continue;

          const severity = mapSemgrepSeverity(res.extra?.severity);
          const rawCategory = (res.extra?.metadata?.category || "security").toUpperCase();
          const category: FindingCategory =
            rawCategory === "SECURITY" ||
            rawCategory === "BUG" ||
            rawCategory === "PERFORMANCE" ||
            rawCategory === "QUALITY" ||
            rawCategory === "SECRET"
              ? (rawCategory as FindingCategory)
              : "SECURITY";

          findings.push({
            tool: "SEMGREP",
            ruleId: res.check_id,
            severity,
            category,
            title: res.check_id,
            message: cleanMessage(res.extra?.message || "Semgrep finding"),
            filePath: relPath,
            startLine: res.start?.line || 1,
            endLine: res.end?.line || res.start?.line || 1,
            snippet: null,
          });
        }

        resolve({ findings });
      } catch {
        resolve({ findings: [], error: "semgrep_parse_failed" });
      }
    });
  });
}

