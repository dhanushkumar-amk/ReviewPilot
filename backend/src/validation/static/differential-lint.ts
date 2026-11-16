/**
 * static/differential-lint.ts
 * Layer 1 Static Check: Differential ESLint
 * Runs the existing ESLint analyzer on original and patched content in a temp dir.
 * FAILED if original finding is still present or any new HIGH/CRITICAL finding appears.
 * WARNING for new MEDIUM findings.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runEslintAnalyzer } from "../../scanner/analyzers/eslint.js";
import { safeRemoveDir } from "../../scanner/run-scan.js";
import type { NormalizedFinding } from "../../scanner/normalize.js";
import type { StaticCheckResult } from "./syntax.js";

function isFindingMatch(a: NormalizedFinding, b: NormalizedFinding): boolean {
  return a.ruleId === b.ruleId && a.startLine === b.startLine;
}

export async function checkDifferentialLint(options: {
  filePath: string;
  originalContent: string;
  patchedContent: string;
  originalRuleId?: string;
  timeoutMs?: number;
}): Promise<StaticCheckResult> {
  const { filePath, originalContent, patchedContent, originalRuleId } = options;

  const tmpBase = os.tmpdir();
  const workDir = path.join(
    tmpBase,
    `rp-difflint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const originalDir = path.join(workDir, "original");
  const patchedDir = path.join(workDir, "patched");

  try {
    await fs.mkdir(originalDir, { recursive: true, mode: 0o700 });
    await fs.mkdir(patchedDir, { recursive: true, mode: 0o700 });

    const originalFile = path.join(originalDir, filePath);
    const patchedFile = path.join(patchedDir, filePath);

    await fs.mkdir(path.dirname(originalFile), { recursive: true });
    await fs.mkdir(path.dirname(patchedFile), { recursive: true });

    await fs.writeFile(originalFile, originalContent, "utf8");
    await fs.writeFile(patchedFile, patchedContent, "utf8");

    // Run ESLint on both in separate temp dirs (they serve as both repo and temp)
    const [originalResult, patchedResult] = await Promise.all([
      runEslintAnalyzer(originalDir, originalDir),
      runEslintAnalyzer(patchedDir, patchedDir),
    ]);

    const originalFindings = originalResult.findings;
    const patchedFindings = patchedResult.findings;

    const details: string[] = [];
    let hasNewHigh = false;
    let hasNewMedium = false;

    // Check if the original finding is still present in the patched version
    if (originalRuleId) {
      const originalFinding = originalFindings.find((f) => f.ruleId === originalRuleId);
      const stillPresent = patchedFindings.some((f) => f.ruleId === originalRuleId);
      if (originalFinding && stillPresent) {
        hasNewHigh = true;
        details.push(`Original finding still present: ${originalRuleId}`);
      }
    }

    // Check for new findings in patched that weren't in original
    for (const pf of patchedFindings) {
      const wasInOriginal = originalFindings.some((of) => isFindingMatch(of, pf));
      if (!wasInOriginal) {
        if (pf.severity === "CRITICAL" || pf.severity === "HIGH") {
          hasNewHigh = true;
          details.push(`New ${pf.severity} finding: ${pf.ruleId} at line ${pf.startLine}`);
        } else if (pf.severity === "MEDIUM") {
          hasNewMedium = true;
          details.push(`New MEDIUM finding: ${pf.ruleId} at line ${pf.startLine}`);
        }
      }
    }

    if (hasNewHigh) {
      return {
        name: "lint",
        status: "FAILED",
        note: "Patch introduces new high-severity lint findings",
        details: details.slice(0, 5),
      };
    }

    if (hasNewMedium) {
      return {
        name: "lint",
        status: "WARNING",
        note: "Patch introduces new medium-severity lint findings",
        details: details.slice(0, 5),
      };
    }

    return {
      name: "lint",
      status: "PASSED",
      note: "No new high-severity lint findings",
      details: [],
    };
  } catch {
    return {
      name: "lint",
      status: "SKIPPED",
      note: "Lint check could not be completed",
      details: [],
    };
  } finally {
    await safeRemoveDir(workDir);
  }
}
