import crypto from "node:crypto";
import { prisma } from "../db.js";
import { githubApp } from "../github/app.js";
import { fetchFileContext } from "./context.js";
import {
  applyReplacement,
  buildUnifiedDiff,
  staticRecheck,
  validateReplacement,
} from "./patch.js";
import {
  cleanOutputText,
  createExplainPrompt,
  createFixPrompt,
  explainOutputSchema,
  fixOutputSchema,
  PROMPT_VERSION,
} from "./prompts.js";
import { AiError, callModel } from "./providers.js";
import { checkAndIncrementQuota, recordTokens } from "./quota.js";
import { redactCode } from "./redact.js";

export async function explainFinding(options: {
  findingId: string;
  workspaceId: string;
}): Promise<{
  summary: string;
  whyItMatters: string;
  howToFix: string;
  cached: boolean;
  redacted: boolean;
}> {
  const { findingId, workspaceId } = options;

  const finding = await prisma.finding.findFirst({
    where: { id: findingId, workspaceId },
    include: {
      repository: {
        include: {
          installation: true,
        },
      },
    },
  });

  if (!finding) {
    throw new AiError("FILE_NOT_FOUND", "Finding not found");
  }

  // SECRET findings never call AI - return static remediation advice
  if (finding.category === "SECRET") {
    return {
      summary: "A potential hardcoded secret or credential was detected in the codebase.",
      whyItMatters:
        "Exposing secrets in code or version control allows unauthorized access to critical services and data breaches.",
      howToFix:
        "1. Immediately rotate and revoke the exposed credential.\n2. Move credentials to environment variables or a secrets manager.\n3. Verify repository git history to ensure the secret is not retained.",
      cached: false,
      redacted: true,
    };
  }

  const slashIdx = finding.repository.fullName.indexOf("/");
  const owner = finding.repository.fullName.slice(0, slashIdx);
  const repoName = finding.repository.fullName.slice(slashIdx + 1);

  const octokit = await githubApp.getInstallationOctokit(
    Number(finding.repository.installation.installationId),
  );

  const scan = await prisma.scan.findUnique({
    where: { id: finding.lastScanId },
    select: { commitSha: true },
  });

  if (!scan) {
    throw new AiError("FILE_NOT_FOUND", "Scan commit not found");
  }

  const fileCtx = await fetchFileContext({
    octokit,
    owner,
    repo: repoName,
    commitSha: scan.commitSha,
    filePath: finding.filePath,
    targetLine: finding.startLine,
  });

  // Compute hash of the window content
  const contentHash = crypto.createHash("sha256").update(fileCtx.windowContent, "utf8").digest("hex");

  // Check cache: findingId + PROMPT_VERSION
  const cachedInsight = await prisma.findingInsight.findUnique({
    where: {
      findingId_promptVersion: {
        findingId,
        promptVersion: PROMPT_VERSION,
      },
    },
  });

  if (cachedInsight && cachedInsight.contentHash === contentHash) {
    return {
      summary: cachedInsight.summary,
      whyItMatters: cachedInsight.whyItMatters,
      howToFix: cachedInsight.howToFix,
      cached: true,
      redacted: cachedInsight.redacted,
    };
  }

  // Redaction pass
  const { text: redactedWindow, redacted } = redactCode(fileCtx.windowContent);

  // Check & increment quota atomically
  await checkAndIncrementQuota(workspaceId);

  const prompt = createExplainPrompt({
    ruleId: finding.ruleId,
    ruleTitle: finding.title,
    message: finding.message,
    filePath: finding.filePath,
    targetLine: finding.startLine,
    startWindowLine: fileCtx.startWindowLine,
    endWindowLine: fileCtx.endWindowLine,
    codeWindow: redactedWindow,
  });

  const modelResult = await callModel({
    system: prompt.system,
    user: prompt.user,
    schema: explainOutputSchema,
  });

  await recordTokens({
    workspaceId,
    tokensIn: modelResult.usage.promptTokens,
    tokensOut: modelResult.usage.completionTokens,
  });

  const summary = cleanOutputText(modelResult.object.summary, 1500);
  const whyItMatters = cleanOutputText(modelResult.object.whyItMatters, 1500);
  const howToFix = cleanOutputText(modelResult.object.howToFix, 1500);

  // Upsert insight cache
  await prisma.findingInsight.upsert({
    where: {
      findingId_promptVersion: {
        findingId,
        promptVersion: PROMPT_VERSION,
      },
    },
    create: {
      workspaceId,
      findingId,
      promptVersion: PROMPT_VERSION,
      contentHash,
      summary,
      whyItMatters,
      howToFix,
      provider: modelResult.provider,
      model: modelResult.model,
      redacted,
    },
    update: {
      contentHash,
      summary,
      whyItMatters,
      howToFix,
      provider: modelResult.provider,
      model: modelResult.model,
      redacted,
    },
  });

  return {
    summary,
    whyItMatters,
    howToFix,
    cached: false,
    redacted,
  };
}

