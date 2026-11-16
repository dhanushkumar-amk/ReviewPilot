import { Sandbox } from "e2b";
import { env } from "../env.js";

export interface CreateSandboxOptions {
  timeoutMs?: number;
  metadata?: Record<string, string>;
  apiKey?: string;
}

export const sandboxFactory = {
  create: async (opts: CreateSandboxOptions = {}) => {
    return await Sandbox.create({
      apiKey: opts.apiKey ?? env.E2B_API_KEY,
      timeoutMs: opts.timeoutMs ?? env.SANDBOX_TIMEOUT_MS,
      envs: {}, // Never pass secrets! Empty envs.
      metadata: opts.metadata ?? {},
      network: {
        allowOut: [
          "registry.npmjs.org",
          "*.npmjs.org",
          "registry.yarnpkg.com",
          "*.yarnpkg.com",
        ],
      },
    });
  },
};

export async function createSandbox(opts: CreateSandboxOptions = {}) {
  return await sandboxFactory.create(opts);
}

