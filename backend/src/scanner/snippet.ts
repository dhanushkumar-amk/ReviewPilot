import fs from "node:fs/promises";
import path from "node:path";

export async function extractSnippet(
  repoDir: string,
  relPath: string,
  startLine: number,
  category: string,
): Promise<string | null> {
  // Never extract snippets for SECRET findings
  if (category === "SECRET") {
    return null;
  }

  const fullPath = path.join(repoDir, relPath);
  try {
    const content = await fs.readFile(fullPath, "utf8");
    const lines = content.split(/\r?\n/);
    const targetIdx = startLine - 1;
    if (targetIdx < 0 || targetIdx >= lines.length) {
      return null;
    }

    const startIdx = Math.max(0, targetIdx - 1);
    const endIdx = Math.min(lines.length - 1, targetIdx + 1);

    const snippetLines: string[] = [];
    for (let i = startIdx; i <= endIdx; i++) {
      let line = lines[i];
      // Strip control characters
      line = line.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
      if (line.length > 200) {
        line = line.slice(0, 197) + "...";
      }
      snippetLines.push(line);
    }

    const res = snippetLines.join("\n");
    return res.length > 600 ? res.slice(0, 597) + "..." : res;
  } catch {
    return null;
  }
}

