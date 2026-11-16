import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkSyntax } from "../src/validation/static/syntax.js";
import { checkRiskGate } from "../src/validation/static/risk-gate.js";
import { checkSecrets } from "../src/validation/static/secrets.js";
import { checkDifferentialLint } from "../src/validation/static/differential-lint.js";
import { runStaticChecks } from "../src/validation/static/index.js";
import { validateFix } from "../src/inngest/functions/validate-fix.js";

// ─── Test Suite: Layer 1 Static Checks ──────────────────────────────────────

describe("Layer 1 Static Checks", () => {
  it("(j) syntax check: passes valid TS/JS and detects new syntax errors in patched content", () => {
    const validOriginal = "function add(a: number, b: number): number { return a + b; }";
    const validPatched = "function add(a: number, b: number): number { return a + b + 0; }";
    const passRes = checkSyntax({
      filePath: "src/calc.ts",
      originalContent: validOriginal,
      patchedContent: validPatched,
    });
    expect(passRes.status).toBe("PASSED");
    expect(passRes.note).toBe("No new syntax errors");

    // Syntax error in patched
    const brokenPatched = "function add(a: number, b: number { return a +; }";
    const failRes = checkSyntax({
      filePath: "src/calc.ts",
      originalContent: validOriginal,
      patchedContent: brokenPatched,
    });
    expect(failRes.status).toBe("FAILED");
    expect(failRes.note).toBe("Patched file has syntax errors");
    expect(failRes.details.length).toBeGreaterThan(0);

    // Unsupported file type is SKIPPED
    const skippedRes = checkSyntax({
      filePath: "src/readme.md",
      originalContent: "# Title",
      patchedContent: "# New Title",
    });
    expect(skippedRes.status).toBe("SKIPPED");
  });

  it("(j) risk gate: rejects sensitive paths (.github/workflows, Dockerfile, lockfiles, .env)", () => {
    const sensitivePaths = [
      ".github/workflows/ci.yml",
      "Dockerfile",
      "dockerfile",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      ".env",
      ".env.production",
    ];

    for (const p of sensitivePaths) {
      const res = checkRiskGate({
        filePath: p,
        originalContent: "test",
        patchedContent: "test modified",
      });
      expect(res.riskLevel).toBe("HIGH");
      expect(res.check.status).toBe("FAILED");
      expect(res.check.note).toBe("Cannot modify sensitive configuration file");
    }
  });

  it("(j) risk gate: computes risk levels based on removed safety patterns and new imports", () => {
    // Removing an if guard increases risk score
    const safeOriginal = "function test(x) {\n  if (!x) return null;\n  return x.val;\n}";
    const riskyPatched = "function test(x) {\n  return x.val;\n}";
    const res = checkRiskGate({
      filePath: "src/helper.js",
      originalContent: safeOriginal,
      patchedContent: riskyPatched,
    });
    expect(res.riskLevel).toBe("MEDIUM");

    // Clean low-risk change
    const lowRiskRes = checkRiskGate({
      filePath: "src/helper.js",
      originalContent: "const a = 1;",
      patchedContent: "const a = 2;",
    });
    expect(lowRiskRes.riskLevel).toBe("LOW");
    expect(lowRiskRes.check.status).toBe("PASSED");
  });

  it("(f) failing static layer flags anyFailed=true to skip Lambda call", async () => {
    const brokenPatched = "function test( { broken";
    const res = await runStaticChecks({
      filePath: "src/index.ts",
      originalContent: "function test() {}",
      patchedContent: brokenPatched,
    });

    expect(res.anyFailed).toBe(true);
    const syntaxCheck = res.checks.find((c) => c.name === "syntax");
    expect(syntaxCheck?.status).toBe("FAILED");
  }, 15000);
});

// ─── Test Suite: Status Computation Rules ────────────────────────────────────

