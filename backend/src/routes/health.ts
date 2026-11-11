import type { FastifyInstance } from "fastify";
import { checkDb } from "../db.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (request, reply) => {
    const dbResult = await checkDb();
    const uptime = process.uptime();
    const time = new Date().toISOString();

    if (!dbResult.ok) {
      request.log.error("Database health check failed");
      return reply.status(503).send({
        status: "degraded" as const,
        uptime,
        time,
        db: "error" as const,
      });
    }

    return reply.status(200).send({
      status: "ok" as const,
      uptime,
      time,
      db: "ok" as const,
      dbLatencyMs: dbResult.latencyMs,
    });
  });
}
