import { inngest } from "../client.js";

export const helloWorld = inngest.createFunction(
  {
    id: "hello-world",
    triggers: [{ event: "test/hello" }],
  },
  async ({ event, step, runId, logger }) => {
    logger.info({ runId, eventId: event.id }, "Starting hello-world function");

    const greeting = await step.run("build-message", async () => {
      const rawName = event.data?.name;
      const name =
        typeof rawName === "string" && rawName.trim().length > 0
          ? rawName.trim()
          : "world";
      return `Hello, ${name}!`;
    });

    await step.sleep("wait-briefly", "1s");

    const result = await step.run("pretend-work", async () => {
      return {
        message: greeting,
        runId,
        eventId: event.id,
        completedAt: new Date().toISOString(),
      };
    });

    return result;
  }
);

export const flakyDemo = inngest.createFunction(
  {
    id: "flaky-demo",
    retries: 2,
    triggers: [{ event: "test/flaky" }],
  },
  async ({ event, step, attempt, runId, logger }) => {
    logger.info(
      { runId, eventId: event.id, attempt },
      "Starting flaky-demo attempt"
    );

    const outcome = await step.run("unreliable-step", async () => {
      if (attempt === 0) {
        throw new Error("Simulated failure on first attempt");
      }

      return {
        ok: true,
        recoveredOnAttempt: attempt,
        runId,
        eventId: event.id,
      };
    });

    return outcome;
  }
);

