import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { requireAuth } from "../lib/auth-session.js";

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/me", { preHandler: requireAuth }, async (request) => {
    const user = request.user!;
    const session = request.session!;

    const memberships = await prisma.member.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
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

    const workspaces = memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    }));

    const activeWorkspace = session.activeOrganizationId
      ? workspaces.find((workspace) => workspace.id === session.activeOrganizationId) ?? null
      : null;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        emailVerified: user.emailVerified,
      },
      activeWorkspace,
      workspaces,
    };
  });
}
