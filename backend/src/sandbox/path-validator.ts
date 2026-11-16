import path from "node:path";

export function validateSafeRelativePosixPath(rawPath: string | null | undefined): boolean {
  if (!rawPath || typeof rawPath !== "string") {
    return false;
  }

  // Reject backslashes
  if (rawPath.includes("\\")) {
    return false;
  }

  // Reject drive letters and absolute paths
  if (rawPath.startsWith("/") || /^[a-zA-Z]:/.test(rawPath)) {
    return false;
  }

  // Reject NUL and control characters
  if (/[\x00-\x1F\x7F]/.test(rawPath)) {
    return false;
  }

  const normalized = path.posix.normalize(rawPath);
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    return false;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  for (const seg of segments) {
    if (seg === ".." || seg === ".") {
      return false;
    }
  }

  return true;
}

