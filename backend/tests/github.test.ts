import crypto from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

const mockCreateToken = vi.fn();
const mockUserPaginate = vi.fn();
const mockGetInstallation = vi.fn();
const mockInstallationPaginate = vi.fn();
const mockGetInstallationOctokit = vi.fn();

vi.mock("../src/github/app.js", () => ({
  githubApp: {
    oauth: {
      createToken: mockCreateToken,
    },
    octokit: {
      rest: {
        apps: {
          getInstallation: mockGetInstallation,
        },
      },
    },
    getInstallationOctokit: mockGetInstallationOctokit,
  },
  createUserOctokit: vi.fn(() => ({
    paginate: mockUserPaginate,
  })),
}));

import { buildApp, sanitizeRequestUrl } from "../src/app.js";
import { prisma } from "../src/db.js";
import { env } from "../src/env.js";
import {
  createGithubIntentCookieValue,
  GITHUB_INTENT_COOKIE_NAME,
} from "../src/github/intent.js";
import { resetGithubRateLimiters } from "../src/routes/github.js";

function extractCookieMap(setCookieHeader: string | string[] | undefined): Map<string, string> {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];

  const map = new Map<string, string>();
  for (const entry of cookies) {
    const pair = entry.split(";")[0]?.trim();
    if (!pair) continue;
    const eqIdx = pair.indexOf("=");
    if (eqIdx <= 0) continue;
    map.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
  }
  return map;
}

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
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