export async function draftFix(options: {
  findingId: string;
  workspaceId: string;
  userId: string;
}): Promise<any> {
  const { findingId, workspaceId, userId } = options;

  const finding = await prisma.finding.findFirst({
    where: { id: findingId, workspaceId },
    include: {
      repository: {
        include: {
          installation: true,
        },
      },
    },
  });

  if (!finding) {
    throw new AiError("FILE_NOT_FOUND", "Finding not found");
  }

  if (finding.category === "SECRET") {
    throw new AiError("SECRET_FINDING", "Cannot draft automatic fix for secret findings");
  }

  if (finding.status === "FIXED") {
    throw new AiError("AI_INVALID_OUTPUT", "Finding is already resolved");
  }

  const slashIdx = finding.repository.fullName.indexOf("/");
  const owner = finding.repository.fullName.slice(0, slashIdx);
  const repoName = finding.repository.fullName.slice(slashIdx + 1);

  const octokit = await githubApp.getInstallationOctokit(
    Number(finding.repository.installation.installationId),
  );

  const scan = await prisma.scan.findUnique({
    where: { id: finding.lastScanId },
    select: { commitSha: true },
  });

  if (!scan) {
    throw new AiError("FILE_NOT_FOUND", "Scan commit not found");
  }

  const fileCtx = await fetchFileContext({
    octokit,
    owner,
    repo: repoName,
    commitSha: scan.commitSha,
    filePath: finding.filePath,
    targetLine: finding.startLine,
  });

  const { text: redactedWindow } = redactCode(fileCtx.windowContent);

  // Check quota
  await checkAndIncrementQuota(workspaceId);

  const prompt = createFixPrompt({
    ruleId: finding.ruleId,
    ruleTitle: finding.title,
    message: finding.message,
    filePath: finding.filePath,
    targetLine: finding.startLine,
    startWindowLine: fileCtx.startWindowLine,
    endWindowLine: fileCtx.endWindowLine,
    codeWindow: redactedWindow,
  });

  const modelResult = await callModel({
    system: prompt.system,
    user: prompt.user,
    schema: fixOutputSchema,
  });

  await recordTokens({
    workspaceId,
    tokensIn: modelResult.usage.promptTokens,
    tokensOut: modelResult.usage.completionTokens,
  });

  const out = modelResult.object;
  if (!out.canFix || !out.replacement) {
    return {
      canFix: false,
      explanation: cleanOutputText(out.explanation, 1500),
    };
  }

  const rep = out.replacement;
  const validation = validateReplacement({
    filePath: finding.filePath,
    startLine: rep.startLine,
    endLine: rep.endLine,
    newCode: rep.newCode,
    windowStart: fileCtx.startWindowLine,
    windowEnd: fileCtx.endWindowLine,
    totalLines: fileCtx.totalLines,
  });

  let proposalStatus: "DRAFT" | "INVALID" = "DRAFT";
  let checks: Record<string, any> = {
    patchApplies: true,
    withinFile: true,
    sizeOk: true,
    staticRecheck: { passed: false, findingGone: false, newIssues: false },
  };

  let diff = "";
  let originalCode = "";

  if (!validation.valid) {
    proposalStatus = "INVALID";
    checks.patchApplies = false;
    checks.reason = validation.reason;
  } else {
    try {
      const { patchedContent, originalSlice } = applyReplacement({
        fullContent: fileCtx.fullContent,
        startLine: rep.startLine,
        endLine: rep.endLine,
        newCode: rep.newCode,
      });

      originalCode = originalSlice;
      diff = buildUnifiedDiff({
        filePath: finding.filePath,
        fullContent: fileCtx.fullContent,
        startLine: rep.startLine,
        endLine: rep.endLine,
        newCode: rep.newCode,
      });

      const recheck = await staticRecheck({
        filePath: finding.filePath,
        patchedContent,
        originalRuleId: finding.ruleId,
      });

      checks.staticRecheck = recheck;
      if (!recheck.passed) {
        proposalStatus = "INVALID";
      }
    } catch {
      proposalStatus = "INVALID";
      checks.patchApplies = false;
    }
  }

  const confidenceUpper = out.confidence.toUpperCase() as "LOW" | "MEDIUM" | "HIGH";

  const fixProposal = await prisma.fixProposal.create({
    data: {
      workspaceId,
      findingId,
      status: proposalStatus,
      filePath: finding.filePath,
      startLine: rep.startLine,
      endLine: rep.endLine,
      originalCode: originalCode.slice(0, 6000),
      replacementCode: rep.newCode.slice(0, 6000),
      diff: diff.slice(0, 12000),
      explanation: cleanOutputText(out.explanation, 1500),
      confidence: confidenceUpper,
      checks,
      provider: modelResult.provider,
      model: modelResult.model,
      promptVersion: PROMPT_VERSION,
      createdByUserId: userId,
    },
  });

  return {
    canFix: true,
    fixProposal,
  };
}
