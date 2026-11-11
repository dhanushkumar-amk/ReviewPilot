import type { FastifyInstance } from "fastify";
import { requireAuth } from "../lib/auth-session.js";

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/me", { preHandler: requireAuth }, async (request) => {
    const user = request.user!;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    };
  });
}

