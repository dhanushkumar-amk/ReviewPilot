import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";
import { PrismaClient } from "./generated/prisma/client.js";

const DB_CHECK_TIMEOUT_MS = 5000;

const adapter = new PrismaPg(
  {
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: DB_CHECK_TIMEOUT_MS,
  },
  {
    onPoolError: () => {
      // Prevent unhandled pool error events from crashing the process
    },
    onConnectionError: () => {
      // Errors surface via active query promises without leaking connection strings
    },
  }
);

export const prisma = new PrismaClient({ adapter });

export type DbCheckResult =
  | { ok: true; latencyMs: number }
  | { ok: false };

export async function checkDb(): Promise<DbCheckResult> {
  const start = performance.now();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const queryPromise = prisma.$queryRaw`SELECT 1`;
  // Avoid unhandled rejection if timeout settles first and the query rejects later
  queryPromise.catch(() => {});

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Database health check timed out"));
    }, DB_CHECK_TIMEOUT_MS);
  });

  try {
    await Promise.race([queryPromise, timeoutPromise]);
    return {
      ok: true,
      latencyMs: Math.max(0, Math.round(performance.now() - start)),
    };
  } catch {
    return { ok: false };
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

