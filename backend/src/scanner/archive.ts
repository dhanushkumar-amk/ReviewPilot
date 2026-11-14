import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";
import type { Octokit } from "octokit";

export class ScannerArchiveError extends Error {
  constructor(
    public readonly code:
      | "REPO_TOO_LARGE"
      | "TOO_MANY_FILES"
      | "UNSAFE_ARCHIVE"
      | "DOWNLOAD_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "ScannerArchiveError";
  }
}

const WINDOWS_RESERVED_NAMES = new Set([
  "CON", "PRN", "AUX", "NUL",
  "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
]);

export interface ArchiveLimits {
  maxArchiveMb: number;
  maxFiles: number;
  maxFileKb: number;
}

export interface ExtractResult {
  fileCount: number;
  totalBytes: number;
  skippedLarge: number;
}

export function validateTarEntryPath(rawPath: string): { safe: boolean; reason?: string } {
  if (!rawPath || typeof rawPath !== "string") {
    return { safe: false, reason: "Empty path" };
  }

  // Reject paths exceeding 240 chars
  if (rawPath.length > 240) {
    return { safe: false, reason: "Path exceeds 240 characters" };
  }

  // Reject backslashes, drive letters, absolute paths
  if (rawPath.includes("\\") || /^[a-zA-Z]:/.test(rawPath) || rawPath.startsWith("/")) {
    return { safe: false, reason: "Forbidden path format (absolute, drive letter, or backslash)" };
  }

  const normalized = path.posix.normalize(rawPath);
  if (normalized.startsWith("..") || normalized.includes("/../") || normalized === "..") {
    return { safe: false, reason: "Path traversal attempt" };
  }

  const segments = normalized.split("/").filter(Boolean);
  for (const seg of segments) {
    if (seg === "..") {
      return { safe: false, reason: "Path traversal attempt" };
    }
    const baseName = seg.split(".")[0].toUpperCase();
    if (WINDOWS_RESERVED_NAMES.has(baseName)) {
      return { safe: false, reason: `Windows reserved device name: ${seg}` };
    }
  }

  return { safe: true };
}

export async function downloadAndExtract(options: {
  octokit: Octokit;
  owner: string;
  repo: string;
  sha: string;
  destDir: string;
  limits: ArchiveLimits;
}): Promise<ExtractResult> {
  const { octokit, owner, repo, sha, destDir, limits } = options;
  const maxArchiveBytes = limits.maxArchiveMb * 1024 * 1024;
  const maxExtractedBytes = maxArchiveBytes * 4;
  const maxFileBytes = limits.maxFileKb * 1024;

  let downloadedBytes = 0;
  let fileCount = 0;
  let totalExtractedBytes = 0;
  let skippedLarge = 0;

  let stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream;
  try {
    const response = await octokit.request("GET /repos/{owner}/{repo}/tarball/{sha}", {
      owner,
      repo,
      sha,
      request: {
        parseSuccessResponseBody: false,
      },
    });
    stream = response.data as unknown as (ReadableStream<Uint8Array> | NodeJS.ReadableStream);
  } catch (err) {
    throw new ScannerArchiveError("DOWNLOAD_FAILED", "Failed to download tarball from GitHub");
  }

  const nodeReadable =
    typeof (stream as NodeJS.ReadableStream).on === "function"
      ? (stream as NodeJS.ReadableStream)
      : Readable.fromWeb(stream as unknown as import("node:stream/web").ReadableStream);

  const countingStream = new Readable({
    read() {},
  });

  const extractStream = tar.extract({
    cwd: destDir,
    strip: 1,
    strict: true,
    filter: (entryPath, entry) => {
      // Reject symlinks, hardlinks, devices, fifos
      const type = (entry as { type?: string }).type || "File";
      if (type === "SymbolicLink" || type === "Link" || type === "CharacterDevice" || type === "BlockDevice" || type === "FIFO") {
        throw new ScannerArchiveError("UNSAFE_ARCHIVE", `Unsafe archive entry type: ${type}`);
      }

      if (type !== "File" && type !== "Directory") {
        throw new ScannerArchiveError("UNSAFE_ARCHIVE", `Unsupported entry type: ${type}`);
      }

      const check = validateTarEntryPath(entryPath);
      if (!check.safe) {
        throw new ScannerArchiveError("UNSAFE_ARCHIVE", check.reason ?? "Invalid entry path");
      }

      if (type === "File") {
        fileCount++;
        if (fileCount > limits.maxFiles) {
          throw new ScannerArchiveError("TOO_MANY_FILES", `Archive exceeds maximum file count of ${limits.maxFiles}`);
        }

        const size = (entry as { size?: number }).size ?? 0;
        totalExtractedBytes += size;
        if (totalExtractedBytes > maxExtractedBytes) {
          throw new ScannerArchiveError("REPO_TOO_LARGE", "Extracted size exceeds limit");
        }

        if (size > maxFileBytes) {
          skippedLarge++;
          return false; // Skip extracting this file
        }
      }

      return true;
    },
  });

  const downloadTracking = async () => {
    for await (const chunk of nodeReadable) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      downloadedBytes += buf.length;
      if (downloadedBytes > maxArchiveBytes) {
        throw new ScannerArchiveError("REPO_TOO_LARGE", `Archive download exceeds limit of ${limits.maxArchiveMb}MB`);
      }
      countingStream.push(buf);
    }
    countingStream.push(null);
  };

  try {
    await Promise.all([
      downloadTracking(),
      pipeline(countingStream, extractStream),
    ]);
  } catch (err) {
    if (err instanceof ScannerArchiveError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("UNSAFE_ARCHIVE") || message.includes("tar")) {
      throw new ScannerArchiveError("UNSAFE_ARCHIVE", message);
    }
    throw new ScannerArchiveError("DOWNLOAD_FAILED", message);
  }

  return {
    fileCount,
    totalBytes: totalExtractedBytes,
    skippedLarge,
  };
}

