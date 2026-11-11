import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { inngest } from "../inngest/client.js";

const sendTestEventSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  flaky: z.boolean().optional(),
});

export async function devRoutes(app: FastifyInstance): Promise<void> {
  if (env.NODE_ENV !== "development") {
    return;
  }

  app.post("/dev/send-test-event", async (request, reply) => {
    const parsed = sendTestEventSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          requestId: request.id,
        },
      });
    }

    const eventName = parsed.data.flaky ? "test/flaky" : "test/hello";
    const { ids } = await inngest.send({
      name: eventName,
      data: parsed.data.name ? { name: parsed.data.name } : {},
    });

    return reply.status(200).send({
      ok: true,
      eventIds: ids,
    });
  });
}

