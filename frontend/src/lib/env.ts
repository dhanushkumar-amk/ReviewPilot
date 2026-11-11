import { z } from "zod";

const frontendEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:4000"),
  NEXT_PUBLIC_WEB_URL: z.url().default("http://localhost:3000"),
});

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL;
const rawWebUrl = process.env.NEXT_PUBLIC_WEB_URL;

export const env = frontendEnvSchema.parse({
  NEXT_PUBLIC_API_URL: rawApiUrl && rawApiUrl.trim().length > 0 ? rawApiUrl : undefined,
  NEXT_PUBLIC_WEB_URL: rawWebUrl && rawWebUrl.trim().length > 0 ? rawWebUrl : undefined,
});

