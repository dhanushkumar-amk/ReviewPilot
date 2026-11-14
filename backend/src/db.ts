import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";
import { PrismaClient } from "./generated/prisma/client.js";

const DB_CHECK_TIMEOUT_MS = 10_000;
const DB_POOL_CONNECTION_TIMEOUT_MS = 30_000;

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: DB_POOL_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: 10_000,
  max: 10,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on("error", (err) => {
  // Gracefully handle dropped/terminated idle connections from Neon serverless compute
  // without allowing unhandled exceptions to crash the process or leave dead connections in pool
  if (env.NODE_ENV !== "test") {
    console.warn("[Database Pool] Idle client terminated by server:", err.message);
  }
});

const adapter = new PrismaPg(pool, {
  onPoolError: (err) => {
    if (env.NODE_ENV !== "test") {
      console.warn("[Prisma Adapter] Pool error:", err.message);
    }
  },
  onConnectionError: (err) => {
    if (env.NODE_ENV !== "test") {
      console.warn("[Prisma Adapter] Connection error:", err.message);
    }
  },
});

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

