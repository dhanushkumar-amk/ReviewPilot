import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  assertSafeBranchName,
  assertAllowedFilePath,
  sanitizeText,
  SecurityGuardError,
} from "../src/github/guards.js";
import { buildPrBody, createFixPullRequest } from "../src/pull-requests/create.js";
import { mergePullRequest } from "../src/pull-requests/merge.js";
import { closePullRequest } from "../src/pull-requests/close.js";
import { getPullRequestStatus, clearStatusCache } from "../src/pull-requests/status.js";
import { prisma } from "../src/db.js";
import { githubApp } from "../src/github/app.js";

// Mock DB and GitHub App
vi.mock("../src/db.js", () => {
  return {
    prisma: {
      fixProposal: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      fixValidation: {
        findFirst: vi.fn(),
      },
      pullRequest: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      repository: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      webhookDelivery: {
        update: vi.fn(),
      },
      $disconnect: vi.fn(),
    },
  };
});

vi.mock("../src/github/app.js", () => {
  return {
    githubApp: {
      octokit: {
        rest: {
          apps: {
            getInstallation: vi.fn(),
          },
        },
      },
      getInstallationOctokit: vi.fn(),
    },
  };
});

describe("Step 11: Security Guards & Text Sanitization", () => {
  it("assertSafeBranchName: enforces reviewpilot/fix-<id>-<random> and rejects unsafe branches", () => {
    // Valid branch names
    expect(() => assertSafeBranchName("reviewpilot/fix-a1b2c3-4d5e")).not.toThrow();
    expect(() => assertSafeBranchName("reviewpilot/fix-abcdef12-987654")).not.toThrow();

    // Invalid & dangerous branch names
    expect(() => assertSafeBranchName("main")).toThrow(SecurityGuardError);
    expect(() => assertSafeBranchName("master")).toThrow(SecurityGuardError);
    expect(() => assertSafeBranchName("HEAD")).toThrow(SecurityGuardError);
    expect(() => assertSafeBranchName("+reviewpilot/fix-a1b2c3-4d5e")).toThrow(SecurityGuardError);
    expect(() => assertSafeBranchName("feature/my-branch")).toThrow(SecurityGuardError);
    expect(() => assertSafeBranchName("reviewpilot/fix-..-sneaky")).toThrow(SecurityGuardError);
    expect(() => assertSafeBranchName("reviewpilot/fix-invalid_underscores-123")).toThrow(SecurityGuardError);
    expect(() => assertSafeBranchName("")).toThrow(SecurityGuardError);
  });

  it("assertAllowedFilePath: enforces safe relative POSIX paths and rejects sensitive files", () => {
    expect(() => assertAllowedFilePath("src/utils/calc.ts")).not.toThrow();
    expect(() => assertAllowedFilePath("components/button.tsx")).not.toThrow();

    // Sensitive files
    expect(() => assertAllowedFilePath(".github/workflows/ci.yml")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath("Dockerfile")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath("nested/Dockerfile")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath("package-lock.json")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath("pnpm-lock.yaml")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath("yarn.lock")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath(".env")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath(".env.local")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath("../secret.txt")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath("/etc/passwd")).toThrow(SecurityGuardError);
    expect(() => assertAllowedFilePath("C:\\test\\file.ts")).toThrow(SecurityGuardError);
  });

  it("sanitizeText: neutralizes @mentions, issues, markdown links, HTML, URLs, and caps at 600 chars", () => {
    const maliciousInput = `
      Hello @octocat and @admin! Check out <script>alert(1)</script>
      [Click here](https://evil.com/phish) or visit https://malicious.org/bad
      This fixes #123 and closes #456.
      \`\`\`js
      const leaked = "dangerous code";
      \`\`\`
      Inline \`code\` is safe.
    `;

    const sanitized = sanitizeText(maliciousInput, 600);

    // No raw @mentions
    expect(sanitized).not.toContain("@octocat");
    expect(sanitized).toContain("@\u200Boctocat");
    expect(sanitized).toContain("@\u200Badmin");

    // No HTML
    expect(sanitized).not.toContain("<script>");

    // No URLs or markdown links
    expect(sanitized).not.toContain("https://evil.com");
    expect(sanitized).not.toContain("https://malicious.org");
    expect(sanitized).toContain("Click here");

    // Neutralized issue closing keywords and numbers
    expect(sanitized).not.toMatch(/fixes #\d+/);
    expect(sanitized).toContain("#\u200B123");
    expect(sanitized).toContain("#\u200B456");

    // No code fence block contents
    expect(sanitized).not.toContain("dangerous code");

    // Length <= 601 (including ellipsis)
    const veryLong = "A".repeat(1000);
    const capped = sanitizeText(veryLong, 600);
    expect(capped.length).toBeLessThanOrEqual(602);
    expect(capped.endsWith("…")).toBe(true);
  });

  it("buildPrBody: creates clean formatted body without user source code leakage", () => {
    const body = buildPrBody({
      findingTitle: "SQL Injection in query helper",
      tool: "SEMGREP",
      ruleId: "javascript.sequelize.security.audit.sql-injection",
      filePath: "src/db/queries.ts",
      sanitizedExplanation: "Parameterized the query using bound values.",
      validationStatus: "PASSED",
      testsRun: true,
      riskLevel: "LOW",
    });

    expect(body).toContain("## ReviewPilot Fix Proposal");
    expect(body).toContain("SQL Injection in query helper");
    expect(body).toContain("src/db/queries.ts");
    expect(body).toContain("Parameterized the query");
    expect(body).toContain("Static Verification:** PASSED");
    expect(body).toContain("Tests Executed:** Passed");
    expect(body).toContain("Human review and merge required");
  });
});

describe("Step 11: createFixPullRequest Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when proposal is not in DRAFT status", async () => {
    (prisma.fixProposal.findFirst as any).mockResolvedValue({
      id: "prop-1",
      status: "DISCARDED",
      workspaceId: "ws-1",
    });

    await expect(
      createFixPullRequest({
        fixProposalId: "prop-1",
        user: { id: "u-1", role: "admin" },
        workspace: { id: "ws-1" },
      })
    ).rejects.toThrow("PROPOSAL_NOT_DRAFT");
  });

  it("rejects when latest validation is not PASSED or PASSED_WITH_WARNINGS", async () => {
    (prisma.fixProposal.findFirst as any).mockResolvedValue({
      id: "prop-1",
      status: "DRAFT",
      workspaceId: "ws-1",
    });
    (prisma.pullRequest.findUnique as any).mockResolvedValue(null);
    (prisma.fixValidation.findFirst as any).mockResolvedValue({
      status: "FAILED",
    });

    await expect(
      createFixPullRequest({
        fixProposalId: "prop-1",
        user: { id: "u-1", role: "admin" },
        workspace: { id: "ws-1" },
      })
    ).rejects.toThrow("PR_BLOCKED_VALIDATION");
  });

  it("rejects HIGH risk fix proposal without admin/owner or risk acknowledgment", async () => {
    (prisma.fixProposal.findFirst as any).mockResolvedValue({
      id: "prop-1",
      status: "DRAFT",
      workspaceId: "ws-1",
    });
    (prisma.pullRequest.findUnique as any).mockResolvedValue(null);
    (prisma.fixValidation.findFirst as any).mockResolvedValue({
      status: "PASSED_WITH_WARNINGS",
      riskLevel: "HIGH",
    });

    // Member rejected with FORBIDDEN
    await expect(
      createFixPullRequest({
        fixProposalId: "prop-1",
        user: { id: "u-1", role: "member" },
        workspace: { id: "ws-1" },
        acknowledgeRisk: true,
      })
    ).rejects.toThrow("FORBIDDEN");

    // Admin rejected if acknowledgeRisk is false
    await expect(
      createFixPullRequest({
        fixProposalId: "prop-1",
        user: { id: "u-1", role: "admin" },
        workspace: { id: "ws-1" },
        acknowledgeRisk: false,
      })
    ).rejects.toThrow("PR_RISK_ACK_REQUIRED");
  });

  it("rejects when daily workspace limit of 10 PRs is reached", async () => {
    (prisma.fixProposal.findFirst as any).mockResolvedValue({
      id: "prop-1",
      status: "DRAFT",
      workspaceId: "ws-1",
      filePath: "src/app.ts",
    });
    (prisma.pullRequest.findUnique as any).mockResolvedValue(null);
    (prisma.fixValidation.findFirst as any).mockResolvedValue({
      status: "PASSED",
      riskLevel: "LOW",
    });
    (prisma.pullRequest.count as any).mockResolvedValue(10);

    await expect(
      createFixPullRequest({
        fixProposalId: "prop-1",
        user: { id: "u-1", role: "admin" },
        workspace: { id: "ws-1" },
      })
    ).rejects.toThrow("PR_LIMIT_REACHED");
  });

  it("returns existing PR idempotently if already created", async () => {
    const existing = {
      id: "pr-1",
      status: "OPEN",
      githubNumber: 42,
    };
    (prisma.fixProposal.findFirst as any).mockResolvedValue({
      id: "prop-1",
      status: "DRAFT",
      workspaceId: "ws-1",
    });
    (prisma.pullRequest.findUnique as any).mockResolvedValue(existing);

    const res = await createFixPullRequest({
      fixProposalId: "prop-1",
      user: { id: "u-1", role: "admin" },
      workspace: { id: "ws-1" },
    });

    expect(res.alreadyExists).toBe(true);
    expect(res.pullRequest.id).toBe("pr-1");
  });

  it("detects STALE_FIX when code on default branch HEAD has diverged", async () => {
    (prisma.fixProposal.findFirst as any).mockResolvedValue({
      id: "prop-1",
      status: "DRAFT",
      workspaceId: "ws-1",
      filePath: "src/utils.ts",
      startLine: 1,
      endLine: 2,
      originalCode: "const a = 1;\nconst b = 2;",
      replacementCode: "const a = 10;\nconst b = 20;",
      explanation: "Update numbers",
      finding: {
        id: "f-1",
        title: "Bad numbers",
        tool: "ESLINT",
        ruleId: "no-bad-nums",
        repository: {
          fullName: "owner/repo",
          defaultBranch: "main",
          installation: { installationId: "12345" },
        },
      },
    });
    (prisma.pullRequest.findUnique as any).mockResolvedValue(null);
    (prisma.fixValidation.findFirst as any).mockResolvedValue({
      status: "PASSED",
      riskLevel: "LOW",
    });
    (prisma.pullRequest.count as any).mockResolvedValue(2);

    (githubApp.octokit.rest.apps.getInstallation as any).mockResolvedValue({
      data: { permissions: { contents: "write", pull_requests: "write" } },
    });

    const mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: "file",
              size: 200,
              content: Buffer.from("const a = 999;\nconst b = 999;\n").toString("base64"),
              sha: "sha1",
            },
          }),
        },
      },
    };
    (githubApp.getInstallationOctokit as any).mockResolvedValue(mockOctokit);

    await expect(
      createFixPullRequest({
        fixProposalId: "prop-1",
        user: { id: "u-1", role: "admin" },
        workspace: { id: "ws-1" },
      })
    ).rejects.toThrow("STALE_FIX");
  });

  it("creates branch, commits file, opens PR, and updates DB on happy path", async () => {
    const originalText = "const a = 1;\r\nconst b = 2;\r\n";
    (prisma.fixProposal.findFirst as any).mockResolvedValue({
      id: "prop-123456",
      status: "DRAFT",
      workspaceId: "ws-1",
      filePath: "src/utils.ts",
      startLine: 1,
      endLine: 2,
      originalCode: "const a = 1;\nconst b = 2;",
      replacementCode: "const a = 10;\nconst b = 20;",
      explanation: "Update numbers safely",
      finding: {
        id: "f-1",
        title: "Bad numbers",
        tool: "ESLINT",
        ruleId: "no-bad-nums",
        repository: {
          id: "r-1",
          fullName: "owner/repo",
          defaultBranch: "main",
          installation: { installationId: "12345" },
        },
      },
    });
    (prisma.pullRequest.findUnique as any).mockResolvedValue(null);
    (prisma.fixValidation.findFirst as any).mockResolvedValue({
      id: "val-1",
      status: "PASSED",
      riskLevel: "LOW",
      testsRun: false,
    });
    (prisma.pullRequest.count as any).mockResolvedValue(0);

    (githubApp.octokit.rest.apps.getInstallation as any).mockResolvedValue({
      data: { permissions: { contents: "write", pull_requests: "write" } },
    });

    const mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: "file",
              size: 200,
              content: Buffer.from(originalText).toString("base64"),
              sha: "sha1",
            },
          }),
          createOrUpdateFileContents: vi.fn().mockResolvedValue({
            data: { commit: { sha: "commit-sha" } },
          }),
        },
        git: {
          getRef: vi.fn().mockResolvedValue({
            data: { object: { sha: "base-head-sha" } },
          }),
          createRef: vi.fn().mockResolvedValue({}),
          deleteRef: vi.fn().mockResolvedValue({}),
        },
        pulls: {
          create: vi.fn().mockResolvedValue({
            data: {
              number: 101,
              html_url: "https://github.com/owner/repo/pull/101",
              head: { sha: "pr-head-sha" },
            },
          }),
        },
      },
    };
    (githubApp.getInstallationOctokit as any).mockResolvedValue(mockOctokit);

    (prisma.pullRequest.upsert as any).mockResolvedValue({
      id: "pr-db-1",
      branchName: "reviewpilot/fix-prop1234-abcd",
    });
    (prisma.pullRequest.update as any).mockResolvedValue({
      id: "pr-db-1",
      status: "OPEN",
      githubNumber: 101,
      htmlUrl: "https://github.com/owner/repo/pull/101",
      headSha: "pr-head-sha",
    });

    const result = await createFixPullRequest({
      fixProposalId: "prop-123456",
      user: { id: "u-1", role: "admin" },
      workspace: { id: "ws-1" },
    });

    expect(result.pullRequest.status).toBe("OPEN");
    expect(result.pullRequest.githubNumber).toBe(101);
    expect(mockOctokit.rest.git.createRef).toHaveBeenCalled();
    expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "PULL_REQUEST_CREATED",
        }),
      })
    );
  });
});

