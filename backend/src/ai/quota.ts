import { prisma } from "../db.js";
import { env } from "../env.js";
import { AiError } from "./providers.js";

function getUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function checkAndIncrementQuota(workspaceId: string): Promise<void> {
  const day = getUtcDay();
  const maxWorkspace = env.AI_MAX_CALLS_PER_WORKSPACE_PER_DAY;
  const maxGlobal = env.AI_MAX_CALLS_GLOBAL_PER_DAY;

  await prisma.$transaction(async (tx) => {
    // 1. Global quota check & atomic increment
    const globalUsage = await tx.aiUsage.upsert({
      where: {
        workspaceId_day: {
          workspaceId: null as any,
          day,
        },
      },
      create: {
        workspaceId: null,
        day,
        calls: 1,
        tokensIn: 0,
        tokensOut: 0,
      },
      update: {
        calls: { increment: 1 },
      },
    });

    if (globalUsage.calls > maxGlobal) {
      throw new AiError("AI_BUSY", "Global daily AI call limit reached");
    }

    // 2. Workspace quota check & atomic increment
    const wsUsage = await tx.aiUsage.upsert({
      where: {
        workspaceId_day: {
          workspaceId,
          day,
        },
      },
      create: {
        workspaceId,
        day,
        calls: 1,
        tokensIn: 0,
        tokensOut: 0,
      },
      update: {
        calls: { increment: 1 },
      },
    });

    if (wsUsage.calls > maxWorkspace) {
      throw new AiError("AI_LIMIT_REACHED", "Workspace daily AI call limit reached");
    }
  });
}

export async function recordTokens(options: {
  workspaceId: string;
  tokensIn: number;
  tokensOut: number;
}): Promise<void> {
  const day = getUtcDay();
  const { workspaceId, tokensIn, tokensOut } = options;

  await prisma.$transaction([
    prisma.aiUsage.updateMany({
      where: { workspaceId, day },
      data: {
        tokensIn: { increment: tokensIn },
        tokensOut: { increment: tokensOut },
      },
    }),
    prisma.aiUsage.updateMany({
      where: { workspaceId: null, day },
      data: {
        tokensIn: { increment: tokensIn },
        tokensOut: { increment: tokensOut },
      },
    }),
  ]).catch(() => {});
}

export async function getWorkspaceUsageToday(workspaceId: string): Promise<{
  callsToday: number;
  limit: number;
}> {
  const day = getUtcDay();
  const usage = await prisma.aiUsage.findUnique({
    where: {
      workspaceId_day: {
        workspaceId,
        day,
      },
    },
  });

  return {
    callsToday: usage?.calls || 0,
    limit: env.AI_MAX_CALLS_PER_WORKSPACE_PER_DAY,
  };
}

