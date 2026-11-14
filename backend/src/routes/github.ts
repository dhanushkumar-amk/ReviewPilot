import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { createUserOctokit, githubApp } from "../github/app.js";
import {
  clearGithubIntentCookie,
  createGithubIntentCookieValue,
  extractCookieValue,
  GITHUB_INTENT_COOKIE_NAME,
  serializeGithubIntentCookie,
  verifyGithubIntentCookieValue,
} from "../github/intent.js";
import { GithubSyncError, syncInstallation } from "../github/sync.js";
import { getSession } from "../lib/auth-session.js";
import { InMemoryRateLimiter } from "../lib/rate-limit.js";
import {
  canManageWorkspace,
  requireWorkspace,
  requireWorkspaceAdmin,
  workspaceWhere,
} from "../tenancy/workspace.js";

const installUrlLimiter = new InMemoryRateLimiter(10, 60_000);
const callbackLimiter = new InMemoryRateLimiter(20, 60_000);
const syncLimiter = new InMemoryRateLimiter(6, 60_000);

export function resetGithubRateLimiters(): void {
  installUrlLimiter.reset();
  callbackLimiter.reset();
  syncLimiter.reset();
}

const callbackQuerySchema = z.discriminatedUnion("setup_action", [
  z.object({
    setup_action: z.literal("request"),
    code: z.string().trim().min(1).optional(),
    installation_id: z.string().trim().regex(/^\d+$/).optional(),
  }),
  z.object({
    setup_action: z.enum(["install", "update"]),
    code: z.string().trim().min(1),
    installation_id: z.string().trim().regex(/^\d+$/),
  }),
]);

const installationIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

type GithubErrorCode =
  | "invalid_intent"
  | "installation_not_owned"
  | "installation_already_linked"
  | "unknown";

function sanitizeGithubError(err: unknown): {
  name: string;
  message: string;
  status?: number;
} {
  if (err instanceof Error) {
    const safeMessage = err.message
      .replace(/([?&](?:code|state|access_token|refresh_token|id_token)=)[^&\s]+/gi, "$1[REDACTED]")
      .replace(/gh[pousr]_[A-Za-z0-9_]+/g, "[REDACTED]");
    const status =
      "status" in err && typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : undefined;
    return {
      name: err.name,
      message: safeMessage,
      ...(status !== undefined ? { status } : {}),
    };
  }
  return {
    name: "Error",
    message: "Unknown GitHub integration error",
  };
}