describe("Step 11: mergePullRequest Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks non-owner/admin roles with 403 FORBIDDEN", async () => {
    await expect(
      mergePullRequest({
        pullRequestId: "pr-1",
        user: { id: "u-1", role: "member" },
        workspace: { id: "ws-1" },
        expectedHeadSha: "sha-1",
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("detects HEAD_CHANGED if expectedHeadSha doesn't match GitHub PR head SHA", async () => {
    (prisma.pullRequest.findFirst as any).mockResolvedValue({
      id: "pr-1",
      status: "OPEN",
      githubNumber: 10,
      branchName: "reviewpilot/fix-123456-abcd",
      repository: {
        fullName: "owner/repo",
        installation: { installationId: "123" },
      },
    });

    const mockOctokit = {
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: {
              mergeable: true,
              mergeable_state: "clean",
              head: { sha: "new-diverged-sha" },
            },
          }),
        },
      },
    };
    (githubApp.getInstallationOctokit as any).mockResolvedValue(mockOctokit);

    await expect(
      mergePullRequest({
        pullRequestId: "pr-1",
        user: { id: "u-1", role: "admin" },
        workspace: { id: "ws-1" },
        expectedHeadSha: "old-expected-sha",
      })
    ).rejects.toThrow("HEAD_CHANGED");
  });

  it("rejects with MERGE_CONFLICT when GitHub reports dirty state", async () => {
    (prisma.pullRequest.findFirst as any).mockResolvedValue({
      id: "pr-1",
      status: "OPEN",
      githubNumber: 10,
      branchName: "reviewpilot/fix-123456-abcd",
      repository: {
        fullName: "owner/repo",
        installation: { installationId: "123" },
      },
    });

    const mockOctokit = {
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: {
              mergeable: false,
              mergeable_state: "dirty",
              head: { sha: "head-sha" },
            },
          }),
        },
      },
    };
    (githubApp.getInstallationOctokit as any).mockResolvedValue(mockOctokit);

    await expect(
      mergePullRequest({
        pullRequestId: "pr-1",
        user: { id: "u-1", role: "admin" },
        workspace: { id: "ws-1" },
        expectedHeadSha: "head-sha",
      })
    ).rejects.toThrow("MERGE_CONFLICT");
  });

  it("merges successfully when clean and deletes the branch", async () => {
    (prisma.pullRequest.findFirst as any).mockResolvedValue({
      id: "pr-1",
      status: "OPEN",
      githubNumber: 10,
      branchName: "reviewpilot/fix-123456-abcd",
      repository: {
        fullName: "owner/repo",
        installation: { installationId: "123" },
      },
    });

    const mockOctokit = {
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: {
              mergeable: true,
              mergeable_state: "clean",
              head: { sha: "head-sha" },
            },
          }),
          merge: vi.fn().mockResolvedValue({
            data: { merged: true },
          }),
        },
        git: {
          deleteRef: vi.fn().mockResolvedValue({}),
        },
      },
    };
    (githubApp.getInstallationOctokit as any).mockResolvedValue(mockOctokit);

    (prisma.pullRequest.update as any).mockResolvedValue({
      id: "pr-1",
      status: "MERGED",
    });

    const res = await mergePullRequest({
      pullRequestId: "pr-1",
      user: { id: "u-1", role: "admin" },
      workspace: { id: "ws-1" },
      expectedHeadSha: "head-sha",
    });

    expect(res.merged).toBe(true);
    expect(mockOctokit.rest.pulls.merge).toHaveBeenCalledWith(
      expect.objectContaining({
        pull_number: 10,
        sha: "head-sha",
        merge_method: "squash",
      })
    );
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: "heads/reviewpilot/fix-123456-abcd",
      })
    );
  });
});

