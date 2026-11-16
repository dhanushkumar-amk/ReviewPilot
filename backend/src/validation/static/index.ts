/**
 * static/index.ts
 * Runs all Layer 1 static checks and returns a combined result.
 * Static checks NEVER claim tests were run.
 */

import { checkSyntax, type StaticCheckResult } from "./syntax.js";
import { checkDifferentialLint } from "./differential-lint.js";
import { checkSecrets } from "./secrets.js";
import { checkRiskGate, type RiskLevel } from "./risk-gate.js";

export type { StaticCheckResult, StaticCheckStatus } from "./syntax.js";
export type { RiskLevel } from "./risk-gate.js";

export interface StaticValidationResult {
  checks: StaticCheckResult[];
  riskLevel: RiskLevel;
  /** True if any check FAILED — the overall validation should FAIL without calling Lambda */
  anyFailed: boolean;
}

export async function runStaticChecks(options: {
  filePath: string;
  originalContent: string;
  patchedContent: string;
  originalRuleId?: string;
}): Promise<StaticValidationResult> {
  const { filePath, originalContent, patchedContent, originalRuleId } = options;

  const checks: StaticCheckResult[] = [];

  // 1. Syntax check (synchronous, TypeScript compiler API)
  const syntaxResult = checkSyntax({ filePath, originalContent, patchedContent });
  checks.push(syntaxResult);

  // 2. Differential lint (runs ESLint in child process)
  const lintResult = await checkDifferentialLint({
    filePath,
    originalContent,
    patchedContent,
    originalRuleId,
  });
  checks.push(lintResult);

  // 3. Secret detection (runs Gitleaks in child process)
  const secretsResult = await checkSecrets({ filePath, patchedContent });
  checks.push(secretsResult);

  // 4. Risk gate (synchronous analysis)
  const { check: riskCheck, riskLevel } = checkRiskGate({
    filePath,
    originalContent,
    patchedContent,
  });
  checks.push(riskCheck);

  const anyFailed = checks.some((c) => c.status === "FAILED");

  return { checks, riskLevel, anyFailed };
}
