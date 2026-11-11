import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).optional()
);

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
  })
  .superRefine((data, ctx) => {
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
  process.exit(1);
}

export type Env = z.infer<typeof envSchema>;
export const env: Env = parsed.data;
export const isGoogleAuthEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const isGithubAuthEnabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
