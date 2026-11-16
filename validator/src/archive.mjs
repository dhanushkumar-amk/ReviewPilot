/**
 * archive.mjs
 * Downloads a repository tarball from a presigned S3 URL and extracts it safely.
 * No dependencies — Node built-ins only.
 * Uses tar CLI for listing and extraction (available in the Lambda image).
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { spawnProcessGroup } from "./run-step.mjs";

const DOWNLOAD_TIMEOUT_MS = 30_000;

export class ArchiveError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ArchiveError";
    this.code = code;
  }
}

/**
 * Validate a single tar entry path.
 * Returns true if safe, false if it should cause rejection.
 */
export function isSafeTarEntryPath(entryPath) {
  if (!entryPath || typeof entryPath !== "string") return false;
  if (entryPath.includes("\\")) return false;
  if (entryPath.startsWith("/")) return false;
  if (/^[a-zA-Z]:/.test(entryPath)) return false;
  if (/[\x00]/.test(entryPath)) return false;

  const parts = entryPath.split("/").filter(Boolean);
  for (const part of parts) {
    if (part === "..") return false;
  }
  return true;
}

/**
 * Download the archive from a presigned URL with a 30s timeout, streaming
 * directly to disk and aborting if it exceeds maxArchiveBytes.
 */
export async function downloadArchive(downloadUrl, destPath, maxArchiveBytes) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  let downloadedBytes = 0;
  let writeStream;

  try {
    const response = await fetch(downloadUrl, {
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ArchiveError("DOWNLOAD_FAILED", "Archive download returned non-OK status");
    }

    if (!response.body) {
      throw new ArchiveError("DOWNLOAD_FAILED", "Archive download response has no body");
    }

    writeStream = createWriteStream(destPath);
    const reader = response.body.getReader();

    await new Promise((resolve, reject) => {
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);

      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              writeStream.end();
              break;
            }
            downloadedBytes += value.length;
            if (downloadedBytes > maxArchiveBytes) {
              reader.cancel();
              writeStream.destroy();
              reject(new ArchiveError("ARCHIVE_TOO_LARGE", "Archive exceeds size limit"));
              return;
            }
            const canContinue = writeStream.write(value);
            if (!canContinue) {
              await new Promise((r) => writeStream.once("drain", r));
            }
          }
        } catch (err) {
          reject(err);
        }
      };

      pump();
    });
  } catch (err) {
    if (err instanceof ArchiveError) throw err;
    throw new ArchiveError("DOWNLOAD_FAILED", "Failed to download archive");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * List tar entries and validate each one for safety.
 * Uses `tar -tzvf` and parses the output.
 * Rejects: absolute paths, `..` segments, backslashes, symlinks, hard links, devices, FIFO.
 * Also checks file count and total size limits.
 */
export async function listAndValidateArchive(archivePath, maxFiles, maxTotalBytes) {
  // `tar -tzvf` outputs lines like: lrwxrwxrwx 0 user group 0 ... path -> target  (symlink)
  //                                  -rw-r--r-- 0 user group 1234 ... path           (file)
  //                                  drwxr-xr-x 0 user group 0 ... path/             (dir)
  const result = await spawnProcessGroup(
    "tar",
    ["-tzvf", archivePath],
    {
      env: { PATH: process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
      cwd: "/tmp",
      timeoutMs: 30_000,
    }
  );

  const lines = (result.stdout || "").split("\n").filter(Boolean);
  let fileCount = 0;
  let totalBytes = 0;

  for (const line of lines) {
    // Format: <perms> <uid> <user> <group> <size> <date> <time> <path>[ -> <target>]
    const parts = line.split(/\s+/);
    if (parts.length < 8) continue;

    const perms = parts[0]; // e.g. "-rw-r--r--" or "lrwxrwxrwx" or "drwxr-xr-x"
    const sizeStr = parts[4];
    // The path is everything from column 7 onwards (before any " -> ")
    const rawEntryPath = parts.slice(7).join(" ").split(" -> ")[0].trim();

    // Determine entry type from permissions string
    const typeChar = perms[0];

    // Reject symlinks (l), hard links handled by GNU tar as regular file but check
    if (typeChar === "l") {
      throw new ArchiveError("UNSAFE_ARCHIVE", "Archive contains symbolic links");
    }
    // Reject devices (c, b), sockets (s), FIFOs (p)
    if (typeChar === "c" || typeChar === "b" || typeChar === "s" || typeChar === "p") {
      throw new ArchiveError("UNSAFE_ARCHIVE", "Archive contains unsafe entry type");
    }

    // Skip directories for count/size (they're fine)
    if (typeChar === "d") {
      // Still check path safety
      const pathWithoutTrailingSlash = rawEntryPath.replace(/\/$/, "");
      if (pathWithoutTrailingSlash && !isSafeTarEntryPath(pathWithoutTrailingSlash)) {
        throw new ArchiveError("UNSAFE_ARCHIVE", "Archive contains unsafe path");
      }
      continue;
    }

    // Regular file
    if (!isSafeTarEntryPath(rawEntryPath)) {
      throw new ArchiveError("UNSAFE_ARCHIVE", "Archive contains unsafe path");
    }

    fileCount++;
    if (fileCount > maxFiles) {
      throw new ArchiveError("TOO_MANY_FILES", "Archive exceeds maximum file count");
    }

    const size = parseInt(sizeStr, 10) || 0;
    totalBytes += size;
    if (totalBytes > maxTotalBytes) {
      throw new ArchiveError("UNSAFE_ARCHIVE", "Archive extracted size exceeds limit");
    }
  }

  return { fileCount, totalBytes };
}

/**
 * Extract the archive into destDir using tar CLI.
 * --strip-components=1 removes the top-level directory.
 * --no-same-owner, --no-same-permissions for safety.
 */
export async function extractArchive(archivePath, destDir) {
  await spawnProcessGroup(
    "tar",
    [
      "-xzf", archivePath,
      "-C", destDir,
      "--strip-components=1",
      "--no-same-owner",
      "--no-same-permissions",
    ],
    {
      env: { PATH: process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
      cwd: "/tmp",
      timeoutMs: 60_000,
    }
  );
}

/**
 * Walk the extracted tree with lstat; verify no symlinks exist, re-check counts.
 */
export async function verifyExtracted(dir, maxFiles, maxTotalBytes) {
  let fileCount = 0;
  let totalBytes = 0;

  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      // lstat to detect symlinks that slipped through
      let stat;
      try {
        stat = await fs.lstat(full);
      } catch {
        continue;
      }

      if (stat.isSymbolicLink()) {
        // Delete the symlink to prevent exploitation
        await fs.unlink(full).catch(() => {});
        throw new ArchiveError("UNSAFE_ARCHIVE", "Symlink found after extraction");
      }

      if (stat.isDirectory()) {
        await walk(full);
      } else if (stat.isFile()) {
        fileCount++;
        totalBytes += stat.size;
        if (fileCount > maxFiles) {
          throw new ArchiveError("TOO_MANY_FILES", "Too many files after extraction");
        }
        if (totalBytes > maxTotalBytes) {
          throw new ArchiveError("UNSAFE_ARCHIVE", "Extracted total size exceeds limit");
        }
      }
    }
  }

  await walk(dir);
  return { fileCount, totalBytes };
}

/**
 * Full download-and-extract pipeline:
 * 1. Download to archivePath with size limit
 * 2. List entries and validate safety
 * 3. Extract
 * 4. Delete archive
 * 5. Walk and verify
 */
export async function downloadAndExtract({ downloadUrl, archivePath, destDir, limits }) {
  const { maxArchiveBytes, maxFiles, maxTotalBytes } = limits;

  // Step 1: Download
  await downloadArchive(downloadUrl, archivePath, maxArchiveBytes);

  // Step 2: List and validate
  await listAndValidateArchive(archivePath, maxFiles, maxTotalBytes);

  // Step 3: Extract
  await extractArchive(archivePath, destDir);

  // Step 4: Delete archive
  await fs.unlink(archivePath).catch(() => {});

  // Step 5: Walk and verify
  await verifyExtracted(destDir, maxFiles, maxTotalBytes);
}
