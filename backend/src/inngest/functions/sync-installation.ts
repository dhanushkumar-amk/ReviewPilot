import { prisma } from "../../db.js";
import { syncInstallation as runSyncInstallation } from "../../github/sync.js";
import { inngest } from "../client.js";

export interface InstallationChangedEventData {
  deliveryId: string;
  installationId: string;
  action: string;
}

export const syncInstallation = inngest.createFunction(
  {
    id: "sync-installation",
    name: "Sync GitHub Installation",
    triggers: [{ event: "github/installation.changed" }],
    concurrency: [{ key: "event.data.installationId", limit: 1 }],
    retries: 3,
  },
  async ({ event, step, logger }) => {
    const data = event.data as InstallationChangedEventData;
    const installationIdBigInt = BigInt(data.installationId);

    const result = await step.run("sync-installation", async () => {
      const installation = await prisma.githubInstallation.findUnique({
        where: { installationId: installationIdBigInt },
      });

      if (!installation) {
        return { skipped: true as const, reason: "installation_not_found" };
      }

      const synced = await runSyncInstallation(installation);
      return { skipped: false as const, ...synced };
    });

    logger.info(
      {
        deliveryId: data.deliveryId,
        action: data.action,
        skipped: result.skipped,
      },
      "Processed installation sync job",
    );

    return result;
  },
);