describe("github app integration, sync, RBAC, and tenant isolation", () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (createdOrgIds.length > 0) {
      await prisma.organization.deleteMany({
        where: { id: { in: createdOrgIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetGithubRateLimiters();
    mockGetInstallationOctokit.mockResolvedValue({
      paginate: mockInstallationPaginate,
    });
  });

  async function createVerifiedUser(name: string, email: string, password: string) {
    const signUpRes = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { name, email, password },
    });
    expect(signUpRes.statusCode).toBe(200);
    const signUpBody = signUpRes.json() as { user: { id: string } };
    createdUserIds.push(signUpBody.user.id);

    await prisma.user.update({
      where: { id: signUpBody.user.id },
      data: { emailVerified: true },
    });

    const signInRes = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email, password },
    });
    expect(signInRes.statusCode).toBe(200);
    const cookie = extractSessionCookie(signInRes.headers["set-cookie"]);

    const meRes = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie },
    });
    expect(meRes.statusCode).toBe(200);
    const me = meRes.json() as {
      user: { id: string };
      activeWorkspace: { id: string; role: string };
    };
    createdOrgIds.push(me.activeWorkspace.id);

    return {
      userId: me.user.id,
      workspaceId: me.activeWorkspace.id,
      cookie,
    };
  }

  it("(a) links installation and syncs repos with valid intent cookie and owned installation", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const alice = await createVerifiedUser(
      "Alice GitHub",
      `alice-gh-${runId}@example.test`,
      "TestPassword!12345"
    );

    const installUrlRes = await app.inject({
      method: "POST",
      url: "/api/github/install-url",
      headers: { cookie: alice.cookie },
    });
    expect(installUrlRes.statusCode).toBe(200);
    expect(installUrlRes.json()).toEqual({
      url: `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`,
    });

    const intentCookies = extractCookieMap(installUrlRes.headers["set-cookie"]);
    const intentValue = intentCookies.get(GITHUB_INTENT_COOKIE_NAME);
    expect(intentValue).toBeDefined();

    const ghInstallationId = 700100 + Math.floor(Math.random() * 10000);
    mockCreateToken.mockResolvedValue({
      authentication: { token: "ghu_secret_user_token_test_123" },
    });
    mockUserPaginate.mockResolvedValue([{ id: ghInstallationId }]);
    mockGetInstallation.mockResolvedValue({
      data: {
        id: ghInstallationId,
        account: {
          login: `acme-${runId}`,
          type: "Organization",
          id: 998877,
        },
        repository_selection: "selected",
        html_url: `https://github.com/organizations/acme-${runId}/settings/installations/${ghInstallationId}`,
        suspended_at: null,
      },
    });
    mockInstallationPaginate.mockResolvedValue([
      {
        id: 1001,
        full_name: `acme-${runId}/api-service`,
        default_branch: "main",
        private: true,
      },
      {
        id: 1002,
        full_name: `acme-${runId}/web-app`,
        default_branch: "develop",
        private: false,
      },
    ]);

    const callbackRes = await app.inject({
      method: "GET",
      url: `/api/github/callback?code=oauth_code_secret_abc&installation_id=${ghInstallationId}&setup_action=install`,
      headers: {
        cookie: `${alice.cookie}; ${GITHUB_INTENT_COOKIE_NAME}=${intentValue}`,
      },
    });

    expect(callbackRes.statusCode).toBe(302);
    expect(callbackRes.headers.location).toBe(`${env.WEB_ORIGIN}/repositories?connected=1`);

    const installationsRes = await app.inject({
      method: "GET",
      url: "/api/github/installations",
      headers: { cookie: alice.cookie },
    });
    expect(installationsRes.statusCode).toBe(200);
    const installationsBody = installationsRes.json() as {
      installations: Array<{
        id: string;
        installationId: string;
        accountLogin: string;
        accountType: string;
        repositorySelection: string;
      }>;
    };
    expect(installationsBody.installations).toHaveLength(1);
    expect(installationsBody.installations[0]!.installationId).toBe(String(ghInstallationId));
    expect(installationsBody.installations[0]!.accountLogin).toBe(`acme-${runId}`);

    const reposRes = await app.inject({
      method: "GET",
      url: "/api/repositories",
      headers: { cookie: alice.cookie },
    });
    expect(reposRes.statusCode).toBe(200);
    const reposBody = reposRes.json() as {
      items: Array<{ fullName: string; status: string; installationId: string }>;
      total: number;
    };
    expect(reposBody.total).toBe(2);
    expect(reposBody.items.every((r) => r.status === "AVAILABLE")).toBe(true);
    expect(reposBody.items.every((r) => r.installationId === installationsBody.installations[0]!.id)).toBe(true);
  });

  it("(b) rejects installation_id not in user's /user/installations and saves nothing", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const alice = await createVerifiedUser(
      "Alice NotOwned",
      `alice-notowned-${runId}@example.test`,
      "TestPassword!12345"
    );

    const installUrlRes = await app.inject({
      method: "POST",
      url: "/api/github/install-url",
      headers: { cookie: alice.cookie },
    });
    const intentValue = extractCookieMap(installUrlRes.headers["set-cookie"]).get(
      GITHUB_INTENT_COOKIE_NAME
    );

    mockCreateToken.mockResolvedValue({
      authentication: { token: "ghu_secret_user_token_other" },
    });
    mockUserPaginate.mockResolvedValue([{ id: 111111 }]);

    const callbackRes = await app.inject({
      method: "GET",
      url: `/api/github/callback?code=oauth_code_1&installation_id=999999&setup_action=install`,
      headers: {
        cookie: `${alice.cookie}; ${GITHUB_INTENT_COOKIE_NAME}=${intentValue}`,
      },
    });

    expect(callbackRes.statusCode).toBe(302);
    expect(callbackRes.headers.location).toBe(
      `${env.WEB_ORIGIN}/repositories?github_error=installation_not_owned`
    );
    expect(mockGetInstallation).not.toHaveBeenCalled();

    const savedCount = await prisma.githubInstallation.count({
      where: { workspaceId: alice.workspaceId },
    });
    expect(savedCount).toBe(0);
  });

  it("(c) rejects missing, tampered, expired, or wrong-user intent cookie", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const alice = await createVerifiedUser(
      "Alice Intent",
      `alice-intent-${runId}@example.test`,
      "TestPassword!12345"
    );
    const bob = await createVerifiedUser(
      "Bob Intent",
      `bob-intent-${runId}@example.test`,
      "TestPassword!12345"
    );

    // 1. Missing cookie
    const missingRes = await app.inject({
      method: "GET",
      url: "/api/github/callback?code=abc&installation_id=12345&setup_action=install",
      headers: { cookie: alice.cookie },
    });
    expect(missingRes.statusCode).toBe(302);
    expect(missingRes.headers.location).toBe(
      `${env.WEB_ORIGIN}/repositories?github_error=invalid_intent`
    );

    // 2. Tampered cookie
    const validForAlice = createGithubIntentCookieValue({
      userId: alice.userId,
      workspaceId: alice.workspaceId,
    });
    const tamperedCookie = `${validForAlice.slice(0, -4)}AAAA`;
    const tamperedRes = await app.inject({
      method: "GET",
      url: "/api/github/callback?code=abc&installation_id=12345&setup_action=install",
      headers: {
        cookie: `${alice.cookie}; ${GITHUB_INTENT_COOKIE_NAME}=${tamperedCookie}`,
      },
    });
    expect(tamperedRes.statusCode).toBe(302);
    expect(tamperedRes.headers.location).toBe(
      `${env.WEB_ORIGIN}/repositories?github_error=invalid_intent`
    );

    // 3. Expired cookie
    const expiredCookie = createGithubIntentCookieValue({
      userId: alice.userId,
      workspaceId: alice.workspaceId,
      now: Date.now() - 20 * 60 * 1000,
    });
    const expiredRes = await app.inject({
      method: "GET",
      url: "/api/github/callback?code=abc&installation_id=12345&setup_action=install",
      headers: {
        cookie: `${alice.cookie}; ${GITHUB_INTENT_COOKIE_NAME}=${expiredCookie}`,
      },
    });
    expect(expiredRes.statusCode).toBe(302);
    expect(expiredRes.headers.location).toBe(
      `${env.WEB_ORIGIN}/repositories?github_error=invalid_intent`
    );

    // 4. Wrong-user cookie (Bob's cookie used by Alice)
    const bobCookieValue = createGithubIntentCookieValue({
      userId: bob.userId,
      workspaceId: bob.workspaceId,
    });
    const wrongUserRes = await app.inject({
      method: "GET",
      url: "/api/github/callback?code=abc&installation_id=12345&setup_action=install",
      headers: {
        cookie: `${alice.cookie}; ${GITHUB_INTENT_COOKIE_NAME}=${bobCookieValue}`,
      },
    });
    expect(wrongUserRes.statusCode).toBe(302);
    expect(wrongUserRes.headers.location).toBe(
      `${env.WEB_ORIGIN}/repositories?github_error=invalid_intent`
    );
    expect(mockCreateToken).not.toHaveBeenCalled();
  });

  it("(d) rejects an installation already linked to another workspace", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const alice = await createVerifiedUser(
      "Alice Owner",
      `alice-linked-${runId}@example.test`,
      "TestPassword!12345"
    );
    const bob = await createVerifiedUser(
      "Bob Thief",
      `bob-linked-${runId}@example.test`,
      "TestPassword!12345"
    );

    const sharedInstallationId = 710000 + Math.floor(Math.random() * 10000);
    await prisma.githubInstallation.create({
      data: {
        workspaceId: alice.workspaceId,
        installationId: BigInt(sharedInstallationId),
        accountLogin: `alice-org-${runId}`,
        accountType: "Organization",
        accountId: BigInt(555001),
        repositorySelection: "ALL",
        htmlUrl: "https://github.com/settings/installations/710000",
      },
    });

    const bobIntent = createGithubIntentCookieValue({
      userId: bob.userId,
      workspaceId: bob.workspaceId,
    });

    mockCreateToken.mockResolvedValue({
      authentication: { token: "ghu_secret_bob_token" },
    });
    mockUserPaginate.mockResolvedValue([{ id: sharedInstallationId }]);
    mockGetInstallation.mockResolvedValue({
      data: {
        id: sharedInstallationId,
        account: { login: `alice-org-${runId}`, type: "Organization", id: 555001 },
        repository_selection: "all",
        html_url: "https://github.com/settings/installations/710000",
        suspended_at: null,
      },
    });

    const callbackRes = await app.inject({
      method: "GET",
      url: `/api/github/callback?code=code_bob&installation_id=${sharedInstallationId}&setup_action=install`,
      headers: {
        cookie: `${bob.cookie}; ${GITHUB_INTENT_COOKIE_NAME}=${bobIntent}`,
      },
    });

    expect(callbackRes.statusCode).toBe(302);
    expect(callbackRes.headers.location).toBe(
      `${env.WEB_ORIGIN}/repositories?github_error=installation_already_linked`
    );

    const bobCount = await prisma.githubInstallation.count({
      where: { workspaceId: bob.workspaceId },
    });
    expect(bobCount).toBe(0);
  });

  it("(e) enforces strict 404 tenant isolation for installations and repositories", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const alice = await createVerifiedUser(
      "Alice Tenant",
      `alice-tenant-${runId}@example.test`,
      "TestPassword!12345"
    );
    const bob = await createVerifiedUser(
      "Bob Tenant",
      `bob-tenant-${runId}@example.test`,
      "TestPassword!12345"
    );

    const aliceInst = await prisma.githubInstallation.create({
      data: {
        workspaceId: alice.workspaceId,
        installationId: BigInt(720000 + Math.floor(Math.random() * 10000)),
        accountLogin: `alice-iso-${runId}`,
        accountType: "User",
        accountId: BigInt(444001),
        repositorySelection: "SELECTED",
        htmlUrl: "https://github.com/settings/installations/720000",
      },
    });

    const aliceRepo = await prisma.repository.create({
      data: {
        workspaceId: alice.workspaceId,
        installationId: aliceInst.id,
        provider: "GITHUB",
        externalId: `ext-iso-${runId}`,
        fullName: `alice-iso-${runId}/private-repo`,
        defaultBranch: "main",
        isPrivate: true,
        status: "AVAILABLE",
      },
    });

    const [bobListInst, bobSyncInst, bobDelInst, bobConnectRepo, bobDisconnectRepo] =
      await Promise.all([
        app.inject({
          method: "GET",
          url: "/api/github/installations",
          headers: { cookie: bob.cookie },
        }),
        app.inject({
          method: "POST",
          url: `/api/github/installations/${aliceInst.id}/sync`,
          headers: { cookie: bob.cookie },
        }),
        app.inject({
          method: "DELETE",
          url: `/api/github/installations/${aliceInst.id}`,
          headers: { cookie: bob.cookie },
        }),
        app.inject({
          method: "POST",
          url: `/api/repositories/${aliceRepo.id}/connect`,
          headers: { cookie: bob.cookie },
        }),
        app.inject({
          method: "POST",
          url: `/api/repositories/${aliceRepo.id}/disconnect`,
          headers: { cookie: bob.cookie },
        }),
      ]);

    expect(bobListInst.statusCode).toBe(200);
    expect(bobListInst.json()).toEqual({ installations: [] });
    expect(bobSyncInst.statusCode).toBe(404);
    expect(bobDelInst.statusCode).toBe(404);
    expect(bobConnectRepo.statusCode).toBe(404);
    expect(bobDisconnectRepo.statusCode).toBe(404);
  });

  it("(f) enforces RBAC: member role cannot connect, sync, or delete (403) but can list", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const owner = await createVerifiedUser(
      "Owner User",
      `owner-rbac-${runId}@example.test`,
      "TestPassword!12345"
    );
    const memberUser = await createVerifiedUser(
      "Member User",
      `member-rbac-${runId}@example.test`,
      "TestPassword!12345"
    );

    // Add memberUser to owner's workspace with role "member" and switch their activeOrganizationId
    await prisma.member.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: owner.workspaceId,
        userId: memberUser.userId,
        role: "member",
        createdAt: new Date(),
      },
    });
    await prisma.session.updateMany({
      where: { userId: memberUser.userId },
      data: { activeOrganizationId: owner.workspaceId },
    });

    const inst = await prisma.githubInstallation.create({
      data: {
        workspaceId: owner.workspaceId,
        installationId: BigInt(730000 + Math.floor(Math.random() * 10000)),
        accountLogin: `rbac-org-${runId}`,
        accountType: "Organization",
        accountId: BigInt(333001),
        repositorySelection: "ALL",
        htmlUrl: "https://github.com/settings/installations/730000",
      },
    });

    const repo = await prisma.repository.create({
      data: {
        workspaceId: owner.workspaceId,
        installationId: inst.id,
        provider: "GITHUB",
        externalId: `ext-rbac-${runId}`,
        fullName: `rbac-org-${runId}/core`,
        defaultBranch: "main",
        isPrivate: false,
        status: "AVAILABLE",
      },
    });

    const [
      memberListInst,
      memberListRepos,
      memberInstallUrl,
      memberSync,
      memberDeleteInst,
      memberConnectRepo,
      memberDisconnectRepo,
    ] = await Promise.all([
      app.inject({
        method: "GET",
        url: "/api/github/installations",
        headers: { cookie: memberUser.cookie },
      }),
      app.inject({
        method: "GET",
        url: "/api/repositories",
        headers: { cookie: memberUser.cookie },
      }),
      app.inject({
        method: "POST",
        url: "/api/github/install-url",
        headers: { cookie: memberUser.cookie },
      }),
      app.inject({
        method: "POST",
        url: `/api/github/installations/${inst.id}/sync`,
        headers: { cookie: memberUser.cookie },
      }),
      app.inject({
        method: "DELETE",
        url: `/api/github/installations/${inst.id}`,
        headers: { cookie: memberUser.cookie },
      }),
      app.inject({
        method: "POST",
        url: `/api/repositories/${repo.id}/connect`,
        headers: { cookie: memberUser.cookie },
      }),
      app.inject({
        method: "POST",
        url: `/api/repositories/${repo.id}/disconnect`,
        headers: { cookie: memberUser.cookie },
      }),
    ]);

    expect(memberListInst.statusCode).toBe(200);
    expect((memberListInst.json() as { installations: unknown[] }).installations).toHaveLength(1);
    expect(memberListRepos.statusCode).toBe(200);
    expect((memberListRepos.json() as { items: unknown[] }).items).toHaveLength(1);

    expect(memberInstallUrl.statusCode).toBe(403);
    expect(memberSync.statusCode).toBe(403);
    expect(memberDeleteInst.statusCode).toBe(403);
    expect(memberConnectRepo.statusCode).toBe(403);
    expect(memberDisconnectRepo.statusCode).toBe(403);
  });

  it("(g) sync keeps CONNECTED choices, marks missing repos REMOVED, restores reappearing REMOVED repos, and handles pagination", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const alice = await createVerifiedUser(
      "Alice Sync",
      `alice-sync-${runId}@example.test`,
      "TestPassword!12345"
    );

    const inst = await prisma.githubInstallation.create({
      data: {
        workspaceId: alice.workspaceId,
        installationId: BigInt(740000 + Math.floor(Math.random() * 10000)),
        accountLogin: `sync-org-${runId}`,
        accountType: "Organization",
        accountId: BigInt(222001),
        repositorySelection: "ALL",
        htmlUrl: "https://github.com/settings/installations/740000",
      },
    });

    const connectedRepo = await prisma.repository.create({
      data: {
        workspaceId: alice.workspaceId,
        installationId: inst.id,
        provider: "GITHUB",
        externalId: "101",
        fullName: `sync-org-${runId}/keep-connected`,
        defaultBranch: "main",
        isPrivate: true,
        status: "CONNECTED",
      },
    });

    const missingRepo = await prisma.repository.create({
      data: {
        workspaceId: alice.workspaceId,
        installationId: inst.id,
        provider: "GITHUB",
        externalId: "102",
        fullName: `sync-org-${runId}/removed-repo`,
        defaultBranch: "main",
        isPrivate: false,
        status: "AVAILABLE",
      },
    });

    const reappearingRepo = await prisma.repository.create({
      data: {
        workspaceId: alice.workspaceId,
        installationId: inst.id,
        provider: "GITHUB",
        externalId: "103",
        fullName: `sync-org-${runId}/reappeared-repo`,
        defaultBranch: "main",
        isPrivate: false,
        status: "REMOVED",
      },
    });

    // Simulate paginated response returning 120 repos (including 101 and 103, excluding 102)
    const extraRepos = Array.from({ length: 118 }, (_, i) => ({
      id: 2000 + i,
      full_name: `sync-org-${runId}/extra-${String(i).padStart(3, "0")}`,
      default_branch: "main",
      private: i % 2 === 0,
    }));

    mockInstallationPaginate.mockResolvedValue([
      {
        id: 101,
        full_name: `sync-org-${runId}/keep-connected`,
        default_branch: "main",
        private: true,
      },
      {
        id: 103,
        full_name: `sync-org-${runId}/reappeared-repo`,
        default_branch: "trunk",
        private: true,
      },
      ...extraRepos,
    ]);

    const syncRes = await app.inject({
      method: "POST",
      url: `/api/github/installations/${inst.id}/sync`,
      headers: { cookie: alice.cookie },
    });

    expect(syncRes.statusCode).toBe(200);
    const syncBody = syncRes.json() as {
      synced: number;
      removed: number;
      lastSyncedAt: string;
    };
    expect(syncBody.synced).toBe(120);
    expect(syncBody.removed).toBe(1);
    expect(syncBody.lastSyncedAt).toBeTruthy();

    const [updatedConnected, updatedMissing, updatedReappearing] = await Promise.all([
      prisma.repository.findUniqueOrThrow({ where: { id: connectedRepo.id } }),
      prisma.repository.findUniqueOrThrow({ where: { id: missingRepo.id } }),
      prisma.repository.findUniqueOrThrow({ where: { id: reappearingRepo.id } }),
    ]);

    expect(updatedConnected.status).toBe("CONNECTED");
    expect(updatedMissing.status).toBe("REMOVED");
    expect(updatedReappearing.status).toBe("AVAILABLE");
    expect(updatedReappearing.defaultBranch).toBe("trunk");

    // Verify filter + search + connect/disconnect flow
    const searchRes = await app.inject({
      method: "GET",
      url: `/api/repositories?search=reappeared&status=AVAILABLE`,
      headers: { cookie: alice.cookie },
    });
    expect(searchRes.statusCode).toBe(200);
    expect((searchRes.json() as { total: number }).total).toBe(1);

    const connectRes = await app.inject({
      method: "POST",
      url: `/api/repositories/${reappearingRepo.id}/connect`,
      headers: { cookie: alice.cookie },
    });
    expect(connectRes.statusCode).toBe(200);

    // Connecting an already CONNECTED repo returns 409
    const doubleConnectRes = await app.inject({
      method: "POST",
      url: `/api/repositories/${reappearingRepo.id}/connect`,
      headers: { cookie: alice.cookie },
    });
    expect(doubleConnectRes.statusCode).toBe(409);

    const disconnectRes = await app.inject({
      method: "POST",
      url: `/api/repositories/${reappearingRepo.id}/disconnect`,
      headers: { cookie: alice.cookie },
    });
    expect(disconnectRes.statusCode).toBe(200);

    // Delete installation removes local records and returns htmlUrl
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/github/installations/${inst.id}`,
      headers: { cookie: alice.cookie },
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json()).toEqual({
      deleted: true,
      htmlUrl: "https://github.com/settings/installations/740000",
    });
  });

  it("(h) redacts OAuth codes and never exposes tokens, codes, or secrets in logs or responses", async () => {
    const rawCode = "secret_oauth_code_value_987654";
    const sanitized = sanitizeRequestUrl(
      `/api/github/callback?code=${rawCode}&installation_id=12345&setup_action=install`
    );
    expect(sanitized).not.toContain(rawCode);
    expect(sanitized).toContain("installation_id=12345");

    const runId = crypto.randomBytes(4).toString("hex");
    const alice = await createVerifiedUser(
      "Alice Redact",
      `alice-redact-${runId}@example.test`,
      "TestPassword!12345"
    );

    const intent = createGithubIntentCookieValue({
      userId: alice.userId,
      workspaceId: alice.workspaceId,
    });
    const secretUserToken = "ghu_super_secret_token_should_never_leak";
    mockCreateToken.mockRejectedValue(
      new Error(`OAuth failed with ?code=${rawCode} and token ${secretUserToken}`)
    );

    const callbackRes = await app.inject({
      method: "GET",
      url: `/api/github/callback?code=${rawCode}&installation_id=12345&setup_action=install`,
      headers: {
        cookie: `${alice.cookie}; ${GITHUB_INTENT_COOKIE_NAME}=${intent}`,
      },
    });

    expect(callbackRes.statusCode).toBe(302);
    expect(callbackRes.headers.location).toBe(
      `${env.WEB_ORIGIN}/repositories?github_error=unknown`
    );
    expect(JSON.stringify(callbackRes.headers)).not.toContain(rawCode);
    expect(JSON.stringify(callbackRes.headers)).not.toContain(secretUserToken);
    expect(JSON.stringify(callbackRes.headers)).not.toContain(env.GITHUB_APP_CLIENT_SECRET);
  });
});

