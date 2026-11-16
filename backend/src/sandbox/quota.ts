import { prisma } from "../db.js";
import { env } from "../env.js";

export class SandboxQuotaError extends Error {
  constructor(
    public readonly code: "SANDBOX_LIMIT_REACHED" | "SANDBOX_BUSY",
    message: string,
  ) {
    super(message);
    this.name = "SandboxQuotaError";
  }
}

export function getUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function checkAndIncrementSandboxQuota(workspaceId: string): Promise<void> {
  const day = getUtcDay();
  const maxWorkspace = env.SANDBOX_MAX_PER_WORKSPACE_PER_DAY;
  const maxGlobal = env.SANDBOX_MAX_GLOBAL_PER_DAY;

  await prisma.$transaction(async (tx) => {
    // 1. Global quota check & atomic increment
    let globalUsage = await tx.sandboxUsage.findFirst({
      where: {
        workspaceId: null,
        day,
      },
    });

    if (!globalUsage) {
      globalUsage = await tx.sandboxUsage.create({
        data: {
          workspaceId: null,
          day,
          runs: 1,
          seconds: 0,
        },
      });
    } else {
      globalUsage = await tx.sandboxUsage.update({
        where: { id: globalUsage.id },
        data: {
          runs: { increment: 1 },
        },
      });
    }

    if (globalUsage.runs > maxGlobal) {
      throw new SandboxQuotaError("SANDBOX_BUSY", "Global daily sandbox execution limit reached");
    }

    // 2. Workspace quota check & atomic increment
    const wsUsage = await tx.sandboxUsage.upsert({
      where: {
        workspaceId_day: {
          workspaceId,
          day,
        },
      },
      create: {
        workspaceId,
        day,
        runs: 1,
        seconds: 0,
      },
      update: {
        runs: { increment: 1 },
      },
    });

    if (wsUsage.runs > maxWorkspace) {
      throw new SandboxQuotaError("SANDBOX_LIMIT_REACHED", "Workspace daily sandbox execution limit reached");
    }
  });
}

export async function recordSandboxSeconds(
  workspaceId: string,
  seconds: number,
): Promise<void> {
  if (seconds <= 0) return;
  const day = getUtcDay();

  await prisma.$transaction([
    prisma.sandboxUsage.updateMany({
      where: { workspaceId, day },
      data: {
        seconds: { increment: seconds },
      },
    }),
    prisma.sandboxUsage.updateMany({
      where: { workspaceId: null, day },
      data: {
        seconds: { increment: seconds },
      },
    }),
  ]).catch(() => {});
}

export async function getSandboxWorkspaceUsageToday(workspaceId: string): Promise<{
  runsToday: number;
  limit: number;
}> {
  const day = getUtcDay();
  const usage = await prisma.sandboxUsage.findUnique({
    where: {
      workspaceId_day: {
        workspaceId,
        day,
      },
    },
    select: { runs: true },
  });

  return {
    runsToday: usage?.runs ?? 0,
    limit: env.SANDBOX_MAX_PER_WORKSPACE_PER_DAY,
  };
}

