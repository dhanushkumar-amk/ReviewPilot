import { prisma } from "../../db.js";
import { runFixValidation } from "../../sandbox/run-validation.js";
import { inngest } from "../client.js";

export interface FixValidationEventData {
  validationId: string;
  workspaceId: string;
}

export const validateFix = inngest.createFunction(
  {
    id: "validate-fix",
    name: "Validate Fix",
    triggers: [{ event: "fix/validation.requested" }],
    concurrency: [
      { key: "event.data.workspaceId", limit: 1 },
      { limit: 2 },
    ],
    retries: 0,
    onFailure: async ({ event }) => {
      const originalEvent = event.data.event as
        | { data?: Partial<FixValidationEventData> }
        | undefined;
      const validationId = originalEvent?.data?.validationId;
      if (!validationId) return;

      await prisma.fixValidation.updateMany({
        where: {
          id: validationId,
          status: { notIn: ["PASSED", "PASSED_WITH_WARNINGS", "FAILED"] },
        },
        data: { status: "ERROR", errorCode: "INTERNAL", finishedAt: new Date() },
      });
    },
  },
  async ({ event, step }) => {
    const { validationId } = event.data;

    // Step 1: mark-running (idempotent)
    const shouldRun = await step.run("mark-running", async () => {
      const existing = await prisma.fixValidation.findUnique({
        where: { id: validationId },
        select: { status: true },
      });
      if (!existing || existing.status !== "QUEUED") return false;

      await prisma.fixValidation.update({
        where: { id: validationId },
        data: { status: "RUNNING", startedAt: new Date() },
      });
      return true;
    });

    if (!shouldRun) {
      return { skipped: true, reason: "Already processed or missing" };
    }

    // Step 2: validate (Layer 1 + Layer 2 in ONE step — temp files and SDK calls must stay together)
    const summary = await step.run("validate", async () => {
      return await runFixValidation(validationId);
    });

    // Step 3: mark-done
    await step.run("mark-done", async () => {
      return { completed: true, validationId, status: summary.status };
    });

    return summary;
  },
);
