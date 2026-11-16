/**
 * static/secrets.ts
 * Layer 1 Static Check: Secret Detection
 * Runs the existing Gitleaks analyzer on the PATCHED file only.
 * FAILED if any secret is introduced. Never stores or logs matched values.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runGitleaksAnalyzer } from "../../scanner/analyzers/gitleaks.js";
import { safeRemoveDir } from "../../scanner/run-scan.js";
import type { StaticCheckResult } from "./syntax.js";

export async function checkSecrets(options: {
  filePath: string;
  patchedContent: string;
}): Promise<StaticCheckResult> {
  const { filePath, patchedContent } = options;

  const tmpBase = os.tmpdir();
  const workDir = path.join(
    tmpBase,
    `rp-secrets-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  try {
    await fs.mkdir(workDir, { recursive: true, mode: 0o700 });

    const targetFile = path.join(workDir, filePath);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, patchedContent, "utf8");

    const result = await runGitleaksAnalyzer(workDir, workDir);

    if (result.skipped) {
      return {
        name: "secrets",
        status: "SKIPPED",
        note: "Secret detection tool not available",
        details: [],
      };
    }

    if (result.findings.length > 0) {
      // Never log or store match values — only report rule IDs
      const details = result.findings
        .slice(0, 5)
        .map((f) => `Secret pattern detected: ${f.ruleId}`);

      return {
        name: "secrets",
        status: "FAILED",
        note: "Patch introduces potential secrets",
        details,
      };
    }

    return {
      name: "secrets",
      status: "PASSED",
      note: "No secrets detected",
      details: [],
    };
  } catch {
    return {
      name: "secrets",
      status: "SKIPPED",
      note: "Secret detection check could not be completed",
      details: [],
    };
  } finally {
    await safeRemoveDir(workDir);
  }
}
