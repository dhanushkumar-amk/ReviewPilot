import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FindingCategory, FindingTool } from "./normalize.js";

export async function computeFingerprint(options: {
  repoDir: string;
  tool: FindingTool;
  ruleId: string;
  category: FindingCategory;
  filePath: string;
  startLine: number;
  occurrenceIndex: number;
}): Promise<string> {
  const { repoDir, tool, ruleId, category, filePath, startLine, occurrenceIndex } = options;

  if (category === "SECRET") {
    // For SECRET: sha256 of ruleId + filePath + occurrenceIndex (NO line text or secret text)
    const content = `${ruleId}:${filePath}:${occurrenceIndex}`;
    return crypto.createHash("sha256").update(content, "utf8").digest("hex");
  }

  let lineText = "";
  try {
    const fullPath = path.join(repoDir, filePath);
    const fileContent = await fs.readFile(fullPath, "utf8");
    const lines = fileContent.split(/\r?\n/);
    const targetIdx = startLine - 1;
    if (targetIdx >= 0 && targetIdx < lines.length) {
      // normalized text of the flagged line (trimmed, whitespace collapsed)
      lineText = lines[targetIdx].trim().replace(/\s+/g, " ");
    }
  } catch {
    // If file cannot be read, fallback to empty lineText
  }

  const content = `${tool}:${ruleId}:${filePath}:${lineText}:${occurrenceIndex}`;
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

