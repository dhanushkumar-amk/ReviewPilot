import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WEB_ORIGIN: z.url(),
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url(),
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

