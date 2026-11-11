import crypto from "node:crypto";
import { createRequire } from "node:module";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify, { LogController, type FastifyError, type FastifyInstance } from "fastify";
import { fastifyPlugin as inngestFastifyPlugin } from "inngest/fastify";
import { env } from "./env.js";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/index.js";
import { devRoutes } from "./routes/dev.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function sanitizeRequestUrl(rawUrl: string): string {
  const queryIndex = rawUrl.indexOf("?");
  if (queryIndex === -1) {
    return rawUrl;
  }

  const pathname = rawUrl.slice(0, queryIndex);
  if (pathname.startsWith("/api/auth/callback")) {
    return `${pathname}?[REDACTED]`;
  }

  const params = new URLSearchParams(rawUrl.slice(queryIndex + 1));
  let redacted = false;
  for (const key of ["code", "state", "access_token", "refresh_token", "id_token"]) {
    if (params.has(key)) {
      params.set(key, "[REDACTED]");
      redacted = true;
    }
  }

  return redacted ? `${pathname}?${params.toString()}` : rawUrl;
}

function resolvePrettyTransport(): { target: string } | undefined {
  if (env.NODE_ENV !== "development") {
    return undefined;
  }

  try {
    const require = createRequire(import.meta.url);
    require.resolve("pino-pretty");
    return { target: "pino-pretty" };
  } catch {
    return undefined;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const transport = resolvePrettyTransport();

  const app = Fastify({
    bodyLimit: 1024 * 1024,
    requestIdHeader: "x-request-id",
    logController: new LogController({
      requestIdLogLabel: "requestId",
      disableRequestLogging: (req) => {
        if (env.NODE_ENV !== "development") {
          return false;
        }
        const path = req.url.split("?")[0];
        return path === "/api/inngest" && (req.method === "PUT" || req.method === "GET");
      },
    }),
    genReqId(req) {
      const header = req.headers["x-request-id"];
      if (typeof header === "string" && REQUEST_ID_PATTERN.test(header)) {
        return header;
      }
      return crypto.randomUUID();
    },
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        'res.headers["set-cookie"]',
        "set-cookie",
        "req.query.code",
        "req.query.state",
        "req.query.access_token",
        "req.query.id_token",
        "*.code",
        "*.state",
        "*.access_token",
        "*.refresh_token",
        "*.id_token",
        "*.clientSecret",
        "*.client_secret",
      ],
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: sanitizeRequestUrl(request.url),
            host: request.headers.host,
            remoteAddress: request.ip,
            remotePort: request.socket?.remotePort,
          };
        },
      },
      ...(transport ? { transport } : {}),
    },
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  await app.register(helmet);

  await app.register(cors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
    exposedHeaders: ["x-request-id"],
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
        requestId: request.id,
      },
    });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Request failed");

    const statusCode =
      typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;

    const isServerError = statusCode >= 500;
    const hideDetails = env.NODE_ENV === "production" && isServerError;

    reply.status(statusCode).send({
      error: {
        code: hideDetails
          ? "INTERNAL_SERVER_ERROR"
          : error.code || (isServerError ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST"),
        message: hideDetails ? "Internal server error" : error.message,
        requestId: request.id,
      },
    });
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(meRoutes);

  await app.register(async (inngestScope) => {
    inngestScope.addHook("onRoute", (routeOptions) => {
      routeOptions.bodyLimit = 8 * 1024 * 1024;
    });

    await inngestScope.register(inngestFastifyPlugin, {
      client: inngest,
      functions,
      options: {
        servePath: "/api/inngest",
      },
    });
  });

  if (env.NODE_ENV === "development") {
    await app.register(devRoutes);
  }

  return app;
}
