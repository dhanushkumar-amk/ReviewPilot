import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

const backendRoot = path.dirname(fileURLToPath(import.meta.url));
const testEnvPath = path.join(backendRoot, ".env.test");
const devEnvPath = path.join(backendRoot, ".env");

function normalizeNeonHost(rawUrl: string): string {
  const parsed = new URL(rawUrl);
  return parsed.hostname.trim().toLowerCase().replace("-pooler.", ".");
}

function loadAndValidateTestEnv(): Record<string, string> {
  if (!fs.existsSync(testEnvPath)) {
    throw new Error(
      "Missing backend/.env.test. Copy backend/.env.test.example to backend/.env.test and point DATABASE_URL / DIRECT_URL to a dedicated Neon test branch before running tests."
    );
  }

  const parsedTestEnv = dotenv.parse(fs.readFileSync(testEnvPath, "utf8"));
  if (parsedTestEnv.NODE_ENV !== "test") {
    throw new Error("Refusing to run tests: backend/.env.test must set NODE_ENV=test.");
  }

  if (!parsedTestEnv.DATABASE_URL) {
    throw new Error("Refusing to run tests: backend/.env.test is missing DATABASE_URL.");
  }

  let testHost: string;
  try {
    testHost = normalizeNeonHost(parsedTestEnv.DATABASE_URL);
  } catch {
    throw new Error("Refusing to run tests: backend/.env.test DATABASE_URL is not a valid URL.");
  }

  if (fs.existsSync(devEnvPath)) {
    const parsedDevEnv = dotenv.parse(fs.readFileSync(devEnvPath, "utf8"));
    if (parsedDevEnv.DATABASE_URL) {
      let devHost: string | null = null;
      try {
        devHost = normalizeNeonHost(parsedDevEnv.DATABASE_URL);
      } catch {
        devHost = null;
      }

      if (devHost && testHost === devHost) {
        throw new Error(
          "Refusing to run tests: backend/.env.test DATABASE_URL targets the same database host/branch as backend/.env. Use a separate Neon test branch in backend/.env.test."
        );
      }
    }
  }

  return {
    ...parsedTestEnv,
    NODE_ENV: "test",
  };
}

const testEnv = loadAndValidateTestEnv();

export default defineConfig({
  test: {
    environment: "node",
    env: testEnv,
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
  },
});
