import path from "node:path";
import type { Octokit } from "octokit";
import { AiError } from "./providers.js";

const MAX_FILE_SIZE_BYTES = 512 * 1024; // 512 KB

export interface FileContextWindow {
  fullContent: string;
  windowContent: string;
  startWindowLine: number;
  endWindowLine: number;
  totalLines: number;
}

export function isBinaryBuffer(buffer: Buffer): boolean {
  // Check first 800 bytes for null bytes
  const len = Math.min(buffer.length, 800);
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export async function fetchFileContext(options: {
  octokit: Octokit;
  owner: string;
  repo: string;
  commitSha: string;
  filePath: string;
  targetLine: number;
}): Promise<FileContextWindow> {
  const { octokit, owner, repo, commitSha, filePath, targetLine } = options;

  // Validate relative posix path
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("..") || normalized.includes("/../") || normalized === "..") {
    throw new AiError("FILE_NOT_FOUND", "Invalid file path");
  }

  let fileData: any;
  try {
    const res = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: normalized,
      ref: commitSha,
    });
    fileData = res.data;
  } catch (err: any) {
    if (err.status === 404) {
      throw new AiError("FILE_NOT_FOUND", "File not found in repository");
    }
    throw new AiError("AI_UNAVAILABLE", "Failed to retrieve file contents from GitHub");
  }

  if (Array.isArray(fileData) || fileData.type !== "file" || !fileData.content) {
    throw new AiError("FILE_NOT_FOUND", "Target is not a file");
  }

  if (fileData.size > MAX_FILE_SIZE_BYTES) {
    throw new AiError("FILE_TOO_LARGE", "File exceeds maximum size for AI analysis");
  }

  const rawBuffer = Buffer.from(fileData.content, fileData.encoding || "base64");
  if (isBinaryBuffer(rawBuffer)) {
    throw new AiError("FILE_TOO_LARGE", "Binary files cannot be analyzed with AI");
  }

  const fullContent = rawBuffer.toString("utf8");
  const lines = fullContent.split(/\r?\n/);
  const totalLines = lines.length;

  const lineIdx = targetLine - 1;
  const startWindowIdx = Math.max(0, lineIdx - 40);
  const endWindowIdx = Math.min(totalLines - 1, lineIdx + 40);

  const windowSlice = lines.slice(startWindowIdx, endWindowIdx + 1);
  const windowContent = windowSlice.join("\n");

  return {
    fullContent,
    windowContent,
    startWindowLine: startWindowIdx + 1,
    endWindowLine: endWindowIdx + 1,
    totalLines,
  };
}

