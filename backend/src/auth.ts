import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db.js";
import { env } from "./env.js";

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

export const auth = betterAuth({
  appName: "ReviewPilot",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.WEB_ORIGIN],
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
  },
});

