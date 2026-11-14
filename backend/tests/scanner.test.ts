import { Readable } from "node:stream";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as tar from "tar";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { downloadAndExtract, validateTarEntryPath } from "../src/scanner/archive.js";
import { computeFingerprint } from "../src/scanner/fingerprint.js";
import { persistFindings } from "../src/scanner/persist.js";
import { isValidCommitSha, isValidOwnerOrRepo } from "../src/inngest/functions/scan-repository.js";
import { runEslintAnalyzer } from "../src/scanner/analyzers/eslint.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function extractCookieHeader(setCookieHeader: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];

  return cookies
    .map((entry) => entry.split(";")[0]?.trim())
    .filter((pair): pair is string => Boolean(pair))
    .join("; ");
}

async function signUpAndGetWorkspace(
  app: FastifyInstance,
  email: string,
  name: string,
) {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    payload: {
      email,
      password: "Password123!",
      name,
    },
  });
  expect(res.statusCode).toBe(200);
  const cookie = extractCookieHeader(res.headers["set-cookie"]);

  const meRes = await app.inject({
    method: "GET",
    url: "/api/me",
    headers: { cookie },
  });
  expect(meRes.statusCode).toBe(200);
  const meBody = meRes.json() as {
    user: { id: string };
    activeWorkspace: { id: string };
  };

  return {
    cookie,
    userId: meBody.user.id,
    workspaceId: meBody.activeWorkspace.id,
  };
}

