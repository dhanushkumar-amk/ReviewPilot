import { prisma } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { computeFingerprint } from "./fingerprint.js";
import type { FindingTool, NormalizedFinding } from "./normalize.js";
import { extractSnippet } from "./snippet.js";

export interface PersistResult {
  storedCount: number;
}

export async function persistFindings(options: {
  workspaceId: string;
  repositoryId: string;
  scanId: string;
  repoDir: string;
  findings: NormalizedFinding[];
  completedTools: FindingTool[];
}): Promise<PersistResult> {
  const { workspaceId, repositoryId, scanId, repoDir, findings, completedTools } = options;

  // Track occurrence index per ruleId + filePath to ensure stable fingerprinting
  const occurrenceMap = new Map<string, number>();

  interface FindingWithFingerprint {
    finding: NormalizedFinding;
    fingerprint: string;
    snippet: string | null;
  }

  const enriched: FindingWithFingerprint[] = [];
  for (const f of findings) {
    const key = `${f.tool}:${f.ruleId}:${f.filePath}`;
    const occ = (occurrenceMap.get(key) ?? 0) + 1;
    occurrenceMap.set(key, occ);

    const fp = await computeFingerprint({
      repoDir,
      tool: f.tool,
      ruleId: f.ruleId,
      category: f.category,
      filePath: f.filePath,
      startLine: f.startLine,
      occurrenceIndex: occ,
    });

    const snippet = await extractSnippet(repoDir, f.filePath, f.startLine, f.category);

    enriched.push({
      finding: f,
      fingerprint: fp,
      snippet,
    });
  }

  const seenFingerprints = new Set(enriched.map((e) => e.fingerprint));
  const now = new Date();

  // Batch process in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < enriched.length; i += CHUNK_SIZE) {
    const chunk = enriched.slice(i, i + CHUNK_SIZE);

    await prisma.$transaction(
      async (tx) => {
        for (const item of chunk) {
          const { finding, fingerprint, snippet } = item;

          const existing = await tx.finding.findUnique({
            where: {
              repositoryId_fingerprint: {
                repositoryId,
                fingerprint,
              },
            },
          });

          if (!existing) {
            await tx.finding.create({
              data: {
                workspaceId,
                repositoryId,
                firstScanId: scanId,
                lastScanId: scanId,
                fingerprint,
                tool: finding.tool,
                ruleId: finding.ruleId,
                severity: finding.severity,
                category: finding.category,
                title: finding.title,
                message: finding.message,
                filePath: finding.filePath,
                startLine: finding.startLine,
                endLine: finding.endLine,
                snippet,
                status: "OPEN",
                firstSeenAt: now,
                lastSeenAt: now,
              },
            });
          } else {
            // Lifecycle rules:
            // FIXED that reappears = OPEN again
            // REJECTED stays REJECTED
            // ACCEPTED stays ACCEPTED
            let nextStatus = existing.status;
            if (existing.status === "FIXED") {
              nextStatus = "OPEN";
            }

            await tx.finding.update({
              where: { id: existing.id },
              data: {
                lastScanId: scanId,
                lastSeenAt: now,
                severity: finding.severity,
                title: finding.title,
                message: finding.message,
                startLine: finding.startLine,
                endLine: finding.endLine,
                snippet,
                status: nextStatus,
                resolvedAt: nextStatus === "FIXED" ? existing.resolvedAt : null,
              },
            });
          }
        }
      },
      { maxWait: 10_000, timeout: 60_000 },
    );
  }

  // Auto-resolve: For tools that COMPLETED in this scan only, mark OPEN or ACCEPTED
  // findings of this repository that were not seen as FIXED.
  // NEVER auto-resolve findings of a tool that failed or was skipped.
  if (completedTools.length > 0) {
    await prisma.finding.updateMany({
      where: {
        repositoryId,
        tool: { in: completedTools },
        fingerprint: { notIn: Array.from(seenFingerprints) },
        status: { in: ["OPEN", "ACCEPTED"] },
      },
      data: {
        status: "FIXED",
        resolvedAt: now,
      },
    });
  }

  // Update Scan.findingsCount
  await prisma.scan.update({
    where: { id: scanId },
    data: {
      findingsCount: enriched.length,
    },
  });

  return { storedCount: enriched.length };
}