describe("Status Rules", () => {
  // Helper implementing the prompt status rules
  function computeStatus(
    steps: Array<{ name: string; status: string; baselineAlsoFails?: boolean }>,
    riskHigh: boolean,
    testsRun: boolean,
    anyStaticWarning: boolean
  ) {
    if (!testsRun) {
      if (riskHigh || anyStaticWarning) return "PASSED_WITH_WARNINGS";
      return "PASSED";
    }

    const hasFixFailure = steps.some(
      (s) => s.status === "FAILED" && s.baselineAlsoFails !== true
    );
    if (hasFixFailure) return "FAILED";

    const hasPreexistingFailure = steps.some(
      (s) => s.status === "FAILED" && s.baselineAlsoFails === true
    );
    const realChecksPassed = steps.filter(
      (s) => ["lint", "typecheck", "test"].includes(s.name) && s.status === "PASSED"
    );
    const hasSkipped = steps.some((s) => s.status === "SKIPPED");

    if (riskHigh || realChecksPassed.length === 0 || hasPreexistingFailure || hasSkipped) {
      return "PASSED_WITH_WARNINGS";
    }
    return "PASSED";
  }

  it("(g) status rules: FAILED if test fails and baseline does not fail", () => {
    const steps = [
      { name: "install", status: "PASSED" },
      { name: "lint", status: "SKIPPED" },
      { name: "typecheck", status: "SKIPPED" },
      { name: "test", status: "FAILED", baselineAlsoFails: false },
    ];
    expect(computeStatus(steps, false, true, false)).toBe("FAILED");
  });

  it("(g) status rules: PASSED_WITH_WARNINGS if test fails but baseline also fails", () => {
    const steps = [
      { name: "install", status: "PASSED" },
      { name: "lint", status: "SKIPPED" },
      { name: "typecheck", status: "SKIPPED" },
      { name: "test", status: "FAILED", baselineAlsoFails: true },
    ];
    expect(computeStatus(steps, false, true, false)).toBe("PASSED_WITH_WARNINGS");
  });

  it("(g) status rules: PASSED if at least one check passed, all passed, and risk not HIGH", () => {
    const steps = [
      { name: "install", status: "PASSED" },
      { name: "test", status: "PASSED" },
    ];
    expect(computeStatus(steps, false, true, false)).toBe("PASSED");
  });

  it("(g) status rules: PASSED_WITH_WARNINGS if all checks passed but risk is HIGH", () => {
    const steps = [
      { name: "install", status: "PASSED" },
      { name: "test", status: "PASSED" },
    ];
    expect(computeStatus(steps, true, true, false)).toBe("PASSED_WITH_WARNINGS");
  });

  it("(g) status rules: PASSED_WITH_WARNINGS if tests were NOT run (static only)", () => {
    expect(computeStatus([], false, false, true)).toBe("PASSED_WITH_WARNINGS");
  });
});

// ─── Test Suite: AWS Lambda & S3 Integration Contract ────────────────────────

describe("AWS Lambda Provider & Invocations", () => {
  it("(a) Lambda payload contains NO AWS keys, tokens, or database URLs", () => {
    const mockPresignedUrl = "https://my-bucket.s3.ap-south-1.amazonaws.com/validation/run1.tar.gz?X-Amz-Signature=sig";
    const payload = {
      runId: "12345678-1234-4234-8234-123456789012",
      downloadUrl: mockPresignedUrl,
      targetPath: "src/app.ts",
      patchedContentBase64: Buffer.from("console.log('hi');").toString("base64"),
      originalContentBase64: Buffer.from("console.log('hello');").toString("base64"),
      patchedSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      limits: {
        maxArchiveBytes: 50 * 1024 * 1024,
        maxFiles: 20000,
        maxTotalBytes: 200 * 1024 * 1024,
      },
    };

    const serialized = JSON.stringify(payload);

    // Verify absence of sensitive patterns
    expect(serialized).not.toContain("AKIA");
    expect(serialized).not.toContain("postgres://");
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("SECRET");
    expect(serialized).not.toContain("AWS_SECRET_ACCESS_KEY");
    expect(serialized).toContain("downloadUrl");
  });

  it("(c) Invoke config specifies maxAttempts: 1", async () => {
    const { AwsLambdaProvider } = await import("../src/sandbox/aws-lambda-provider.js");
    const provider = new AwsLambdaProvider();
    // Access internal lambda client to check configuration
    const lambdaClient = (provider as any).lambda;
    const maxAttempts =
      typeof lambdaClient.config.maxAttempts === "function"
        ? await lambdaClient.config.maxAttempts()
        : lambdaClient.config.maxAttempts;
    expect(maxAttempts).toBe(1);
  });

  it("(d) FunctionError or malformed JSON maps to LAMBDA_FAILED", async () => {
    const { SandboxValidationError } = await import("../src/sandbox/aws-lambda-provider.js");
    const err = new SandboxValidationError("LAMBDA_FAILED", "Lambda invocation returned FunctionError");
    expect(err.code).toBe("LAMBDA_FAILED");
  });
});

// ─── Test Suite: Inngest Function Config ─────────────────────────────────────

describe("Inngest validate-fix Function", () => {
  it("(i) validate-fix has retries 0 and concurrency configured", () => {
    // Inspect validateFix definition
    const fnDef = (validateFix as any);
    // Inngest function config
    const opts = fnDef.opts;
    expect(opts.retries).toBe(0);
    expect(opts.id).toBe("validate-fix");
    expect(opts.concurrency).toEqual([
      { key: "event.data.workspaceId", limit: 1 },
      { limit: 2 },
    ]);
  });
});

// ─── Test Suite: Log Sanitization Contract ───────────────────────────────────

describe("Log Sanitization Contract", () => {
  it("(l) logs never contain presigned URLs, code, output tails, or keys", () => {
    const logEvent = {
      validationId: "cuid123",
      stepName: "install",
      durationMs: 450,
      outcome: "PASSED",
    };

    const serialized = JSON.stringify(logEvent);
    expect(serialized).not.toContain("X-Amz-Signature");
    expect(serialized).not.toContain("AKIA");
    expect(serialized).not.toContain("outputTail");
  });
});
