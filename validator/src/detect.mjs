/**
 * detect.mjs
 * Reads package.json and detects which steps should run.
 * npm ONLY — pnpm/yarn projects are skipped entirely.
 * No dependencies — Node built-ins only.
 */

import fs from "node:fs/promises";
import path from "node:path";

// The npm placeholder test script that means "no test configured"
const NPM_PLACEHOLDER_TEST = /^echo "Error: no test specified" && exit 1$/;

export async function detectProjectConfig(repoDir) {
  // Check for package.json
  let pkgRaw;
  try {
    pkgRaw = await fs.readFile(path.join(repoDir, "package.json"), "utf8");
  } catch {
    return {
      isSupported: false,
      skipReason: "No package.json found",
      steps: [],
    };
  }

  // Parse package.json safely
  let pkg;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch {
    return {
      isSupported: false,
      skipReason: "No package.json found",
      steps: [],
    };
  }

  // Check for pnpm or yarn lockfiles — skip those
  const hasPnpmLock = await fs.access(path.join(repoDir, "pnpm-lock.yaml")).then(() => true).catch(() => false);
  const hasYarnLock = await fs.access(path.join(repoDir, "yarn.lock")).then(() => true).catch(() => false);

  if (hasPnpmLock || hasYarnLock) {
    return {
      isSupported: false,
      skipReason: "Only npm projects are supported right now",
      steps: [],
    };
  }

  // Determine install command
  const hasPackageLock = await fs.access(path.join(repoDir, "package-lock.json")).then(() => true).catch(() => false);
  const installCommand = hasPackageLock
    ? ["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"]
    : ["npm", "install", "--ignore-scripts", "--no-audit", "--no-fund"];

  // Parse scripts
  const scripts = (pkg && typeof pkg === "object" && pkg.scripts && typeof pkg.scripts === "object")
    ? pkg.scripts
    : {};

  // Lint: only if scripts.lint exists
  const lintScript = typeof scripts.lint === "string" && scripts.lint.trim() ? scripts.lint.trim() : null;
  const lintCommand = lintScript ? ["npm", "run", "lint", "--silent"] : null;

  // Typecheck: scripts.typecheck first, then npx tsc if tsconfig.json AND tsc is installed
  const typecheckScript = typeof scripts.typecheck === "string" && scripts.typecheck.trim()
    ? scripts.typecheck.trim()
    : null;
  let typecheckCommand = null;
  let typecheckSkipReason = "No typecheck script or tsconfig.json found";

  if (typecheckScript) {
    typecheckCommand = ["npm", "run", "typecheck", "--silent"];
  } else {
    // Check tsconfig.json
    const hasTsConfig = await fs.access(path.join(repoDir, "tsconfig.json")).then(() => true).catch(() => false);
    if (hasTsConfig) {
      // Check if tsc is installed in node_modules
      const hasTsc = await fs.access(path.join(repoDir, "node_modules", ".bin", "tsc"))
        .then(() => true).catch(() => false);
      if (hasTsc) {
        typecheckCommand = ["npx", "--no-install", "tsc", "--noEmit"];
        typecheckSkipReason = null;
      } else {
        typecheckSkipReason = "No typecheck script or tsconfig.json found";
      }
    }
  }

  // Test: only if scripts.test exists AND is not the npm placeholder
  const testScript = typeof scripts.test === "string" ? scripts.test.trim() : "";
  let testCommand = null;
  let testSkipReason = "No test script";
  if (testScript && !NPM_PLACEHOLDER_TEST.test(testScript)) {
    testCommand = ["npm", "test", "--silent"];
  }

  return {
    isSupported: true,
    skipReason: null,
    installCommand,
    steps: [
      {
        name: "install",
        command: installCommand,
        shouldRun: true,
        skipReason: null,
      },
      {
        name: "lint",
        command: lintCommand,
        shouldRun: Boolean(lintCommand),
        skipReason: lintCommand ? null : "No lint script in package.json",
      },
      {
        name: "typecheck",
        command: typecheckCommand,
        shouldRun: Boolean(typecheckCommand),
        skipReason: typecheckCommand ? null : typecheckSkipReason,
      },
      {
        name: "test",
        command: testCommand,
        shouldRun: Boolean(testCommand),
        skipReason: testCommand ? null : testSkipReason,
      },
    ],
  };
}
