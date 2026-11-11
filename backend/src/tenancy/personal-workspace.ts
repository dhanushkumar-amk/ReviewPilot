import crypto from "node:crypto";
import { prisma } from "../db.js";

const SLUG_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_SUFFIX_LENGTH = 6;
const MAX_SLUG_ATTEMPTS = 3;

function buildPersonalWorkspaceName(userName?: string | null): string {
  const trimmed = userName?.trim() ?? "";
  if (!trimmed) {
    return "My workspace";
  }

  const firstName = trimmed.split(/\s+/)[0]?.trim() ?? "";
  return firstName ? `${firstName}'s workspace` : "My workspace";
}

function randomSlugSuffix(length = SLUG_SUFFIX_LENGTH): string {
  const bytes = crypto.randomBytes(length);
  let suffix = "";
  for (let i = 0; i < length; i += 1) {
    suffix += SLUG_SUFFIX_ALPHABET[bytes[i]! % SLUG_SUFFIX_ALPHABET.length]!;
  }
  return suffix;
}

function buildWorkspaceSlug(workspaceName: string): string {
  const base = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${base || "workspace"}-${randomSlugSuffix()}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Ensure the given user has at least one workspace membership (idempotent across retries
 * and concurrent hooks). Returns the ID of the user's first workspace.
 */
export async function ensureUserHasWorkspace(user: {
  id: string;
  name?: string | null;
}): Promise<string> {
  const workspaceName = buildPersonalWorkspaceName(user.name);

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Serialize per user so concurrent sign-up/session hooks never create duplicate personal workspaces.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;

        const existingMembership = await tx.member.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
          select: { organizationId: true },
        });

        if (existingMembership) {
          return existingMembership.organizationId;
        }

        const organizationId = crypto.randomUUID();
        const memberId = crypto.randomUUID();
        const now = new Date();

        await tx.organization.create({
          data: {
            id: organizationId,
            name: workspaceName,
            slug: buildWorkspaceSlug(workspaceName),
            createdAt: now,
          },
        });

        await tx.member.create({
          data: {
            id: memberId,
            organizationId,
            userId: user.id,
            role: "owner",
            createdAt: now,
          },
        });

        return organizationId;
      });
    } catch (error) {
      if (isUniqueConstraintError(error) && attempt < MAX_SLUG_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to allocate a unique personal workspace slug");
}

