import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { prisma } from "./db.js";
import { env, isGithubAuthEnabled, isGoogleAuthEnabled } from "./env.js";
import { ensureUserHasWorkspace } from "./tenancy/personal-workspace.js";

// TODO: Integrate a real transactional email provider (e.g., Resend or Postmark) before production.
const hasConfiguredEmailProvider = false;

function assertEmailProviderConfigured(): void {
  if (env.NODE_ENV === "production" && !hasConfiguredEmailProvider) {
    throw new Error(
      "Email provider must be configured in production for email verification and password reset."
    );
  }
}

assertEmailProviderConfigured();

const SENSITIVE_LOG_KEYS = new Set([
  "code",
  "state",
  "access_token",
  "refresh_token",
  "id_token",
  "accessToken",
  "refreshToken",
  "idToken",
  "clientSecret",
  "client_secret",
]);

function sanitizeAuthLogArg(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return value.replace(
      /([?&](?:code|state|access_token|refresh_token|id_token)=)[^&\s]+/gi,
      "$1[REDACTED]"
    );
  }

  if (value instanceof Error) {
    const record = value as Error & Record<string, unknown>;
    return {
      name: value.name,
      message: sanitizeAuthLogArg(value.message, depth + 1),
      ...(typeof record.code === "string" ? { code: record.code } : {}),
      ...(record.details !== undefined
        ? { details: sanitizeAuthLogArg(record.details, depth + 1) }
        : {}),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuthLogArg(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_LOG_KEYS.has(key)
        ? "[REDACTED]"
        : sanitizeAuthLogArg(entry, depth + 1);
    }
    return out;
  }

  return value;
}

export const auth = betterAuth({
  appName: "ReviewPilot",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_ORIGIN],
  logger: {
    log: (level, message, ...args) => {
      const safeMessage = sanitizeAuthLogArg(message);
      const safeArgs = args.map((arg) => sanitizeAuthLogArg(arg));
      console[level](`[Better Auth] ${String(safeMessage)}`, ...safeArgs);
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // TODO: Send password reset link through a real transactional email provider before production.
      assertEmailProviderConfigured();
      if (env.NODE_ENV === "development") {
        console.info(`\n[Auth Dev] Password reset link for ${user.email}: ${url}\n`);
      }
    },
    onExistingUserSignUp: async ({ user }) => {
      if (env.NODE_ENV === "development") {
        const nextStep = user.emailVerified
          ? "Account is already verified — sign in at /login."
          : 'Account already exists (unverified) — sign in at /login and click "Resend verification email".';
        console.info(`\n[Auth Dev] Sign-up skipped for existing email ${user.email}: ${nextStep}\n`);
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // TODO: Send verification link through a real transactional email provider before production.
      assertEmailProviderConfigured();
      if (env.NODE_ENV === "development") {
        console.info(`\n[Auth Dev] Email verification link for ${user.email}: ${url}\n`);
      }
    },
  },
  socialProviders: {
    ...(isGoogleAuthEnabled
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
            disableDefaultScope: true,
            scope: ["openid", "email", "profile"],
          },
        }
      : {}),
    ...(isGithubAuthEnabled
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID!,
            clientSecret: env.GITHUB_CLIENT_SECRET!,
            disableDefaultScope: true,
            scope: ["read:user", "user:email"],
          },
        }
      : {}),
  },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      allowDifferentEmails: false,
    },
  },
  user: {
    validateUserInfo: ({ user, source }) => {
      if (source.method === "oauth" && user.emailVerified !== true) {
        return {
          error: "email_not_verified",
          errorDescription: "Your provider account must have a verified email address.",
        };
      }
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
    },
    // When frontend and backend live on different subdomains in production,
    // cross-subdomain cookies (advanced.crossSubDomainCookies) must be configured.
    ipAddress: {
      ipAddressHeaders: ["x-client-ip"],
    },
  },
  rateLimit: {
    enabled: true,
    storage: "memory",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: {
            ...user,
            email: user.email.trim().toLowerCase(),
          },
        }),
        after: async (user) => {
          await ensureUserHasWorkspace({
            id: user.id,
            name: user.name,
          });
        },
      },
      update: {
        before: async (user) => {
          if (typeof user.email !== "string") {
            return;
          }
          return {
            data: {
              ...user,
              email: user.email.trim().toLowerCase(),
            },
          };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const currentActiveOrgId =
            "activeOrganizationId" in session && typeof session.activeOrganizationId === "string"
              ? session.activeOrganizationId
              : null;

          if (currentActiveOrgId) {
            return;
          }

          const userRecord = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, name: true },
          });

          if (!userRecord) {
            return;
          }

          const activeOrganizationId = await ensureUserHasWorkspace(userRecord);

          return {
            data: {
              ...session,
              activeOrganizationId,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      teams: {
        enabled: false,
      },
      invitationLimit: 0,
      organizationHooks: {
        beforeCreateInvitation: async () => {
          throw new APIError("FORBIDDEN", {
            message: "Workspace invitations are not enabled yet.",
          });
        },
      },
    }),
  ],
});