describe("Step 11: closePullRequest Service", () => {
  it("closes PR and deletes branch", async () => {
    (prisma.pullRequest.findFirst as any).mockResolvedValue({
      id: "pr-1",
      status: "OPEN",
      githubNumber: 12,
      branchName: "reviewpilot/fix-998877-efgh",
      repository: {
        fullName: "owner/repo",
        installation: { installationId: "123" },
      },
    });

    const mockOctokit = {
      rest: {
        pulls: {
          update: vi.fn().mockResolvedValue({}),
        },
        git: {
          deleteRef: vi.fn().mockResolvedValue({}),
        },
      },
    };
    (githubApp.getInstallationOctokit as any).mockResolvedValue(mockOctokit);

    (prisma.pullRequest.update as any).mockResolvedValue({
      id: "pr-1",
      status: "CLOSED",
    });

    const res = await closePullRequest({
      pullRequestId: "pr-1",
      user: { id: "u-1", role: "admin" },
      workspace: { id: "ws-1" },
    });

    expect(res.closed).toBe(true);
    expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith(
      expect.objectContaining({
        pull_number: 12,
        state: "closed",
      })
    );
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: "heads/reviewpilot/fix-998877-efgh",
      })
    );
  });
});

describe("Step 11: getPullRequestStatus Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStatusCache();
  });

  it("aggregates check runs and statuses, calculates mergeReadiness and caches result", async () => {
    (prisma.pullRequest.findFirst as any).mockResolvedValue({
      id: "pr-status-1",
      status: "OPEN",
      githubNumber: 15,
      headSha: "head-sha-123",
      repository: {
        fullName: "owner/repo",
        installation: { installationId: "456" },
      },
      finding: {
        id: "f-1",
        title: "Test finding",
      },
      fixProposal: {
        id: "fp-1",
      },
    });

    const mockOctokit = {
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: {
              mergeable: true,
              mergeable_state: "clean",
              head: { sha: "head-sha-123" },
              state: "open",
            },
          }),
        },
        checks: {
          listForRef: vi.fn().mockResolvedValue({
            data: {
              check_runs: [
                {
                  id: 1001,
                  name: "CI / Test",
                  status: "completed",
                  conclusion: "success",
                  html_url: "https://github.com/check/1001",
                },
              ],
            },
          }),
        },
        repos: {
          getCombinedStatusForRef: vi.fn().mockResolvedValue({
            data: {
              statuses: [
                {
                  id: 2001,
                  context: "security/gitleaks",
                  state: "success",
                },
              ],
            },
          }),
        },
      },
    };
    (githubApp.getInstallationOctokit as any).mockResolvedValue(mockOctokit);
    (prisma.pullRequest.update as any).mockImplementation(({ data }) => ({
      id: "pr-status-1",
      ...data,
    }));

    const firstCall = await getPullRequestStatus("pr-status-1", "ws-1");
    expect(firstCall.liveStatus.mergeReadiness).toBe("ready");
    expect(firstCall.liveStatus.overallChecks).toBe("SUCCESS");
    expect(firstCall.liveStatus.checks.length).toBe(2);
    expect(firstCall.liveStatus.branchHeadChanged).toBe(false);

    // Second call should hit in-memory cache without calling GitHub API again
    const secondCall = await getPullRequestStatus("pr-status-1", "ws-1");
    expect(secondCall.liveStatus.mergeReadiness).toBe("ready");
    expect(mockOctokit.rest.pulls.get).toHaveBeenCalledTimes(1);
  });
});

