import { z } from "zod";

export type FindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type FindingCategory = "SECURITY" | "BUG" | "PERFORMANCE" | "QUALITY" | "SECRET";
export type FindingTool = "ESLINT" | "SEMGREP" | "GITLEAKS";

export interface NormalizedFinding {
  tool: FindingTool;
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  message: string;
  filePath: string;
  startLine: number;
  endLine: number;
  snippet?: string | null;
}

const KNOWN_RULE_TITLES: Record<string, string> = {
  // ESLint Security rules
  "security/detect-eval-with-expression": "Use of eval with dynamic expression",
  "security/detect-child-process": "Execution of child process",
  "security/detect-non-literal-require": "Non-literal require or dynamic import",
  "security/detect-non-literal-fs-filename": "Non-literal file system path access",
  "security/detect-unsafe-regex": "Use of potentially unsafe regular expression",
  "security/detect-possible-timing-attacks": "Possible timing attack in string comparison",
  "security/detect-pseudoRandomBytes": "Use of insecure pseudoRandomBytes",
  "security/detect-buffer-noassert": "Use of Buffer method with noAssert flag",
  "security/detect-disable-mustache-escape": "Disabled template escaping",
  
  // Additional Security & Injection rules
  "no-implied-eval": "Use of implied eval in timer or callback",
  "no-new-func": "Dynamic Function constructor invocation",
  "no-script-url": "Use of javascript: URL protocol",
  "no-proto": "Use of deprecated __proto__ property",

  // Async & Logic Bug rules
  "no-async-promise-executor": "Async function passed to Promise executor",
  "no-constant-binary-expression": "Constant binary expression always evaluates to the same value",
  "no-loss-of-precision": "Numeric literal causes precision loss",
  "no-compare-neg-zero": "Comparison against negative zero (-0)",
  "no-unsafe-negation": "Unexpected negation of left operand in relational expression",
  "no-fallthrough": "Unintentional fallthrough in switch case statement",

  // ESLint Bug rules
  "no-unreachable": "Unreachable code detected",
  "no-dupe-keys": "Duplicate key in object literal",
  "no-unsafe-finally": "Unsafe control flow in finally block",
  "no-self-assign": "Self assignment of variable or property",
  "use-isnan": "Invalid comparison with NaN",
  "valid-typeof": "Invalid typeof comparison",
};

export function cleanMessage(rawMsg: string): string {
  if (!rawMsg) return "";
  // Strip control characters (except common whitespace) and truncate to 500 chars
  const sanitized = rawMsg.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return sanitized.length > 500 ? sanitized.slice(0, 497) + "..." : sanitized;
}

export function sanitizePosixPath(rawPath: string): string | null {
  if (!rawPath || typeof rawPath !== "string") return null;
  const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("..") || normalized.includes("/../") || normalized === "..") {
    return null;
  }
  return normalized;
}

export function getRuleTitle(ruleId: string, fallback?: string): string {
  if (KNOWN_RULE_TITLES[ruleId]) {
    return KNOWN_RULE_TITLES[ruleId];
  }
  return fallback || ruleId;
}

