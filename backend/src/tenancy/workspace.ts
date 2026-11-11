import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db.js";
import { getSession } from "../lib/auth-session.js";

export interface WorkspaceContext {
  id: string;
  name: string;
  slug: string;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    workspace?: WorkspaceContext;
  }
}

/**
 * Every tenant-owned table has a `workspaceId` column and every tenant query MUST
 * include `workspaceWhere(request)` in its Prisma `where` clause so rows from
 * other workspaces can never be read, updated, or inferred across tenants.
 */
export function workspaceWhere(request: FastifyRequest): { workspaceId: string } {
  if (!request.workspace) {
    throw new Error("workspaceWhere called without an attached request.workspace");
  }

  return {
    workspaceId: request.workspace.id,
  };
}

/**
 * Fastify preHandler that requires an authenticated Better Auth session AND a
 * database-verified active workspace membership. Never trusts client-supplied
 * workspace headers, query parameters, or body fields.
 */
export async function requireWorkspace(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const result = await getSession(request);
  if (!result) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
        requestId: request.id,
      },
    });
  }

  request.user = result.user;
  request.session = result.session;

  const activeOrganizationId = result.session.activeOrganizationId;
  if (!activeOrganizationId) {
    return reply.status(403).send({
      error: {
        code: "NO_ACTIVE_WORKSPACE",
        message: "No active workspace selected",
        requestId: request.id,
      },
    });
  }

  const membership = await prisma.member.findFirst({
    where: {
      organizationId: activeOrganizationId,
      userId: result.user.id,
    },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!membership) {
    return reply.status(403).send({
      error: {
        code: "NO_ACTIVE_WORKSPACE",
        message: "Active workspace membership not found",
        requestId: request.id,
      },
    });
  }

  request.workspace = {
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
  };
}

