/**
 * sandbox/provider.ts
 * SandboxProvider interface — the contract for running a test-run validation.
 */

export interface SandboxLimits {
  maxArchiveBytes: number;
  maxFiles: number;
  maxTotalBytes: number;
}

export interface SandboxRunOptions {
  validationId: string;
  owner: string;
  repo: string;
  sha: string;
  targetPath: string;
  original: string;
  patched: string;
  patchedSha256: string;
  limits: SandboxLimits;
}

export type TestStepStatus = "PASSED" | "FAILED" | "SKIPPED";

export interface TestStepResult {
  name: string;
  status: TestStepStatus;
  durationMs: number;
  note?: string;
  outputTail?: string;
  baselineAlsoFails?: boolean;
}

export interface SandboxRunResult {
  runId: string;
  nodeVersion?: string;
  npmVersion?: string;
  steps: TestStepResult[];
  errorCode?: string;
}

export interface SandboxProvider {
  run(options: SandboxRunOptions): Promise<SandboxRunResult>;
}
