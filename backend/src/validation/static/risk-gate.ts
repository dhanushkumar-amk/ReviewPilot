/**
 * static/risk-gate.ts
 * Layer 1 Static Check: Risk Gate
 * Computes riskLevel LOW | MEDIUM | HIGH from the patch characteristics.
 * Rejects sensitive paths with INVALID status.
 * HIGH risk makes the overall result at most PASSED_WITH_WARNINGS.
 */

import type { StaticCheckResult } from "./syntax.js";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

// Paths that must be rejected entirely
const REJECTED_PATH_PATTERNS = [
  /^\.github\/workflows\//i,
  /(?:^|\/)dockerfile$/i,
  /(?:^|\/)package-lock\.json$/i,
  /(?:^|\/)pnpm-lock\.yaml$/i,
  /(?:^|\/)yarn\.lock$/i,
  /(?:^|\/)\.env(?:$|\.)/i,
];

// New import/require line detection
const IMPORT_LINE_RE = /^\s*(?:import\s|require\s*\(|from\s+'|from\s+")/m;

// Exported function signature change patterns
const EXPORTED_FUNCTION_RE = /\bexport\s+(?:async\s+)?function\b/g;

// Removed validation/error-handling patterns (checked in original but NOT in patched)
const SAFETY_PATTERNS = [
  /\bif\s*\(/g,                    // if guards
  /\btry\s*\{/g,                   // try/catch blocks
  /\bcatch\s*\(/g,                 // catch clauses
  /\bsanitize/gi,                  // sanitize calls
  /\bvalidate/gi,                  // validate calls
  /\bthrow\s+/g,                   // throw statements
  /\bassert\s*\(/g,                // assert calls
];

function countMatches(content: string, re: RegExp): number {
  const matches = content.match(re);
  return matches ? matches.length : 0;
}

function getChangedLineCount(original: string, patched: string): number {
  const origLines = original.split("\n");
  const patchedLines = patched.split("\n");
  let changed = Math.abs(origLines.length - patchedLines.length);
  const minLen = Math.min(origLines.length, patchedLines.length);
  for (let i = 0; i < minLen; i++) {
    if (origLines[i] !== patchedLines[i]) changed++;
  }
  return changed;
}

export interface RiskGateResult {
  check: StaticCheckResult;
  riskLevel: RiskLevel;
}

export function checkRiskGate(options: {
  filePath: string;
  originalContent: string;
  patchedContent: string;
}): RiskGateResult {
  const { filePath, originalContent, patchedContent } = options;

  // Reject sensitive paths
  for (const pattern of REJECTED_PATH_PATTERNS) {
    if (pattern.test(filePath)) {
      return {
        riskLevel: "HIGH",
        check: {
          name: "risk",
          status: "FAILED",
          note: "Cannot modify sensitive configuration file",
          details: [`Rejected path: ${filePath.slice(0, 80)}`],
        },
      };
    }
  }

  const details: string[] = [];
  let riskScore = 0;

  // Changed line count
  const changedLines = getChangedLineCount(originalContent, patchedContent);
  if (changedLines > 50) {
    riskScore += 2;
    details.push(`Large change: ${changedLines} lines modified`);
  } else if (changedLines > 20) {
    riskScore += 1;
    details.push(`Moderate change: ${changedLines} lines modified`);
  }

  // New import/require lines in patched
  const patchedLines = patchedContent.split("\n");
  const originalLines = originalContent.split("\n");
  const newImportLines = patchedLines.filter(
    (l) => IMPORT_LINE_RE.test(l) && !originalLines.includes(l)
  );
  if (newImportLines.length > 0) {
    riskScore += 1;
    details.push(`New import or require: ${newImportLines.length} line(s)`);
  }

  // Changed exported function signatures
  const origExports = countMatches(originalContent, EXPORTED_FUNCTION_RE);
  const patchedExports = countMatches(patchedContent, EXPORTED_FUNCTION_RE);
  if (Math.abs(origExports - patchedExports) > 0) {
    riskScore += 1;
    details.push("Exported function signatures changed");
  }

  // Removed validation/error-handling patterns
  for (const pattern of SAFETY_PATTERNS) {
    const origCount = countMatches(originalContent, new RegExp(pattern.source, pattern.flags));
    const patchedCount = countMatches(patchedContent, new RegExp(pattern.source, pattern.flags));
    if (patchedCount < origCount) {
      riskScore += 2;
      details.push(`Removed safety pattern: ${pattern.source.slice(0, 40)}`);
      break; // count once per category
    }
  }

  // Compute risk level
  let riskLevel: RiskLevel = "LOW";
  if (riskScore >= 4) {
    riskLevel = "HIGH";
  } else if (riskScore >= 2) {
    riskLevel = "MEDIUM";
  }

  const status = riskLevel === "HIGH" ? "WARNING" : "PASSED";
  const note =
    riskLevel === "HIGH"
      ? "High risk change — human review required"
      : riskLevel === "MEDIUM"
        ? "Moderate risk change"
        : "Low risk change";

  return {
    riskLevel,
    check: {
      name: "risk",
      status,
      note,
      details: details.slice(0, 5),
    },
  };
}
