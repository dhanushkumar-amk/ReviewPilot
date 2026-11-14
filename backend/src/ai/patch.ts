import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runEslintAnalyzer } from "../scanner/analyzers/eslint.js";
import { safeRemoveDir } from "../scanner/run-scan.js";

const FORBIDDEN_PATH_PATTERNS = [
  /^\.github\/workflows\//i,
  /(?:^|\/)dockerfile/i,
  /(?:^|\/)package-lock\.json$/i,
  /(?:^|\/)pnpm-lock\.yaml$/i,
  /(?:^|\/)yarn\.lock$/i,
  /(?:^|\/)\.env(?:$|\.)/i,
];

// Obvious risk patterns in new code
const DANGEROUS_CODE_PATTERNS = [
  /\beval\s*\(/i,
  /\bchild_process\s*\.\s*exec\s*\(/i,
  /(?:AKIA|A3T|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
  /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----/,
];

export interface ReplacementValidation {
  valid: boolean;
  reason?: string;
}

export function validateReplacement(options: {
  filePath: string;
  startLine: number;
  endLine: number;
  newCode: string;
  windowStart: number;
  windowEnd: number;
  totalLines: number;
}): ReplacementValidation {
  const { filePath, startLine, endLine, newCode, windowStart, windowEnd, totalLines } = options;

  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (pattern.test(filePath)) {
      return { valid: false, reason: "Editing sensitive/config file is forbidden" };
    }
  }

  if (startLine < 1 || endLine < startLine || endLine > totalLines) {
    return { valid: false, reason: "Line numbers out of file bounds" };
  }

  if (startLine < windowStart || endLine > windowEnd) {
    return { valid: false, reason: "Replacement range outside permitted code window" };
  }

  const replacedLineCount = endLine - startLine + 1;
  if (replacedLineCount > 60) {
    return { valid: false, reason: "Replaced line count exceeds 60 lines limit" };
  }

  const newLineCount = newCode.split(/\r?\n/).length;
  if (newLineCount > 80) {
    return { valid: false, reason: "New code line count exceeds 80 lines limit" };
  }

  if (newCode.length > 6000) {
    return { valid: false, reason: "New code exceeds 6000 characters limit" };
  }

  // Reject NUL and control characters (except standard whitespace \r, \n, \t)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(newCode)) {
    return { valid: false, reason: "New code contains control characters" };
  }

  for (const risk of DANGEROUS_CODE_PATTERNS) {
    if (risk.test(newCode)) {
      return { valid: false, reason: "New code contains forbidden dangerous pattern" };
    }
  }

  return { valid: true };
}

export function applyReplacement(options: {
  fullContent: string;
  startLine: number;
  endLine: number;
  newCode: string;
}): { patchedContent: string; originalSlice: string } {
  const lines = options.fullContent.split(/\r?\n/);
  const startIdx = options.startLine - 1;
  const count = options.endLine - options.startLine + 1;

  const originalSlice = lines.slice(startIdx, startIdx + count).join("\n");
  const replacementLines = options.newCode.split(/\r?\n/);

  lines.splice(startIdx, count, ...replacementLines);
  const patchedContent = lines.join("\n");

  return { patchedContent, originalSlice };
}

export function buildUnifiedDiff(options: {
  filePath: string;
  fullContent: string;
  startLine: number;
  endLine: number;
  newCode: string;
}): string {
  const lines = options.fullContent.split(/\r?\n/);
  const startIdx = options.startLine - 1;
  const endIdx = options.endLine - 1;

  // 3 lines of context before and after
  const ctxBeforeStart = Math.max(0, startIdx - 3);
  const ctxBefore = lines.slice(ctxBeforeStart, startIdx);

  const removedLines = lines.slice(startIdx, endIdx + 1);
  const addedLines = options.newCode.split(/\r?\n/);

  const ctxAfterEnd = Math.min(lines.length, endIdx + 4);
  const ctxAfter = lines.slice(endIdx + 1, ctxAfterEnd);

  const origCount = ctxBefore.length + removedLines.length + ctxAfter.length;
  const newCount = ctxBefore.length + addedLines.length + ctxAfter.length;

  const hunkHeader = `@@ -${ctxBeforeStart + 1},${origCount} +${ctxBeforeStart + 1},${newCount} @@`;

  const diffLines = [
    `--- a/${options.filePath}`,
    `+++ b/${options.filePath}`,
    hunkHeader,
    ...ctxBefore.map((l) => ` ${l}`),
    ...removedLines.map((l) => `-${l}`),
    ...addedLines.map((l) => `+${l}`),
    ...ctxAfter.map((l) => ` ${l}`),
  ];

  return diffLines.join("\n");
}

export async function staticRecheck(options: {
  filePath: string;
  patchedContent: string;
  originalRuleId: string;
}): Promise<{
  passed: boolean;
  findingGone: boolean;
  newIssues: boolean;
}> {
  const tmpBase = os.tmpdir();
  const testDir = path.join(tmpBase, `reviewpilot-recheck-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  await fs.mkdir(testDir, { recursive: true, mode: 0o700 });

  try {
    const fullTarget = path.join(testDir, options.filePath);
    await fs.mkdir(path.dirname(fullTarget), { recursive: true });
    await fs.writeFile(fullTarget, options.patchedContent, "utf8");

    // Run ESLint in isolated child process
    const res = await runEslintAnalyzer(testDir, testDir);
    const findings = res.findings;

    // Check if original rule is gone
    const originalStillPresent = findings.some((f) => f.ruleId === options.originalRuleId);
    const findingGone = !originalStillPresent;

    // Check if new HIGH or CRITICAL issues appeared
    const newHighOrCrit = findings.some((f) => f.severity === "HIGH" || f.severity === "CRITICAL");

    const passed = findingGone && !newHighOrCrit;

    return {
      passed,
      findingGone,
      newIssues: newHighOrCrit,
    };
  } catch {
    return {
      passed: false,
      findingGone: false,
      newIssues: true,
    };
  } finally {
    await safeRemoveDir(testDir);
  }
}

