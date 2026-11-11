import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { auth } from "../auth.js";
import { env, isGithubAuthEnabled, isGoogleAuthEnabled } from "../env.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/auth-providers", async () => ({
    google: isGoogleAuthEnabled,
    github: isGithubAuthEnabled,
  }));
  app.addContentTypeParser(
    ["application/json", "application/x-www-form-urlencoded"],
    { parseAs: "string" },
    (_request, payload, done) => {
      done(null, payload);
    }
  );

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const host = request.headers.host || new URL(env.BETTER_AUTH_URL).host;
      const url = new URL(request.url, `${request.protocol}://${host}`);

      const headers = fromNodeHeaders(request.headers);
      // Use Fastify's socket-derived IP rather than caller-supplied forwarding headers.
      headers.set("x-client-ip", request.ip);

      const hasBody =
        request.method !== "GET" &&
        request.method !== "HEAD" &&
        typeof request.body === "string" &&
        request.body.length > 0;

      const webRequest = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(hasBody ? { body: request.body as string } : {}),
      });

      const response = await auth.handler(webRequest);

      reply.status(response.status);
      response.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower === "set-cookie" || lower === "content-length") {
          return;
        }
        reply.header(key, value);
      });

      const setCookies = response.headers.getSetCookie();
      if (setCookies.length > 0) {
        reply.header("set-cookie", setCookies);
      }

      if (!response.body) {
        return reply.send();
      }

      const bodyBuffer = Buffer.from(await response.arrayBuffer());
      return reply.send(bodyBuffer.length > 0 ? bodyBuffer : undefined);
    },
  });
}

