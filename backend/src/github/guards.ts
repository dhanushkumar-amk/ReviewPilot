/**
 * guards.ts
 * Security enforcement for ReviewPilot repository writes and text sanitization.
 * Enforces strict branch name patterns, allowed file paths, and sanitization of untrusted text.
 */

import { validateSafeRelativePosixPath } from "../sandbox/path-validator.js";

export class SecurityGuardError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(code ? `[${code}] ${message}` : message);
    this.name = "SecurityGuardError";
  }
}

const SAFE_BRANCH_REGEX = /^reviewpilot\/fix-[a-z0-9]{6,12}-[a-z0-9]{4,8}$/;

const FORBIDDEN_PATH_PATTERNS = [
  /^\.github\/workflows\//i,
  /(?:^|\/)dockerfile/i,
  /(?:^|\/)package-lock\.json$/i,
  /(?:^|\/)pnpm-lock\.yaml$/i,
  /(?:^|\/)yarn\.lock$/i,
  /(?:^|\/)\.env(?:$|\.)/i,
];

/**
 * Ensures branch name strictly matches reviewpilot/fix-<id>-<random>.
 * Rejects force pushes, default branches (main/master), and any branch not starting with reviewpilot/.
 */
export function assertSafeBranchName(branch: string): void {
  if (!branch || typeof branch !== "string") {
    throw new SecurityGuardError("INVALID_BRANCH", "Branch name must be a non-empty string");
  }

  const trimmed = branch.trim();
  if (
    trimmed === "main" ||
    trimmed === "master" ||
    trimmed === "HEAD" ||
    trimmed.startsWith("+") ||
    trimmed.includes("..") ||
    trimmed.includes(":") ||
    trimmed.includes("~") ||
    trimmed.includes("^") ||
    trimmed.includes(" ")
  ) {
    throw new SecurityGuardError("FORBIDDEN_BRANCH", `Branch '${branch}' is forbidden`);
  }

  if (!SAFE_BRANCH_REGEX.test(trimmed)) {
    throw new SecurityGuardError(
      "INVALID_BRANCH_NAME",
      `Branch '${branch}' does not match required pattern reviewpilot/fix-<id>-<random>`
    );
  }
}

/**
 * Ensures the target file path is safe and does not modify sensitive files
 * (.github/workflows, Dockerfile, lockfiles, or .env).
 */
export function assertAllowedFilePath(filePath: string): void {
  if (!validateSafeRelativePosixPath(filePath)) {
    throw new SecurityGuardError("INVALID_FILE_PATH", `Path '${filePath}' is not a safe relative POSIX path`);
  }

  for (const pattern of FORBIDDEN_PATH_PATTERNS) {
    if (pattern.test(filePath)) {
      throw new SecurityGuardError("SENSITIVE_FILE_FORBIDDEN", `Modifying '${filePath}' is forbidden`);
    }
  }
}

/**
 * Sanitizes untrusted text for PR titles and descriptions:
 * - Strips markdown links [text](url) -> text, images ![alt](url) -> ""
 * - Strips HTML tags
 * - Strips code fences and backticks
 * - Strips raw URLs
 * - Neutralizes @mentions by inserting a zero-width space (\u200B) after @
 * - Neutralizes issue references (#123 -> #\u200B123) and closing keywords (fixes, closes, resolves)
 * - Caps at 600 characters
 * - Ensures zero source code in the body
 */
export function sanitizeText(text: string, maxLen = 600): string {
  if (!text || typeof text !== "string") return "";

  let cleaned = text;

  // 1. Strip code fences: ```lang ... ``` -> ""
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");

  // 2. Strip inline code: `...` -> ...
  cleaned = cleaned.replace(/`([^`]*)`/g, "$1");

  // 3. Strip markdown images: ![alt](url) -> ""
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");

  // 4. Strip markdown links: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // 5. Strip raw URLs (http, https)
  cleaned = cleaned.replace(/https?:\/\/[^\s)]+/gi, " ");

  // 6. Strip HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // 7. Neutralize closing keywords followed by issue references:
  // e.g. "fixes #123", "closes #456", "resolves #789"
  cleaned = cleaned.replace(/\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi, "$1 #\u200B$2");

  // 8. Neutralize any remaining issue references: #123 -> #\u200B123
  cleaned = cleaned.replace(/#(\d+)/g, "#\u200B$1");

  // 9. Neutralize @mentions: @username -> @\u200Busername
  cleaned = cleaned.replace(/@([a-zA-Z0-9_-]+)/g, "@\u200B$1");

  // 10. Normalize whitespace
  cleaned = cleaned.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n\n").trim();

  // 11. Cap at maxLen
  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen).trim() + "…";
  }

  return cleaned;
}

