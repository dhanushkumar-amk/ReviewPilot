/**
 * validate-event.mjs
 * Strict hand-written validation of the Lambda event payload.
 * No dependencies — Node built-ins only.
 * Never echoes input back in error messages.
 */

// UUID v4 regex
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// S3 presigned URL host patterns
// Accepts: <bucket>.s3.<region>.amazonaws.com  or  s3.<region>.amazonaws.com/<bucket>
const S3_HOST_RE = /^(?:[a-z0-9][a-z0-9.\-]*\.)?s3\.[a-z0-9\-]+\.amazonaws\.com$/i;

const MAX_ARCHIVE_BYTES_HARD = 200 * 1024 * 1024; // 200 MB absolute ceiling
const MAX_FILES_HARD = 50_000;
const MAX_TOTAL_BYTES_HARD = 500 * 1024 * 1024; // 500 MB
const MAX_CONTENT_BYTES = 300 * 1024; // 300 KB per patched/original content
const MAX_PATH_CHARS = 240;

export class EventValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EventValidationError";
    this.code = code;
  }
}

/**
 * Validate a safe relative POSIX path.
 * Rejects: absolute paths, backslashes, NUL, `..` segments, too long, empty.
 */
export function validateSafeRelativePosixPath(raw) {
  if (!raw || typeof raw !== "string") return false;
  if (raw.length > MAX_PATH_CHARS) return false;
  if (raw.startsWith("/")) return false;
  if (/^[a-zA-Z]:/.test(raw)) return false;
  if (raw.includes("\\")) return false;
  if (/[\x00-\x1F\x7F]/.test(raw)) return false;

  // Normalize and check for traversal
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return false;
  for (const part of parts) {
    if (part === ".." || part === ".") return false;
  }
  return true;
}

function validateDownloadUrl(raw) {
  if (!raw || typeof raw !== "string") return false;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  // Must be HTTPS only
  if (url.protocol !== "https:") return false;

  // Must not have credentials embedded
  if (url.username || url.password) return false;

  // Host must match S3 pattern
  if (!S3_HOST_RE.test(url.hostname)) return false;

  // Must not be an IP address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return false;

  return true;
}

/**
 * Validate and return a sanitized event object.
 * Throws EventValidationError with a fixed code on any problem.
 */
export function validateEvent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new EventValidationError("INVALID_EVENT", "Event must be a plain object");
  }

  // runId
  if (typeof raw.runId !== "string" || !UUID_RE.test(raw.runId)) {
    throw new EventValidationError("INVALID_EVENT", "runId must be a UUID v4");
  }

  // downloadUrl
  if (!validateDownloadUrl(raw.downloadUrl)) {
    throw new EventValidationError("INVALID_EVENT", "downloadUrl is not a valid S3 HTTPS URL");
  }

  // targetPath
  if (!validateSafeRelativePosixPath(raw.targetPath)) {
    throw new EventValidationError("INVALID_EVENT", "targetPath is not a safe relative POSIX path");
  }

  // patchedContentBase64
  if (typeof raw.patchedContentBase64 !== "string") {
    throw new EventValidationError("INVALID_EVENT", "patchedContentBase64 must be a string");
  }
  let patchedContent;
  try {
    patchedContent = Buffer.from(raw.patchedContentBase64, "base64");
  } catch {
    throw new EventValidationError("INVALID_EVENT", "patchedContentBase64 is not valid base64");
  }
  if (patchedContent.length > MAX_CONTENT_BYTES) {
    throw new EventValidationError("INVALID_EVENT", "patchedContent exceeds 300 KB limit");
  }

  // originalContentBase64
  if (typeof raw.originalContentBase64 !== "string") {
    throw new EventValidationError("INVALID_EVENT", "originalContentBase64 must be a string");
  }
  let originalContent;
  try {
    originalContent = Buffer.from(raw.originalContentBase64, "base64");
  } catch {
    throw new EventValidationError("INVALID_EVENT", "originalContentBase64 is not valid base64");
  }
  if (originalContent.length > MAX_CONTENT_BYTES) {
    throw new EventValidationError("INVALID_EVENT", "originalContent exceeds 300 KB limit");
  }

  // patchedSha256
  if (typeof raw.patchedSha256 !== "string" || !/^[0-9a-f]{64}$/i.test(raw.patchedSha256)) {
    throw new EventValidationError("INVALID_EVENT", "patchedSha256 must be a 64-char hex string");
  }

  // limits (optional object with defaults + hard caps enforced below)
  const rawLimits = raw.limits && typeof raw.limits === "object" && !Array.isArray(raw.limits)
    ? raw.limits
    : {};

  const limits = {
    maxArchiveBytes: Math.min(
      typeof rawLimits.maxArchiveBytes === "number" && rawLimits.maxArchiveBytes > 0
        ? Math.floor(rawLimits.maxArchiveBytes)
        : 50 * 1024 * 1024,
      MAX_ARCHIVE_BYTES_HARD,
    ),
    maxFiles: Math.min(
      typeof rawLimits.maxFiles === "number" && rawLimits.maxFiles > 0
        ? Math.floor(rawLimits.maxFiles)
        : 20_000,
      MAX_FILES_HARD,
    ),
    maxTotalBytes: Math.min(
      typeof rawLimits.maxTotalBytes === "number" && rawLimits.maxTotalBytes > 0
        ? Math.floor(rawLimits.maxTotalBytes)
        : 200 * 1024 * 1024,
      MAX_TOTAL_BYTES_HARD,
    ),
  };

  // Reject unexpected top-level keys to avoid confusion
  const knownKeys = new Set([
    "runId", "downloadUrl", "targetPath",
    "patchedContentBase64", "originalContentBase64",
    "patchedSha256", "limits",
  ]);
  for (const key of Object.keys(raw)) {
    if (!knownKeys.has(key)) {
      throw new EventValidationError("INVALID_EVENT", "Unexpected field in event");
    }
  }

  return {
    runId: raw.runId,
    downloadUrl: raw.downloadUrl,
    targetPath: raw.targetPath,
    patchedContent: patchedContent.toString("utf8"),
    originalContent: originalContent.toString("utf8"),
    patchedSha256: raw.patchedSha256.toLowerCase(),
    limits,
  };
}
