import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "../auth.js";

export type AuthSessionData = typeof auth.$Infer.Session;

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthSessionData["user"];
    session?: AuthSessionData["session"];
  }
}

/**
 * Resolve the current Better Auth session from the incoming Fastify request headers.
 */
export async function getSession(request: FastifyRequest): Promise<AuthSessionData | null> {
  return auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
}

/**
 * Fastify preHandler that requires an authenticated Better Auth session and attaches
 * `request.user` and `request.session`.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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
}

