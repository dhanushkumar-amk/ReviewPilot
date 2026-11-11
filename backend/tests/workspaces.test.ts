import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/app.js";
import { prisma } from "../src/db.js";
import { auth } from "../src/auth.js";

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];

  const cookiePairs = cookies
    .map((entry) => entry.split(";")[0]?.trim())
    .filter((pair): pair is string => Boolean(pair));

  return cookiePairs.join("; ");
}

describe("workspaces and multi-tenant isolation", () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  beforeAll(async () => {
    app = await buildServer();
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

  async function signUpAndGetCookie(name: string, email: string, password: string) {
    const signUpResponse = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { name, email, password },
    });

    expect(signUpResponse.statusCode).toBe(200);
    const signUpBody = signUpResponse.json() as {
      user: { id: string; name: string; email: string };
    };
    createdUserIds.push(signUpBody.user.id);

    await prisma.user.update({
      where: { id: signUpBody.user.id },
      data: { emailVerified: true },
    });

    const signInResponse = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email, password },
    });

    expect(signInResponse.statusCode).toBe(200);
    const cookie = extractSessionCookie(signInResponse.headers["set-cookie"]);
    expect(cookie.length).toBeGreaterThan(0);

    return {
      userId: signUpBody.user.id,
      cookie,
    };
  }

  it("rejects unauthenticated requests with 401", async () => {
    const [meRes, reposRes, repoByIdRes] = await Promise.all([
      app.inject({ method: "GET", url: "/api/me" }),
      app.inject({ method: "GET", url: "/api/repositories" }),
      app.inject({ method: "GET", url: "/api/repositories/nonexistent-id" }),
    ]);

    expect(meRes.statusCode).toBe(401);
    expect(reposRes.statusCode).toBe(401);
    expect(repoByIdRes.statusCode).toBe(401);
  });

  it("auto-creates one personal owner workspace on sign-up, backfills active workspace, and isolates repositories", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const password = "TestPassword!12345";

    const alice = await signUpAndGetCookie(
      "Alice Lovelace",
      `alice-${runId}@example.test`,
      password
    );
    const bob = await signUpAndGetCookie(
      "Bob Builder",
      `bob-${runId}@example.test`,
      password
    );

    const aliceMeRes = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: alice.cookie },
    });
    expect(aliceMeRes.statusCode).toBe(200);
    const aliceMe = aliceMeRes.json() as {
      user: { id: string; name: string; email: string; emailVerified: boolean; image: string | null };
      activeWorkspace: { id: string; name: string; slug: string; role: string } | null;
      workspaces: Array<{ id: string; name: string; slug: string; role: string }>;
    };

    expect(aliceMe.user.id).toBe(alice.userId);
    expect(aliceMe.workspaces).toHaveLength(1);
    expect(aliceMe.activeWorkspace).not.toBeNull();
    expect(aliceMe.activeWorkspace!.id).toBe(aliceMe.workspaces[0]!.id);
    expect(aliceMe.activeWorkspace!.name).toBe("Alice's workspace");
    expect(aliceMe.activeWorkspace!.slug).toMatch(/^alice-s-workspace-[a-z0-9]{6}$/);
    expect(aliceMe.activeWorkspace!.role).toBe("owner");
    createdOrgIds.push(aliceMe.activeWorkspace!.id);

    const bobMeRes = await app.inject({
      method: "GET",
      url: "/api/me",
      headers: { cookie: bob.cookie },
    });
    expect(bobMeRes.statusCode).toBe(200);
    const bobMe = bobMeRes.json() as typeof aliceMe;

    expect(bobMe.workspaces).toHaveLength(1);
    expect(bobMe.activeWorkspace).not.toBeNull();
    createdOrgIds.push(bobMe.activeWorkspace!.id);

    // Signing in again does not create duplicate personal workspaces
    const aliceSignInAgain = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email: `alice-${runId}@example.test`, password },
    });
    expect(aliceSignInAgain.statusCode).toBe(200);
    const membershipCount = await prisma.member.count({
      where: { userId: alice.userId },
    });
    expect(membershipCount).toBe(1);

    // Seed repositories for Bob's workspace and two for Alice's workspace
    const bobRepo = await prisma.repository.create({
      data: {
        workspaceId: bobMe.activeWorkspace!.id,
        provider: "GITHUB",
        externalId: `ext-bob-${runId}`,
        fullName: `bob-org/secret-repo-${runId}`,
        defaultBranch: "main",
        isPrivate: true,
        status: "CONNECTED",
      },
    });

    // Initially Alice sees zero repositories and receives 404 (not 403) for Bob's repository
    const aliceEmptyReposRes = await app.inject({
      method: "GET",
      url: "/api/repositories",
      headers: { cookie: alice.cookie },
    });
    expect(aliceEmptyReposRes.statusCode).toBe(200);
    expect(aliceEmptyReposRes.json()).toEqual({
      items: [],
      total: 0,
      nextCursor: null,
    });

    const crossTenantRes = await app.inject({
      method: "GET",
      url: `/api/repositories/${bobRepo.id}`,
      headers: { cookie: alice.cookie },
    });
    expect(crossTenantRes.statusCode).toBe(404);

    // Spoofed workspace headers or query parameters never grant access to Bob's workspace
    const spoofedListRes = await app.inject({
      method: "GET",
      url: `/api/repositories?workspaceId=${bobMe.activeWorkspace!.id}&organizationId=${bobMe.activeWorkspace!.id}`,
      headers: {
        cookie: alice.cookie,
        "x-workspace-id": bobMe.activeWorkspace!.id,
        "x-organization-id": bobMe.activeWorkspace!.id,
      },
    });
    expect(spoofedListRes.statusCode).toBe(200);
    expect(spoofedListRes.json()).toEqual({
      items: [],
      total: 0,
      nextCursor: null,
    });

    const spoofedDetailRes = await app.inject({
      method: "GET",
      url: `/api/repositories/${bobRepo.id}?workspaceId=${bobMe.activeWorkspace!.id}`,
      headers: {
        cookie: alice.cookie,
        "x-workspace-id": bobMe.activeWorkspace!.id,
      },
    });
    expect(spoofedDetailRes.statusCode).toBe(404);

    // Alice creates her own repos (direct Prisma seed) and cursor pagination respects workspace scope
    const aliceRepo1 = await prisma.repository.create({
      data: {
        workspaceId: aliceMe.activeWorkspace!.id,
        provider: "GITHUB",
        externalId: `ext-alice-1-${runId}`,
        fullName: `alice-org/repo-one-${runId}`,
        defaultBranch: "main",
        isPrivate: false,
        status: "CONNECTED",
      },
    });
    const aliceRepo2 = await prisma.repository.create({
      data: {
        workspaceId: aliceMe.activeWorkspace!.id,
        provider: "GITHUB",
        externalId: `ext-alice-2-${runId}`,
        fullName: `alice-org/repo-two-${runId}`,
        defaultBranch: "main",
        isPrivate: true,
        status: "CONNECTED",
      },
    });

    const page1Res = await app.inject({
      method: "GET",
      url: "/api/repositories?limit=1",
      headers: { cookie: alice.cookie },
    });
    expect(page1Res.statusCode).toBe(200);
    const page1 = page1Res.json() as {
      items: Array<{ id: string; workspaceId: string }>;
      total: number;
      nextCursor: string | null;
    };
    expect(page1.total).toBe(2);
    expect(page1.items).toHaveLength(1);
    expect(page1.nextCursor).toBe(page1.items[0]!.id);

    const page2Res = await app.inject({
      method: "GET",
      url: `/api/repositories?limit=1&cursor=${encodeURIComponent(page1.nextCursor!)}`,
      headers: { cookie: alice.cookie },
    });
    expect(page2Res.statusCode).toBe(200);
    const page2 = page2Res.json() as typeof page1;
    expect(page2.total).toBe(2);
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0]!.id).not.toBe(page1.items[0]!.id);
    expect(new Set([page1.items[0]!.id, page2.items[0]!.id])).toEqual(
      new Set([aliceRepo1.id, aliceRepo2.id])
    );
    expect(page2.nextCursor).toBeNull();

    const ownDetailRes = await app.inject({
      method: "GET",
      url: `/api/repositories/${aliceRepo1.id}`,
      headers: { cookie: alice.cookie },
    });
    expect(ownDetailRes.statusCode).toBe(200);
    expect((ownDetailRes.json() as { repository: { id: string } }).repository.id).toBe(
      aliceRepo1.id
    );
  });

  it("backfills a workspace on session creation for legacy users without a workspace", async () => {
    const runId = crypto.randomBytes(4).toString("hex");
    const legacyUserId = crypto.randomUUID();
    const email = `legacy-${runId}@example.test`;

    // Use a name with spaces missing (empty string fallback -> "My workspace")
    await prisma.user.create({
      data: {
        id: legacyUserId,
        name: "   ",
        email,
        emailVerified: true,
      },
    });
    createdUserIds.push(legacyUserId);

    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash("LegacyPass!12345");
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: legacyUserId,
        providerId: "credential",
        userId: legacyUserId,
        password: hashedPassword,
      },
    });

    const signInRes = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email, password: "LegacyPass!12345" },
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
      activeWorkspace: { id: string; name: string; slug: string; role: string } | null;
      workspaces: Array<{ id: string; name: string; slug: string; role: string }>;
    };

    expect(me.workspaces).toHaveLength(1);
    expect(me.activeWorkspace).not.toBeNull();
    expect(me.activeWorkspace!.name).toBe("My workspace");
    expect(me.activeWorkspace!.role).toBe("owner");
    createdOrgIds.push(me.activeWorkspace!.id);
  });
});

