import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../env.js";

export const GITHUB_INTENT_COOKIE_NAME = "rp_gh_intent";
const INTENT_MAX_AGE_SECONDS = 600;

const intentPayloadSchema = z.object({
  nonce: z.string().min(1),
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  exp: z.number().int().finite(),
});

export type GithubIntentPayload = z.infer<typeof intentPayloadSchema>;

function signPayload(payloadB64: string): string {
  return crypto
    .createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");
}

export function createGithubIntentCookieValue(params: {
  userId: string;
  workspaceId: string;
  now?: number;
}): string {
  const now = params.now ?? Date.now();
  const payload: GithubIntentPayload = {
    nonce: crypto.randomBytes(16).toString("hex"),
    userId: params.userId,
    workspaceId: params.workspaceId,
    exp: now + INTENT_MAX_AGE_SECONDS * 1000,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signatureB64 = signPayload(payloadB64);
  return `${payloadB64}.${signatureB64}`;
}

export function verifyGithubIntentCookieValue(
  rawValue: string | undefined,
  expected: { userId: string; workspaceId: string; now?: number }
): GithubIntentPayload | null {
  if (!rawValue) {
    return null;
  }

  const parts = rawValue.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) {
    return null;
  }

  const expectedSignature = signPayload(payloadB64);
  const actualBuf = Buffer.from(signatureB64, "utf8");
  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    return null;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const parsed = intentPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return null;
  }

  const now = expected.now ?? Date.now();
  if (parsed.data.exp <= now) {
    return null;
  }

  if (
    parsed.data.userId !== expected.userId ||
    parsed.data.workspaceId !== expected.workspaceId
  ) {
    return null;
  }

  return parsed.data;
}

export function serializeGithubIntentCookie(value: string): string {
  const parts = [
    `${GITHUB_INTENT_COOKIE_NAME}=${value}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/api/github",
    `Max-Age=${INTENT_MAX_AGE_SECONDS}`,
  ];
  if (env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clearGithubIntentCookie(): string {
  const parts = [
    `${GITHUB_INTENT_COOKIE_NAME}=`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/api/github",
    "Max-Age=0",
  ];
  if (env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function extractCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    if (key === name) {
      return trimmed.slice(eqIndex + 1).trim();
    }
  }

  return undefined;
}

