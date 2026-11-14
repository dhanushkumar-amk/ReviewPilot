import crypto from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

const mockInngestSend = vi.fn();
const mockGetBranch = vi.fn();
const mockGetInstallationOctokit = vi.fn();

vi.mock("../src/inngest/client.js", async () => {
  const actual = await vi.importActual<typeof import("../src/inngest/client.js")>(
    "../src/inngest/client.js",
  );
  return {
    inngest: Object.assign(Object.create(Object.getPrototypeOf(actual.inngest)), actual.inngest, {
      send: mockInngestSend,
    }),
  };
});

vi.mock("../src/github/app.js", () => ({
  githubApp: {
    oauth: { createToken: vi.fn() },
    octokit: { rest: { apps: { getInstallation: vi.fn() } } },
    getInstallationOctokit: mockGetInstallationOctokit,
  },
  createUserOctokit: vi.fn(),
}));

import { buildApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { env } from "../src/env.js";

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

function signWebhookBody(body: string): string {
  return (
    "sha256=" +
    crypto
      .createHmac("sha256", env.GITHUB_WEBHOOK_SECRET)
      .update(Buffer.from(body, "utf8"))
      .digest("hex")
  );
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

describe("GitHub webhooks, scans, and manual scan trigger", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockInngestSend.mockResolvedValue({ ids: ["evt_test_1"] });
    mockGetBranch.mockResolvedValue({
      data: {
        commit: {
          sha: "1111111222222233333334444444555555566666",
        },
      },
    });
    mockGetInstallationOctokit.mockResolvedValue({
      rest: {
        repos: {
          getBranch: mockGetBranch,
        },
      },
    });

    await prisma.scan.deleteMany({});
    await prisma.webhookDelivery.deleteMany({});
    await prisma.repository.deleteMany({});
    await prisma.githubInstallation.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects missing or invalid x-hub-signature-256 with 401 before touching DB", async () => {
    const payload = JSON.stringify({ zen: "Keep it logically awesome." });

    const missingSig = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-github-event": "ping",
        "x-github-delivery": "deliv-missing-sig",
      },
      payload,
    });
    expect(missingSig.statusCode).toBe(401);

    const badSig = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=" + "0".repeat(64),
        "x-github-event": "ping",
        "x-github-delivery": "deliv-bad-sig",
      },
      payload,
    });
    expect(badSig.statusCode).toBe(401);

    const deliveries = await prisma.webhookDelivery.count();
    expect(deliveries).toBe(0);
  });

  it("rejects missing x-github-event or x-github-delivery with 400", async () => {
    const payload = JSON.stringify({ zen: "hello" });
    const sig = signWebhookBody(payload);

    const missingEvent = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sig,
        "x-github-delivery": "deliv-1",
      },
      payload,
    });
    expect(missingEvent.statusCode).toBe(400);

    const missingDelivery = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sig,
        "x-github-event": "ping",
      },
      payload,
    });
    expect(missingDelivery.statusCode).toBe(400);
  });

  it("deduplicates repeated x-github-delivery and returns 200 duplicate", async () => {
    const { workspaceId } = await signUpAndGetWorkspace(
      app,
      "dedupe@example.com",
      "Dedupe Owner",
    );

    const installation = await prisma.githubInstallation.create({
      data: {
        workspaceId,
        installationId: 777001n,
        accountLogin: "acme",
        accountType: "Organization",
        accountId: 9001n,
        repositorySelection: "SELECTED",
        htmlUrl: "https://github.com/organizations/acme/settings/installations/777001",
      },
    });

    await prisma.repository.create({
      data: {
        workspaceId,
        installationId: installation.id,
        provider: "GITHUB",
        externalId: "42001",
        fullName: "acme/web",
        defaultBranch: "main",
        isPrivate: true,
        status: "CONNECTED",
      },
    });

    const payload = JSON.stringify({
      ref: "refs/heads/main",
      after: "abcdef1234567890abcdef1234567890abcdef12",
      repository: { id: 42001, full_name: "acme/web" },
      installation: { id: 777001 },
      sender: { login: "dev-user" },
    });
    const sig = signWebhookBody(payload);

    const first = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sig,
        "x-github-event": "push",
        "x-github-delivery": "deliv-dup-1",
      },
      payload,
    });
    expect(first.statusCode).toBe(202);
    expect(first.json()).toEqual({ status: "queued" });

    const second = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": sig,
        "x-github-event": "push",
        "x-github-delivery": "deliv-dup-1",
      },
      payload,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ status: "duplicate" });
    expect(mockInngestSend).toHaveBeenCalledTimes(1);
  });

  it("ignores tag, deleted, zero-sha, reviewpilot/, non-default branch, and non-connected pushes", async () => {
    const { workspaceId } = await signUpAndGetWorkspace(
      app,
      "ignore@example.com",
      "Ignore Owner",
    );

    const installation = await prisma.githubInstallation.create({
      data: {
        workspaceId,
        installationId: 777002n,
        accountLogin: "acme",
        accountType: "Organization",
        accountId: 9002n,
        repositorySelection: "SELECTED",
        htmlUrl: "https://github.com/organizations/acme/settings/installations/777002",
      },
    });

    await prisma.repository.create({
      data: {
        workspaceId,
        installationId: installation.id,
        provider: "GITHUB",
        externalId: "42002",
        fullName: "acme/connected",
        defaultBranch: "main",
        isPrivate: false,
        status: "CONNECTED",
      },
    });

    await prisma.repository.create({
      data: {
        workspaceId,
        installationId: installation.id,
        provider: "GITHUB",
        externalId: "42003",
        fullName: "acme/available",
        defaultBranch: "main",
        isPrivate: false,
        status: "AVAILABLE",
      },
    });

    const cases: Array<{ deliveryId: string; body: Record<string, unknown>; reason: string }> = [
      {
        deliveryId: "ign-tag",
        body: {
          ref: "refs/tags/v1.0.0",
          after: "abcdef1234567890abcdef1234567890abcdef12",
          repository: { id: 42002, full_name: "acme/connected" },
          installation: { id: 777002 },
        },
        reason: "tag_push",
      },
      {
        deliveryId: "ign-deleted",
        body: {
          ref: "refs/heads/main",
          deleted: true,
          after: "abcdef1234567890abcdef1234567890abcdef12",
          repository: { id: 42002, full_name: "acme/connected" },
          installation: { id: 777002 },
        },
        reason: "branch_deleted",
      },
      {
        deliveryId: "ign-zero",
        body: {
          ref: "refs/heads/main",
          after: "0000000000000000000000000000000000000000",
          repository: { id: 42002, full_name: "acme/connected" },
          installation: { id: 777002 },
        },
        reason: "zero_commit_sha",
      },
      {
        deliveryId: "ign-rp-branch",
        body: {
          ref: "refs/heads/reviewpilot/fix-1",
          after: "abcdef1234567890abcdef1234567890abcdef12",
          repository: { id: 42002, full_name: "acme/connected" },
          installation: { id: 777002 },
        },
        reason: "reviewpilot_branch",
      },
      {
        deliveryId: "ign-feature",
        body: {
          ref: "refs/heads/feature/x",
          after: "abcdef1234567890abcdef1234567890abcdef12",
          repository: { id: 42002, full_name: "acme/connected" },
          installation: { id: 777002 },
        },
        reason: "non_default_branch",
      },
      {
        deliveryId: "ign-not-connected",
        body: {
          ref: "refs/heads/main",
          after: "abcdef1234567890abcdef1234567890abcdef12",
          repository: { id: 42003, full_name: "acme/available" },
          installation: { id: 777002 },
        },
        reason: "repository_not_connected",
      },
    ];

    for (const testCase of cases) {
      const payload = JSON.stringify(testCase.body);
      const res = await app.inject({
        method: "POST",
        url: "/api/github/webhooks",
        headers: {
          "content-type": "application/json",
          "x-hub-signature-256": signWebhookBody(payload),
          "x-github-event": "push",
          "x-github-delivery": testCase.deliveryId,
        },
        payload,
      });
      expect(res.statusCode).toBe(202);
      expect(res.json()).toEqual({ status: "ignored", reason: testCase.reason });

      const delivery = await prisma.webhookDelivery.findUnique({
        where: { deliveryId: testCase.deliveryId },
      });
      expect(delivery?.status).toBe("IGNORED");
      expect(delivery?.ignoreReason).toBe(testCase.reason);
    }

    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("enqueues scan and updates lastPushAt on valid default-branch push", async () => {
    const { workspaceId } = await signUpAndGetWorkspace(
      app,
      "push@example.com",
      "Push Owner",
    );

    const installation = await prisma.githubInstallation.create({
      data: {
        workspaceId,
        installationId: 777003n,
        accountLogin: "acme",
        accountType: "Organization",
        accountId: 9003n,
        repositorySelection: "SELECTED",
        htmlUrl: "https://github.com/organizations/acme/settings/installations/777003",
      },
    });

    const repo = await prisma.repository.create({
      data: {
        workspaceId,
        installationId: installation.id,
        provider: "GITHUB",
        externalId: "42004",
        fullName: "acme/api",
        defaultBranch: "main",
        isPrivate: true,
        status: "CONNECTED",
      },
    });

    const payload = JSON.stringify({
      ref: "refs/heads/main",
      after: "fedcba9876543210fedcba9876543210fedcba98",
      repository: { id: 42004, full_name: "acme/api" },
      installation: { id: 777003 },
      sender: { login: "alice" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signWebhookBody(payload),
        "x-github-event": "push",
        "x-github-delivery": "deliv-push-ok",
      },
      payload,
    });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ status: "queued" });

    const updatedRepo = await prisma.repository.findUnique({
      where: { id: repo.id },
    });
    expect(updatedRepo?.lastPushAt).not.toBeNull();

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "github/push.received",
        data: expect.objectContaining({
          deliveryId: "deliv-push-ok",
          workspaceId,
          repositoryId: repo.id,
          installationId: "777003",
          branch: "main",
          commitSha: "fedcba9876543210fedcba9876543210fedcba98",
          senderLogin: "alice",
        }),
      }),
    );
  });

  it("handles installation suspend, unsuspend, and deleted webhooks", async () => {
    const { workspaceId } = await signUpAndGetWorkspace(
      app,
      "inst@example.com",
      "Inst Owner",
    );

    const installation = await prisma.githubInstallation.create({
      data: {
        workspaceId,
        installationId: 777004n,
        accountLogin: "acme",
        accountType: "Organization",
        accountId: 9004n,
        repositorySelection: "ALL",
        htmlUrl: "https://github.com/organizations/acme/settings/installations/777004",
      },
    });

    const suspendPayload = JSON.stringify({
      action: "suspend",
      installation: { id: 777004 },
    });
    const suspendRes = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signWebhookBody(suspendPayload),
        "x-github-event": "installation",
        "x-github-delivery": "deliv-inst-suspend",
      },
      payload: suspendPayload,
    });
    expect(suspendRes.statusCode).toBe(200);

    const afterSuspend = await prisma.githubInstallation.findUnique({
      where: { id: installation.id },
    });
    expect(afterSuspend?.suspendedAt).not.toBeNull();

    const unsuspendPayload = JSON.stringify({
      action: "unsuspend",
      installation: { id: 777004 },
    });
    const unsuspendRes = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signWebhookBody(unsuspendPayload),
        "x-github-event": "installation",
        "x-github-delivery": "deliv-inst-unsuspend",
      },
      payload: unsuspendPayload,
    });
    expect(unsuspendRes.statusCode).toBe(202);
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "github/installation.changed",
        data: expect.objectContaining({
          installationId: "777004",
          action: "unsuspend",
        }),
      }),
    );

    const deletePayload = JSON.stringify({
      action: "deleted",
      installation: { id: 777004 },
    });
    const deleteRes = await app.inject({
      method: "POST",
      url: "/api/github/webhooks",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": signWebhookBody(deletePayload),
        "x-github-event": "installation",
        "x-github-delivery": "deliv-inst-delete",
      },
      payload: deletePayload,
    });
    expect(deleteRes.statusCode).toBe(200);

    const afterDelete = await prisma.githubInstallation.findUnique({
      where: { id: installation.id },
    });
    expect(afterDelete).toBeNull();
  });

  it("enforces workspace isolation and CONNECTED status on manual scan and scans API", async () => {
    const ws1 = await signUpAndGetWorkspace(app, "ws1@example.com", "WS1 User");
    const ws2 = await signUpAndGetWorkspace(app, "ws2@example.com", "WS2 User");

    const installation = await prisma.githubInstallation.create({
      data: {
        workspaceId: ws1.workspaceId,
        installationId: 777005n,
        accountLogin: "ws1-org",
        accountType: "Organization",
        accountId: 9005n,
        repositorySelection: "SELECTED",
        htmlUrl: "https://github.com/organizations/ws1-org/settings/installations/777005",
      },
    });

    const connectedRepo = await prisma.repository.create({
      data: {
        workspaceId: ws1.workspaceId,
        installationId: installation.id,
        provider: "GITHUB",
        externalId: "42005",
        fullName: "ws1-org/service",
        defaultBranch: "main",
        isPrivate: true,
        status: "CONNECTED",
      },
    });

    const availableRepo = await prisma.repository.create({
      data: {
        workspaceId: ws1.workspaceId,
        installationId: installation.id,
        provider: "GITHUB",
        externalId: "42006",
        fullName: "ws1-org/other",
        defaultBranch: "main",
        isPrivate: false,
        status: "AVAILABLE",
      },
    });

    // WS2 cannot trigger manual scan on WS1 repo -> 404
    const crossWorkspaceScan = await app.inject({
      method: "POST",
      url: `/api/repositories/${connectedRepo.id}/scan`,
      headers: { cookie: ws2.cookie },
    });
    expect(crossWorkspaceScan.statusCode).toBe(404);

    // WS1 cannot trigger manual scan on non-CONNECTED repo -> 404
    const notConnectedScan = await app.inject({
      method: "POST",
      url: `/api/repositories/${availableRepo.id}/scan`,
      headers: { cookie: ws1.cookie },
    });
    expect(notConnectedScan.statusCode).toBe(404);

    // WS1 triggers manual scan on CONNECTED repo -> 202
    const okScan = await app.inject({
      method: "POST",
      url: `/api/repositories/${connectedRepo.id}/scan`,
      headers: { cookie: ws1.cookie },
    });
    expect(okScan.statusCode).toBe(202);
    expect(okScan.json()).toEqual({ ok: true });
    expect(mockGetBranch).toHaveBeenCalledWith({
      owner: "ws1-org",
      repo: "service",
      branch: "main",
    });
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "github/scan.requested",
        data: expect.objectContaining({
          workspaceId: ws1.workspaceId,
          repositoryId: connectedRepo.id,
          branch: "main",
          commitSha: "1111111222222233333334444444555555566666",
          trigger: "MANUAL",
        }),
      }),
    );

    // Scans API workspace isolation
    const createdScan = await prisma.scan.create({
      data: {
        workspaceId: ws1.workspaceId,
        repositoryId: connectedRepo.id,
        branch: "main",
        commitSha: "1111111222222233333334444444555555566666",
        trigger: "MANUAL",
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 3000),
        finishedAt: new Date(),
      },
    });

    const ws1List = await app.inject({
      method: "GET",
      url: "/api/scans",
      headers: { cookie: ws1.cookie },
    });
    expect(ws1List.statusCode).toBe(200);
    expect((ws1List.json() as { items: Array<{ id: string }> }).items).toHaveLength(1);

    const ws2List = await app.inject({
      method: "GET",
      url: "/api/scans",
      headers: { cookie: ws2.cookie },
    });
    expect(ws2List.statusCode).toBe(200);
    expect((ws2List.json() as { items: Array<{ id: string }> }).items).toHaveLength(0);

    const ws2Detail = await app.inject({
      method: "GET",
      url: `/api/scans/${createdScan.id}`,
      headers: { cookie: ws2.cookie },
    });
    expect(ws2Detail.statusCode).toBe(404);
  });
});