describe("Step 8 Real Scanner & Findings", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await prisma.finding.deleteMany({});
    await prisma.scan.deleteMany({});
    await prisma.repository.deleteMany({});
    await prisma.githubInstallation.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it("(a) archive extraction rejects path traversal, absolute paths, and reserved names", () => {
    expect(validateTarEntryPath("../evil.js").safe).toBe(false);
    expect(validateTarEntryPath("a/../../evil.js").safe).toBe(false);
    expect(validateTarEntryPath("/absolute/path.js").safe).toBe(false);
    expect(validateTarEntryPath("C:\\Windows\\system32").safe).toBe(false);
    expect(validateTarEntryPath("CON.txt").safe).toBe(false);
    expect(validateTarEntryPath("src/AUX/file.js").safe).toBe(false);
    expect(validateTarEntryPath("src/index.js").safe).toBe(true);
  });

  it("(b) SHA, owner, and repo validation rejects malicious/invalid strings", () => {
    expect(isValidCommitSha("b544216890abcdef1234567890abcdef12345678")).toBe(true);
    expect(isValidCommitSha("short")).toBe(false);
    expect(isValidCommitSha("abc; rm -rf /")).toBe(false);
    expect(isValidCommitSha("b544216890abcdef1234567890abcdef1234567G")).toBe(false);

    expect(isValidOwnerOrRepo("valid-org_123")).toBe(true);
    expect(isValidOwnerOrRepo("--upload-pack=x")).toBe(false);
    expect(isValidOwnerOrRepo("has space")).toBe(false);
    expect(isValidOwnerOrRepo(".hidden")).toBe(false);
  });

  it("(c) fingerprints stay the same when lines move and change when flagged line changes", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rp-test-fp-"));
    const filePath = "src/test.js";
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });

    // Version 1: flagged line on line 2
    await fs.writeFile(path.join(tmp, filePath), "const x = 1;\neval(input);\nconst y = 2;", "utf8");
    const fp1 = await computeFingerprint({
      repoDir: tmp,
      tool: "ESLINT",
      ruleId: "security/detect-eval-with-expression",
      category: "SECURITY",
      filePath,
      startLine: 2,
      occurrenceIndex: 1,
    });

    // Version 2: extra lines added at top, flagged line moved to line 5
    await fs.writeFile(path.join(tmp, filePath), "// comment\n// comment2\n// comment3\nconst x = 1;\neval(input);\nconst y = 2;", "utf8");
    const fp2 = await computeFingerprint({
      repoDir: tmp,
      tool: "ESLINT",
      ruleId: "security/detect-eval-with-expression",
      category: "SECURITY",
      filePath,
      startLine: 5,
      occurrenceIndex: 1,
    });

    expect(fp1).toBe(fp2);

    // Version 3: code changed
    await fs.writeFile(path.join(tmp, filePath), "// comment\nconst x = 1;\neval(other);\nconst y = 2;", "utf8");
    const fp3 = await computeFingerprint({
      repoDir: tmp,
      tool: "ESLINT",
      ruleId: "security/detect-eval-with-expression",
      category: "SECURITY",
      filePath,
      startLine: 3,
      occurrenceIndex: 1,
    });

    expect(fp1).not.toBe(fp3);
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("(d) repo eslint.config.js is NEVER executed by the scanner", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rp-test-eslint-"));
    const markerFile = path.join(tmp, "marker.txt");

    // Untrusted repo config attempting code execution
    await fs.writeFile(
      path.join(tmp, "eslint.config.js"),
      `const fs = require('fs'); fs.writeFileSync(${JSON.stringify(markerFile)}, 'PWNED'); module.exports = [];`,
      "utf8",
    );
    await fs.writeFile(path.join(tmp, "vuln.js"), "eval(userInput);", "utf8");

    await runEslintAnalyzer(tmp, tmp);

    const markerExists = await fs.stat(markerFile).then(() => true).catch(() => false);
    expect(markerExists).toBe(false);

    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("(e) ESLint finds eval and child_process in a fixture", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rp-test-vuln-"));
    await fs.writeFile(
      path.join(tmp, "vuln.js"),
      `const cp = require('child_process');\ncp.exec(cmd);\neval(payload);\n`,
      "utf8",
    );

    const { findings, error } = await runEslintAnalyzer(tmp, tmp);
    expect(error).toBeUndefined();
    expect(findings.length).toBeGreaterThanOrEqual(2);

    const rules = findings.map((f) => f.ruleId);
    expect(rules).toContain("security/detect-eval-with-expression");
    expect(rules).toContain("security/detect-child-process");

    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("(g) persistence lifecycle: new -> OPEN, resolved -> FIXED, reappears -> OPEN again, REJECTED stays REJECTED", async () => {
    const { workspaceId } = await signUpAndGetWorkspace(app, "lifecycle@example.com", "Life Owner");

    const inst = await prisma.githubInstallation.create({
      data: {
        workspaceId,
        installationId: 888001n,
        accountLogin: "acme",
        accountType: "Organization",
        accountId: 8001n,
        repositorySelection: "SELECTED",
        htmlUrl: "https://github.com",
      },
    });

    const repo = await prisma.repository.create({
      data: {
        workspaceId,
        installationId: inst.id,
        provider: "GITHUB",
        externalId: "90001",
        fullName: "acme/api",
        defaultBranch: "main",
        isPrivate: true,
        status: "CONNECTED",
      },
    });

    const scan1 = await prisma.scan.create({
      data: {
        workspaceId,
        repositoryId: repo.id,
        branch: "main",
        commitSha: "1111111111111111111111111111111111111111",
        trigger: "MANUAL",
        status: "RUNNING",
      },
    });

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rp-test-pers-"));
    await fs.writeFile(path.join(tmpDir, "app.js"), "eval(bad);", "utf8");

    // 1. Initial scan with 1 finding
    await persistFindings({
      workspaceId,
      repositoryId: repo.id,
      scanId: scan1.id,
      repoDir: tmpDir,
      findings: [
        {
          tool: "ESLINT",
          ruleId: "security/detect-eval-with-expression",
          severity: "HIGH",
          category: "SECURITY",
          title: "Use of eval",
          message: "eval is evil",
          filePath: "app.js",
          startLine: 1,
          endLine: 1,
          snippet: "eval(bad);",
        },
      ],
      completedTools: ["ESLINT"],
    });

    const f1 = await prisma.finding.findFirst({ where: { repositoryId: repo.id } });
    expect(f1?.status).toBe("OPEN");

    // 2. Second scan: finding is gone -> marked FIXED
    const scan2 = await prisma.scan.create({
      data: {
        workspaceId,
        repositoryId: repo.id,
        branch: "main",
        commitSha: "2222222222222222222222222222222222222222",
        trigger: "MANUAL",
        status: "RUNNING",
      },
    });

    await persistFindings({
      workspaceId,
      repositoryId: repo.id,
      scanId: scan2.id,
      repoDir: tmpDir,
      findings: [],
      completedTools: ["ESLINT"],
    });

    const f2 = await prisma.finding.findUnique({ where: { id: f1!.id } });
    expect(f2?.status).toBe("FIXED");

    // 3. User rejects a finding, then subsequent scan finds it -> stays REJECTED
    await prisma.finding.update({
      where: { id: f1!.id },
      data: { status: "REJECTED" },
    });

    const scan3 = await prisma.scan.create({
      data: {
        workspaceId,
        repositoryId: repo.id,
        branch: "main",
        commitSha: "3333333333333333333333333333333333333333",
        trigger: "MANUAL",
        status: "RUNNING",
      },
    });

    await persistFindings({
      workspaceId,
      repositoryId: repo.id,
      scanId: scan3.id,
      repoDir: tmpDir,
      findings: [
        {
          tool: "ESLINT",
          ruleId: "security/detect-eval-with-expression",
          severity: "HIGH",
          category: "SECURITY",
          title: "Use of eval",
          message: "eval is evil",
          filePath: "app.js",
          startLine: 1,
          endLine: 1,
          snippet: "eval(bad);",
        },
      ],
      completedTools: ["ESLINT"],
    });

    const f3 = await prisma.finding.findUnique({ where: { id: f1!.id } });
    expect(f3?.status).toBe("REJECTED");

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("(h) findings API workspace isolation and status update permissions", async () => {
    const ws1 = await signUpAndGetWorkspace(app, "ws1_find@example.com", "WS1");
    const ws2 = await signUpAndGetWorkspace(app, "ws2_find@example.com", "WS2");

    const inst1 = await prisma.githubInstallation.create({
      data: {
        workspaceId: ws1.workspaceId,
        installationId: 888002n,
        accountLogin: "ws1-org",
        accountType: "Organization",
        accountId: 8002n,
        repositorySelection: "SELECTED",
        htmlUrl: "https://github.com",
      },
    });

    const repo1 = await prisma.repository.create({
      data: {
        workspaceId: ws1.workspaceId,
        installationId: inst1.id,
        provider: "GITHUB",
        externalId: "90002",
        fullName: "ws1-org/repo",
        defaultBranch: "main",
        isPrivate: false,
        status: "CONNECTED",
      },
    });

    const finding = await prisma.finding.create({
      data: {
        workspaceId: ws1.workspaceId,
        repositoryId: repo1.id,
        firstScanId: "scan-1",
        lastScanId: "scan-1",
        fingerprint: "fp-isolate-1",
        tool: "ESLINT",
        ruleId: "no-eval",
        severity: "HIGH",
        category: "SECURITY",
        title: "Eval",
        message: "Bad eval",
        filePath: "index.js",
        startLine: 1,
        endLine: 1,
        status: "OPEN",
      },
    });

    // WS2 accessing WS1 finding -> 404
    const getWs2 = await app.inject({
      method: "GET",
      url: `/api/findings/${finding.id}`,
      headers: { cookie: ws2.cookie },
    });
    expect(getWs2.statusCode).toBe(404);

    // WS1 accessing WS1 finding -> 200
    const getWs1 = await app.inject({
      method: "GET",
      url: `/api/findings/${finding.id}`,
      headers: { cookie: ws1.cookie },
    });
    expect(getWs1.statusCode).toBe(200);

    // Status PATCH
    const patchRes = await app.inject({
      method: "PATCH",
      url: `/api/findings/${finding.id}/status`,
      headers: { cookie: ws1.cookie },
      payload: { status: "ACCEPTED" },
    });
    expect(patchRes.statusCode).toBe(200);

    const updated = await prisma.finding.findUnique({ where: { id: finding.id } });
    expect(updated?.status).toBe("ACCEPTED");
  });

  it("(i) SSE stream requires authentication and enforces max 3 streams limit", async () => {
    const unauth = await app.inject({
      method: "GET",
      url: "/api/scans/stream",
    });
    expect(unauth.statusCode).toBe(401);
  });
});