function serializeInstallation(row: {
  id: string;
  workspaceId: string;
  installationId: bigint;
  accountLogin: string;
  accountType: "User" | "Organization";
  accountId: bigint;
  repositorySelection: "ALL" | "SELECTED";
  htmlUrl: string;
  suspendedAt: Date | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    installationId: row.installationId.toString(),
    accountLogin: row.accountLogin,
    accountType: row.accountType,
    accountId: row.accountId.toString(),
    repositorySelection: row.repositorySelection,
    htmlUrl: row.htmlUrl,
    suspendedAt: row.suspendedAt ? row.suspendedAt.toISOString() : null,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function githubRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/github/install-url",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
      const rateLimit = installUrlLimiter.check(
        `${request.workspace!.id}:${request.user!.id}`
      );
      if (!rateLimit.allowed) {
        reply.header("Retry-After", String(rateLimit.retryAfterSeconds));
        return reply.status(429).send({
          error: {
            code: "RATE_LIMITED",
            message: "Too many GitHub installation attempts. Please try again shortly.",
            requestId: request.id,
          },
        });
      }

      const cookieValue = createGithubIntentCookieValue({
        userId: request.user!.id,
        workspaceId: request.workspace!.id,
      });

      reply.header("Set-Cookie", serializeGithubIntentCookie(cookieValue));
      return {
        url: `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`,
      };
    }
  );

  app.get("/api/github/callback", async (request, reply) => {
    const rateLimit = callbackLimiter.check(request.ip);
    if (!rateLimit.allowed) {
      reply.header("Retry-After", String(rateLimit.retryAfterSeconds));
      return reply.status(429).send({
        error: {
          code: "RATE_LIMITED",
          message: "Too many GitHub callback requests. Please try again shortly.",
          requestId: request.id,
        },
      });
    }

    const redirectWithError = (code: GithubErrorCode, clearCookie = false) => {
      if (clearCookie) {
        reply.header("Set-Cookie", clearGithubIntentCookie());
      }
      return reply.redirect(`${env.WEB_ORIGIN}/repositories?github_error=${code}`);
    };

    try {
      const sessionResult = await getSession(request);
      if (!sessionResult) {
        return reply.redirect(`${env.WEB_ORIGIN}/login?next=/repositories`);
      }

      const rawIntentCookie = extractCookieValue(
        request.headers.cookie,
        GITHUB_INTENT_COOKIE_NAME
      );

      const parsedQuery = callbackQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        request.log.warn(
          { requestId: request.id },
          "GitHub callback received invalid query parameters"
        );
        return redirectWithError("unknown", Boolean(rawIntentCookie));
      }

      if (parsedQuery.data.setup_action === "request") {
        if (rawIntentCookie) {
          reply.header("Set-Cookie", clearGithubIntentCookie());
        }
        return reply.redirect(
          `${env.WEB_ORIGIN}/repositories?github_notice=request_pending`
        );
      }

      reply.header("Set-Cookie", clearGithubIntentCookie());

      const activeWorkspaceId = sessionResult.session.activeOrganizationId;
      if (!activeWorkspaceId) {
        request.log.warn(
          { requestId: request.id },
          "GitHub callback missing active workspace"
        );
        return redirectWithError("invalid_intent");
      }

      const verifiedIntent = verifyGithubIntentCookieValue(rawIntentCookie, {
        userId: sessionResult.user.id,
        workspaceId: activeWorkspaceId,
      });

      if (!verifiedIntent) {
        request.log.warn(
          { requestId: request.id },
          "GitHub callback failed intent cookie verification"
        );
        return redirectWithError("invalid_intent");
      }

      const membership = await prisma.member.findFirst({
        where: {
          organizationId: activeWorkspaceId,
          userId: sessionResult.user.id,
        },
        select: { role: true },
      });

      if (!membership || !canManageWorkspace(membership.role)) {
        request.log.warn(
          { requestId: request.id },
          "GitHub callback rejected because user lacks workspace admin/owner role"
        );
        return redirectWithError("invalid_intent");
      }

      let isOwnedByUser = false;
      try {
        const { authentication } = await githubApp.oauth.createToken({
          code: parsedQuery.data.code,
        });
        const userOctokit = createUserOctokit(authentication.token);
        const userInstallations = await userOctokit.paginate("GET /user/installations", {
          per_page: 100,
        });
        isOwnedByUser = userInstallations.some(
          (item) => String(item.id) === parsedQuery.data.installation_id
        );
      } catch (err) {
        request.log.error(
          { err: sanitizeGithubError(err), requestId: request.id },
          "GitHub OAuth token exchange or installation lookup failed"
        );
        return redirectWithError("unknown");
      }

      if (!isOwnedByUser) {
        request.log.warn(
          {
            requestId: request.id,
            installationId: parsedQuery.data.installation_id,
          },
          "GitHub installation_id not found in authenticated user's installations"
        );
        return redirectWithError("installation_not_owned");
      }

      const installationIdNumber = Number(parsedQuery.data.installation_id);
      const { data: ghInstallation } = await githubApp.octokit.rest.apps.getInstallation({
        installation_id: installationIdNumber,
      });

      const account = ghInstallation.account;
      const accountLogin =
        account && "login" in account && typeof account.login === "string"
          ? account.login
          : account && "slug" in account && typeof account.slug === "string"
            ? account.slug
            : null;
      const accountId =
        account && typeof account.id === "number" ? BigInt(account.id) : null;
      const accountType: "User" | "Organization" =
        account && "type" in account && account.type === "Organization"
          ? "Organization"
          : "User";
      const repositorySelection: "ALL" | "SELECTED" =
        ghInstallation.repository_selection === "all" ? "ALL" : "SELECTED";

      if (!accountLogin || accountId === null || !ghInstallation.html_url) {
        request.log.error(
          { requestId: request.id },
          "GitHub installation payload missing required account metadata"
        );
        return redirectWithError("unknown");
      }

      const installationIdBigInt = BigInt(parsedQuery.data.installation_id);
      const existing = await prisma.githubInstallation.findUnique({
        where: { installationId: installationIdBigInt },
        select: { id: true, workspaceId: true },
      });

      if (existing && existing.workspaceId !== activeWorkspaceId) {
        request.log.warn(
          {
            requestId: request.id,
            installationId: parsedQuery.data.installation_id,
          },
          "GitHub installation is already linked to another workspace"
        );
        return redirectWithError("installation_already_linked");
      }

      const suspendedAt = ghInstallation.suspended_at
        ? new Date(ghInstallation.suspended_at)
        : null;

      const savedInstallation = existing
        ? await prisma.githubInstallation.update({
            where: { id: existing.id },
            data: {
              accountLogin,
              accountType,
              accountId,
              repositorySelection,
              htmlUrl: ghInstallation.html_url,
              suspendedAt,
            },
          })
        : await prisma.githubInstallation.create({
            data: {
              workspaceId: activeWorkspaceId,
              installationId: installationIdBigInt,
              accountLogin,
              accountType,
              accountId,
              repositorySelection,
              htmlUrl: ghInstallation.html_url,
              suspendedAt,
            },
          });

      await syncInstallation(savedInstallation);

      return reply.redirect(`${env.WEB_ORIGIN}/repositories?connected=1`);
    } catch (err) {
      request.log.error(
        { err: sanitizeGithubError(err), requestId: request.id },
        "GitHub callback failed unexpectedly"
      );
      return redirectWithError("unknown");
    }
  });

  app.get(
    "/api/github/installations",
    { preHandler: requireWorkspace },
    async (request) => {
      const installations = await prisma.githubInstallation.findMany({
        where: workspaceWhere(request),
        orderBy: { createdAt: "asc" },
      });

      return {
        installations: installations.map(serializeInstallation),
      };
    }
  );

  app.post(
    "/api/github/installations/:id/sync",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
      const parsedParams = installationIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "GitHub installation not found",
            requestId: request.id,
          },
        });
      }

      const rateLimit = syncLimiter.check(request.workspace!.id);
      if (!rateLimit.allowed) {
        reply.header("Retry-After", String(rateLimit.retryAfterSeconds));
        return reply.status(429).send({
          error: {
            code: "RATE_LIMITED",
            message: "Too many sync requests. Please wait a moment and try again.",
            requestId: request.id,
          },
        });
      }

      const installation = await prisma.githubInstallation.findFirst({
        where: {
          id: parsedParams.data.id,
          ...workspaceWhere(request),
        },
        select: {
          id: true,
          workspaceId: true,
          installationId: true,
        },
      });

      if (!installation) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "GitHub installation not found",
            requestId: request.id,
          },
        });
      }

      try {
        const result = await syncInstallation(installation);
        return {
          synced: result.synced,
          removed: result.removed,
          lastSyncedAt: result.lastSyncedAt.toISOString(),
        };
      } catch (err) {
        if (err instanceof GithubSyncError) {
          return reply.status(err.statusCode).send({
            error: {
              code: err.code,
              message: err.message,
              requestId: request.id,
            },
          });
        }
        throw err;
      }
    }
  );

  app.delete(
    "/api/github/installations/:id",
    { preHandler: requireWorkspaceAdmin },
    async (request, reply) => {
      const parsedParams = installationIdParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "GitHub installation not found",
            requestId: request.id,
          },
        });
      }

      const scope = workspaceWhere(request);
      const installation = await prisma.githubInstallation.findFirst({
        where: {
          id: parsedParams.data.id,
          ...scope,
        },
        select: {
          id: true,
          htmlUrl: true,
        },
      });

      if (!installation) {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "GitHub installation not found",
            requestId: request.id,
          },
        });
      }

      await prisma.githubInstallation.deleteMany({
        where: {
          id: installation.id,
          ...scope,
        },
      });

      return {
        deleted: true,
        htmlUrl: installation.htmlUrl,
      };
    }
  );
}

