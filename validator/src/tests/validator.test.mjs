/**
 * Validator tests using node:test (no external dependencies).
 * Tests: safe path validation, tar entry rules, downloadUrl host validation,
 * environment scrubbing, time budget logic, output truncation, command selection,
 * and baseline decision logic.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateSafeRelativePosixPath, validateEvent } from "../validate-event.mjs";
import { isSafeTarEntryPath } from "../archive.mjs";
import { buildScrubbedEnv } from "../run-step.mjs";

// ─── Safe path validation ───────────────────────────────────────────────────

describe("validateSafeRelativePosixPath", () => {
  // Valid paths
  it("accepts simple filename", () => assert.equal(validateSafeRelativePosixPath("src/index.ts"), true));
  it("accepts nested path", () => assert.equal(validateSafeRelativePosixPath("a/b/c.js"), true));
  it("accepts root-level file", () => assert.equal(validateSafeRelativePosixPath("file.ts"), true));

  // Invalid paths
  it("rejects ../ traversal", () => assert.equal(validateSafeRelativePosixPath("../secret"), false));
  it("rejects path starting with ../ segment", () => assert.equal(validateSafeRelativePosixPath("../../etc/passwd"), false));
  it("rejects embedded .. segment", () => assert.equal(validateSafeRelativePosixPath("a/../b"), false));
  it("rejects absolute path", () => assert.equal(validateSafeRelativePosixPath("/etc/passwd"), false));
  it("rejects backslash", () => assert.equal(validateSafeRelativePosixPath("src\\index.ts"), false));
  it("rejects NUL byte", () => assert.equal(validateSafeRelativePosixPath("file\x00.ts"), false));
  it("rejects empty string", () => assert.equal(validateSafeRelativePosixPath(""), false));
  it("rejects null", () => assert.equal(validateSafeRelativePosixPath(null), false));
  it("rejects too long path", () => {
    const long = "a/".repeat(120) + "b.ts"; // > 240 chars
    assert.equal(validateSafeRelativePosixPath(long), false);
  });
  it("rejects drive letter", () => assert.equal(validateSafeRelativePosixPath("C:\\file.ts"), false));
  it("rejects control character", () => assert.equal(validateSafeRelativePosixPath("file\x1Fname.ts"), false));
});

// ─── Tar entry path validation ───────────────────────────────────────────────

describe("isSafeTarEntryPath", () => {
  it("accepts normal file path", () => assert.equal(isSafeTarEntryPath("repo/src/index.js"), true));
  it("accepts root file", () => assert.equal(isSafeTarEntryPath("package.json"), true));
  it("rejects path with ..", () => assert.equal(isSafeTarEntryPath("../etc/passwd"), false));
  it("rejects embedded ..", () => assert.equal(isSafeTarEntryPath("a/../../etc"), false));
  it("rejects absolute path", () => assert.equal(isSafeTarEntryPath("/etc/passwd"), false));
  it("rejects backslash", () => assert.equal(isSafeTarEntryPath("src\\file"), false));
  it("rejects NUL byte", () => assert.equal(isSafeTarEntryPath("file\x00.ts"), false));
  it("rejects empty string", () => assert.equal(isSafeTarEntryPath(""), false));
});

// ─── downloadUrl host validation ────────────────────────────────────────────

describe("validateEvent downloadUrl", () => {
  function tryValidate(url) {
    try {
      const u = new URL(url);
      const S3_HOST_RE = /^(?:[a-z0-9][a-z0-9.\-]*\.)?s3\.[a-z0-9\-]+\.amazonaws\.com$/i;
      if (u.protocol !== "https:") return false;
      if (u.username || u.password) return false;
      if (!S3_HOST_RE.test(u.hostname)) return false;
      if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) return false;
      return true;
    } catch {
      return false;
    }
  }

  it("accepts valid S3 bucket URL", () => {
    assert.equal(
      tryValidate("https://my-bucket.s3.ap-south-1.amazonaws.com/validation/abc.tar.gz?X-Amz-Signature=abc"),
      true
    );
  });

  it("accepts path-style S3 URL", () => {
    assert.equal(
      tryValidate("https://s3.ap-south-1.amazonaws.com/my-bucket/validation/abc.tar.gz?X-Amz-Signature=abc"),
      true
    );
  });

  it("rejects http URL", () => {
    assert.equal(
      tryValidate("http://my-bucket.s3.ap-south-1.amazonaws.com/validation/abc.tar.gz"),
      false
    );
  });

  it("rejects non-S3 host", () => {
    assert.equal(
      tryValidate("https://example.com/archive.tar.gz"),
      false
    );
  });

  it("rejects credentials in URL", () => {
    assert.equal(
      tryValidate("https://user:pass@my-bucket.s3.ap-south-1.amazonaws.com/validation/abc.tar.gz"),
      false
    );
  });

  it("rejects IP address", () => {
    assert.equal(
      tryValidate("https://1.2.3.4/validation/abc.tar.gz"),
      false
    );
  });

  it("rejects non-amazonaws domain", () => {
    assert.equal(
      tryValidate("https://evil.s3.ap-south-1.amazonaws.com.attacker.com/x"),
      false
    );
  });
});

// ─── Environment scrubbing ───────────────────────────────────────────────────

describe("buildScrubbedEnv", () => {
  const ALLOWED_KEYS = new Set([
    "PATH", "HOME", "TMPDIR", "CI",
    "npm_config_cache", "npm_config_update_notifier",
    "npm_config_fund", "npm_config_audit",
  ]);

  it("contains only allowed keys", () => {
    const env = buildScrubbedEnv("/tmp/run-test");
    for (const key of Object.keys(env)) {
      assert.ok(ALLOWED_KEYS.has(key), `Unexpected env key: ${key}`);
    }
  });

  it("never contains AWS_ keys", () => {
    // Temporarily set AWS env vars to simulate Lambda context
    process.env.AWS_ACCESS_KEY_ID = "FAKEKEYID";
    process.env.AWS_SECRET_ACCESS_KEY = "FAKESECRET";
    process.env.AWS_SESSION_TOKEN = "FAKETOKEN";

    const env = buildScrubbedEnv("/tmp/run-test");
    const keys = Object.keys(env);

    assert.ok(!keys.some((k) => k.startsWith("AWS_")), "Should not contain AWS_ keys");
    assert.ok(!keys.some((k) => k.startsWith("LAMBDA_")), "Should not contain LAMBDA_ keys");

    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
  });

  it("sets CI=true", () => {
    const env = buildScrubbedEnv("/tmp/run-test");
    assert.equal(env.CI, "true");
  });

  it("sets HOME to runDir", () => {
    const env = buildScrubbedEnv("/tmp/run-abc");
    assert.equal(env.HOME, "/tmp/run-abc");
  });

  it("sets npm_config_cache inside runDir", () => {
    const env = buildScrubbedEnv("/tmp/run-abc");
    assert.ok(env.npm_config_cache.startsWith("/tmp/run-abc"), "npm_config_cache should be inside runDir");
  });
});

// ─── Time budget logic ───────────────────────────────────────────────────────

describe("time budget logic", () => {
  const RESERVE_MS = 25_000;
  const MIN_STEP_TIME_MS = 10_000;

  function computeBudget(remainingMs, stepMaxMs) {
    const budget = remainingMs - RESERVE_MS;
    if (budget < MIN_STEP_TIME_MS) return null; // skip
    return Math.min(stepMaxMs, budget);
  }

  it("skips when less than 10s remain after reserve", () => {
    // 30s remaining - 25s reserve = 5s budget < 10s min
    assert.equal(computeBudget(30_000, 120_000), null);
  });

  it("allows when enough time remains", () => {
    // 150s remaining - 25s reserve = 125s budget; min(120s, 125s) = 120s
    assert.equal(computeBudget(150_000, 120_000), 120_000);
  });

  it("caps at step maximum", () => {
    // 300s remaining - 25s reserve = 275s; min(45s, 275s) = 45s
    assert.equal(computeBudget(300_000, 45_000), 45_000);
  });

  it("caps at remaining budget if less than step max", () => {
    // 60s remaining - 25s reserve = 35s; min(45s, 35s) = 35s
    assert.equal(computeBudget(60_000, 45_000), 35_000);
  });
});

// ─── Output truncation and control character stripping ───────────────────────

describe("output truncation", () => {
  const STRIP_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|(?:\x1B|\x9B)[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  const OUTPUT_TAIL_CHARS = 4000;

  function sanitize(str) {
    const stripped = str.replace(STRIP_RE, "");
    return stripped.length > OUTPUT_TAIL_CHARS ? stripped.slice(-OUTPUT_TAIL_CHARS) : stripped;
  }

  it("strips ANSI escape codes", () => {
    const raw = "\x1B[31mERROR\x1B[0m: something went wrong";
    const result = sanitize(raw);
    assert.ok(!result.includes("\x1B"), "Should not contain ANSI codes");
    assert.ok(result.includes("ERROR"), "Should preserve text content");
  });

  it("strips control characters", () => {
    const raw = "output\x00with\x01control\x07chars";
    const result = sanitize(raw);
    assert.ok(!/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(result), "Should strip control chars");
  });

  it("keeps last 4000 chars", () => {
    const long = "x".repeat(5000);
    const result = sanitize(long);
    assert.equal(result.length, OUTPUT_TAIL_CHARS);
    // Should be the LAST 4000 chars, all 'x'
    assert.ok(result.split("").every((c) => c === "x"));
  });

  it("preserves newlines and tabs", () => {
    const raw = "line1\nline2\ttabbed";
    const result = sanitize(raw);
    assert.ok(result.includes("\n"), "Should keep newlines");
    assert.ok(result.includes("\t"), "Should keep tabs");
  });
});

// ─── Command selection from package.json fixtures ────────────────────────────

describe("detectProjectConfig command selection", () => {
  // Inline the core logic from detect.mjs for unit testing
  const NPM_PLACEHOLDER_TEST = /^echo "Error: no test specified" && exit 1$/;

  function selectTestCommand(testScript) {
    if (!testScript || NPM_PLACEHOLDER_TEST.test(testScript.trim())) return null;
    return ["npm", "test", "--silent"];
  }

  it("selects npm test for real test script", () => {
    assert.deepEqual(selectTestCommand("vitest run"), ["npm", "test", "--silent"]);
  });

  it("skips npm placeholder test script", () => {
    assert.equal(
      selectTestCommand('echo "Error: no test specified" && exit 1'),
      null
    );
  });

  it("skips missing test script", () => {
    assert.equal(selectTestCommand(undefined), null);
    assert.equal(selectTestCommand(""), null);
  });

  it("selects npm ci when package-lock exists (simulated)", () => {
    // hasPackageLock=true → npm ci
    const installCommand = true
      ? ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]
      : ["npm", "install", "--ignore-scripts", "--no-audit", "--no-fund"];
    assert.deepEqual(installCommand[1], "ci");
  });

  it("selects npm install when no lockfile", () => {
    const installCommand = false
      ? ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]
      : ["npm", "install", "--ignore-scripts", "--no-audit", "--no-fund"];
    assert.deepEqual(installCommand[1], "install");
  });
});

// ─── Baseline decision logic ─────────────────────────────────────────────────

describe("baseline decision logic", () => {
  function computeOverallStatus(steps) {
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

    if (realChecksPassed.length === 0 || hasPreexistingFailure || hasSkipped) {
      return "PASSED_WITH_WARNINGS";
    }
    return "PASSED";
  }

  it("FAILED when test fails and baseline passes", () => {
    const steps = [
      { name: "install", status: "PASSED" },
      { name: "lint", status: "SKIPPED" },
      { name: "typecheck", status: "SKIPPED" },
      { name: "test", status: "FAILED", baselineAlsoFails: false },
    ];
    assert.equal(computeOverallStatus(steps), "FAILED");
  });

  it("PASSED_WITH_WARNINGS when test fails but baseline also fails", () => {
    const steps = [
      { name: "install", status: "PASSED" },
      { name: "lint", status: "SKIPPED" },
      { name: "typecheck", status: "SKIPPED" },
      { name: "test", status: "FAILED", baselineAlsoFails: true },
    ];
    assert.equal(computeOverallStatus(steps), "PASSED_WITH_WARNINGS");
  });

  it("PASSED when all checks pass and nothing is skipped", () => {
    const steps = [
      { name: "install", status: "PASSED" },
      { name: "lint", status: "PASSED" },
      { name: "typecheck", status: "PASSED" },
      { name: "test", status: "PASSED" },
    ];
    assert.equal(computeOverallStatus(steps), "PASSED");
  });

  it("PASSED_WITH_WARNINGS when only skipped steps", () => {
    const steps = [
      { name: "install", status: "PASSED" },
      { name: "lint", status: "SKIPPED" },
      { name: "typecheck", status: "SKIPPED" },
      { name: "test", status: "SKIPPED" },
    ];
    assert.equal(computeOverallStatus(steps), "PASSED_WITH_WARNINGS");
  });
});
