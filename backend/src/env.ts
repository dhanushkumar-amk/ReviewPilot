import crypto from "node:crypto";
import dotenv from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "test") {
  dotenv.config();
}

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).optional()
);

function decodeGithubPrivateKey(base64Value: string): string | null {
  const normalizedInput = base64Value.trim().replace(/\s+/g, "");
  if (!normalizedInput) {
    return null;
  }

  let decoded: string;
  try {
    decoded = Buffer.from(normalizedInput, "base64").toString("utf8").trim();
  } catch {
    return null;
  }

  const pem =
    decoded.includes("\\n") && !decoded.includes("\n")
      ? decoded.replace(/\\n/g, "\n")
      : decoded;

  if (
    !pem.includes("-----BEGIN") ||
    !pem.includes("PRIVATE KEY-----") ||
    !pem.includes("-----END")
  ) {
    return null;
  }

  try {
    crypto.createPrivateKey(pem);
  } catch {
    return null;
  }

  return pem;
}

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    WEB_ORIGIN: z.url(),
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url(),
    INNGEST_DEV: z.literal("1").optional(),
    INNGEST_EVENT_KEY: z.string().trim().min(1).optional(),
    INNGEST_SIGNING_KEY: z.string().trim().min(1).optional(),
    BETTER_AUTH_SECRET: z.string().trim().min(32),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: optionalNonEmptyString,
    GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
    GITHUB_CLIENT_ID: optionalNonEmptyString,
    GITHUB_CLIENT_SECRET: optionalNonEmptyString,
    GITHUB_APP_ID: z.string().trim().regex(/^\d+$/),
    GITHUB_APP_SLUG: z.string().trim().regex(/^[A-Za-z0-9-]+$/),
    GITHUB_APP_CLIENT_ID: z.string().trim().min(1),
    GITHUB_APP_CLIENT_SECRET: z.string().trim().min(1),
    GITHUB_APP_PRIVATE_KEY_BASE64: z.string().trim().min(1),
    GITHUB_WEBHOOK_SECRET: z.string().trim().min(32),
    SCAN_MAX_ARCHIVE_MB: z.coerce.number().int().positive().default(50),
    SCAN_MAX_FILES: z.coerce.number().int().positive().default(20000),
    SCAN_MAX_FILE_KB: z.coerce.number().int().positive().default(512),
    SCAN_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
    GITLEAKS_BIN: z.string().trim().min(1).default("gitleaks"),
    SEMGREP_BIN: z.string().trim().min(1).default("semgrep"),
    SEMGREP_CONFIG: z.string().trim().min(1).default("p/default"),
    GROQ_API_KEY: optionalNonEmptyString,
    GEMINI_API_KEY: optionalNonEmptyString,
    OPENROUTER_API_KEY: optionalNonEmptyString,
    AI_MODEL_GROQ: optionalNonEmptyString,
    AI_MODEL_GEMINI: optionalNonEmptyString,
    AI_MODEL_OPENROUTER: optionalNonEmptyString,
    AI_PROVIDER_ORDER: z.string().trim().default("groq,gemini,openrouter"),
    AI_MAX_CALLS_PER_WORKSPACE_PER_DAY: z.coerce.number().int().positive().default(20),
    AI_MAX_CALLS_GLOBAL_PER_DAY: z.coerce.number().int().positive().default(300),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(25000),
    E2B_API_KEY: optionalNonEmptyString,
    SANDBOX_TIMEOUT_MS: z.coerce.number().int().positive().default(600000),
    SANDBOX_MAX_PER_WORKSPACE_PER_DAY: z.coerce.number().int().positive().default(5),
    SANDBOX_MAX_GLOBAL_PER_DAY: z.coerce.number().int().positive().default(30),
    SANDBOX_MAX_ARCHIVE_MB: z.coerce.number().int().positive().default(50),
    // AWS Lambda sandbox
    AWS_REGION: optionalNonEmptyString,
    AWS_ACCESS_KEY_ID: optionalNonEmptyString,
    AWS_SECRET_ACCESS_KEY: optionalNonEmptyString,
    SANDBOX_PROVIDER: z.enum(["aws-lambda", "none"]).default("none"),
    SANDBOX_LAMBDA_FUNCTION: optionalNonEmptyString,
    SANDBOX_BUCKET: optionalNonEmptyString,
    SANDBOX_URL_TTL_SECONDS: z.coerce.number().int().positive().max(600).default(300),
    // Billing with Razorpay
    BILLING_ENABLED: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(false),
    BILLING_FORCE_PLAN: z.enum(["free", "premium"]).optional(),
    RAZORPAY_KEY_ID: optionalNonEmptyString,
    RAZORPAY_KEY_SECRET: optionalNonEmptyString,
    RAZORPAY_WEBHOOK_SECRET: optionalNonEmptyString,
    RAZORPAY_PLAN_PREMIUM_MONTHLY: optionalNonEmptyString,
    RAZORPAY_PLAN_PREMIUM_YEARLY: optionalNonEmptyString,
  })
  .superRefine((data, ctx) => {
    if (data.GROQ_API_KEY && !data.AI_MODEL_GROQ) {
      ctx.addIssue({
        code: "custom",
        path: ["AI_MODEL_GROQ"],
        message: "AI_MODEL_GROQ is required when GROQ_API_KEY is set",
      });
    }
    if (data.GEMINI_API_KEY && !data.AI_MODEL_GEMINI) {
      ctx.addIssue({
        code: "custom",
        path: ["AI_MODEL_GEMINI"],
        message: "AI_MODEL_GEMINI is required when GEMINI_API_KEY is set",
      });
    }
    if (data.OPENROUTER_API_KEY && !data.AI_MODEL_OPENROUTER) {
      ctx.addIssue({
        code: "custom",
        path: ["AI_MODEL_OPENROUTER"],
        message: "AI_MODEL_OPENROUTER is required when OPENROUTER_API_KEY is set",
      });
    }
    if (!decodeGithubPrivateKey(data.GITHUB_APP_PRIVATE_KEY_BASE64)) {
      ctx.addIssue({
        code: "custom",
        path: ["GITHUB_APP_PRIVATE_KEY_BASE64"],
        message: "GITHUB_APP_PRIVATE_KEY_BASE64 must be a base64-encoded valid PEM private key",
      });
    }
    // AWS Lambda provider requires credentials
    if (data.SANDBOX_PROVIDER === "aws-lambda") {
      if (!data.AWS_REGION) {
        ctx.addIssue({ code: "custom", path: ["AWS_REGION"], message: "AWS_REGION is required when SANDBOX_PROVIDER=aws-lambda" });
      }
      if (!data.AWS_ACCESS_KEY_ID) {
        ctx.addIssue({ code: "custom", path: ["AWS_ACCESS_KEY_ID"], message: "AWS_ACCESS_KEY_ID is required when SANDBOX_PROVIDER=aws-lambda" });
      }
      if (!data.AWS_SECRET_ACCESS_KEY) {
        ctx.addIssue({ code: "custom", path: ["AWS_SECRET_ACCESS_KEY"], message: "AWS_SECRET_ACCESS_KEY is required when SANDBOX_PROVIDER=aws-lambda" });
      }
      if (!data.SANDBOX_LAMBDA_FUNCTION) {
        ctx.addIssue({ code: "custom", path: ["SANDBOX_LAMBDA_FUNCTION"], message: "SANDBOX_LAMBDA_FUNCTION is required when SANDBOX_PROVIDER=aws-lambda" });
      }
      if (!data.SANDBOX_BUCKET) {
        ctx.addIssue({ code: "custom", path: ["SANDBOX_BUCKET"], message: "SANDBOX_BUCKET is required when SANDBOX_PROVIDER=aws-lambda" });
      }
    }

    if (data.BILLING_ENABLED) {
      if (!data.RAZORPAY_KEY_ID) {
        ctx.addIssue({ code: "custom", path: ["RAZORPAY_KEY_ID"], message: "RAZORPAY_KEY_ID is required when BILLING_ENABLED=true" });
      }
      if (!data.RAZORPAY_KEY_SECRET) {
        ctx.addIssue({ code: "custom", path: ["RAZORPAY_KEY_SECRET"], message: "RAZORPAY_KEY_SECRET is required when BILLING_ENABLED=true" });
      }
      if (!data.RAZORPAY_WEBHOOK_SECRET || data.RAZORPAY_WEBHOOK_SECRET.length < 32) {
        ctx.addIssue({ code: "custom", path: ["RAZORPAY_WEBHOOK_SECRET"], message: "RAZORPAY_WEBHOOK_SECRET must be at least 32 characters when BILLING_ENABLED=true" });
      }
      if (!data.RAZORPAY_PLAN_PREMIUM_MONTHLY) {
        ctx.addIssue({ code: "custom", path: ["RAZORPAY_PLAN_PREMIUM_MONTHLY"], message: "RAZORPAY_PLAN_PREMIUM_MONTHLY is required when BILLING_ENABLED=true" });
      }
      if (!data.RAZORPAY_PLAN_PREMIUM_YEARLY) {
        ctx.addIssue({ code: "custom", path: ["RAZORPAY_PLAN_PREMIUM_YEARLY"], message: "RAZORPAY_PLAN_PREMIUM_YEARLY is required when BILLING_ENABLED=true" });
      }

      // Safety rail: in non-production environments RAZORPAY_KEY_ID must start with "rzp_test_" (refuse to start otherwise)
      if (data.NODE_ENV !== "production" && data.RAZORPAY_KEY_ID && !data.RAZORPAY_KEY_ID.startsWith("rzp_test_")) {
        ctx.addIssue({
          code: "custom",
          path: ["RAZORPAY_KEY_ID"],
          message: "RAZORPAY_KEY_ID must start with rzp_test_ in non-production environments",
        });
      }
    }

    if (data.NODE_ENV === "production" && data.BILLING_FORCE_PLAN) {
      ctx.addIssue({
        code: "custom",
        path: ["BILLING_FORCE_PLAN"],
        message: "BILLING_FORCE_PLAN is only allowed in development and test environments",
      });
    }

    if (data.NODE_ENV !== "test") {
      if (!data.DATABASE_URL.includes("-pooler")) {
        ctx.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "DATABASE_URL must be a pooled connection string",
        });
      }

      if (data.DIRECT_URL.includes("-pooler")) {
        ctx.addIssue({
          code: "custom",
          path: ["DIRECT_URL"],
          message: "DIRECT_URL must not be a pooled connection string",
        });
      }
    }

    if (data.NODE_ENV === "production") {
      if (data.INNGEST_DEV !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["INNGEST_DEV"],
          message: "INNGEST_DEV must not be set in production",
        });
      }

      if (!data.INNGEST_EVENT_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["INNGEST_EVENT_KEY"],
          message: "INNGEST_EVENT_KEY is required in production",
        });
      }

      if (!data.INNGEST_SIGNING_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["INNGEST_SIGNING_KEY"],
          message: "INNGEST_SIGNING_KEY is required in production",
        });
      }

      const googleEnabled = Boolean(data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET);
      const githubEnabled = Boolean(data.GITHUB_CLIENT_ID && data.GITHUB_CLIENT_SECRET);
      if (!googleEnabled && !githubEnabled) {
        ctx.addIssue({
          code: "custom",
          path: ["GOOGLE_CLIENT_ID"],
          message: "At least one OAuth provider (Google or GitHub) must be configured in production",
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const invalidKeys = Array.from(
    new Set(
      parsed.error.issues
        .map((issue) => String(issue.path[0] ?? "UNKNOWN"))
        .filter(Boolean)
    )
  );
  console.error(`Invalid or missing environment variables: ${invalidKeys.join(", ")}`);
  if (invalidKeys.includes("GITHUB_APP_PRIVATE_KEY_BASE64")) {
    console.error("GITHUB_APP_PRIVATE_KEY_BASE64 must decode to a valid PEM private key.");
  }
  process.exit(1);
}

export type Env = z.infer<typeof envSchema>;
export const env: Env = parsed.data;
export const githubAppPrivateKey: string = (() => {
  const decoded = decodeGithubPrivateKey(env.GITHUB_APP_PRIVATE_KEY_BASE64);
  if (!decoded) {
    console.error("Invalid or missing environment variables: GITHUB_APP_PRIVATE_KEY_BASE64");
    process.exit(1);
  }
  return decoded;
})();
export const isGoogleAuthEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const isGithubAuthEnabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
export const isSandboxConfigured = Boolean(env.E2B_API_KEY);

/** True when the AWS Lambda sandbox provider is fully configured */
export const isAwsLambdaSandboxConfigured =
  env.SANDBOX_PROVIDER === "aws-lambda" &&
  Boolean(env.AWS_REGION && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY &&
    env.SANDBOX_LAMBDA_FUNCTION && env.SANDBOX_BUCKET);
export const isBillingEnabled = Boolean(env.BILLING_ENABLED);

// Log a single startup line about test run availability (no values)
if (env.NODE_ENV !== "test") {
  if (isAwsLambdaSandboxConfigured) {
    console.info("[sandbox] Test runs enabled (AWS Lambda provider)");
  } else {
    console.info("[sandbox] Test runs disabled (no provider configured)");
  }
}
