export type StepName = "install" | "lint" | "typecheck" | "test";

export interface DetectedConfig {
  isNodeProject: boolean;
  packageManager: "npm" | "pnpm" | "yarn";
  installCommand: string;
  hasLint: boolean;
  lintCommand?: string;
  hasTypecheck: boolean;
  typecheckCommand?: string;
  hasTest: boolean;
  testCommand?: string;
}

export function detectProjectConfig(
  fileList: string[],
  rawPackageJson?: string | null,
): DetectedConfig {
  // Normalize file list (strip leading ./ if any)
  const normalizedFiles = new Set(
    fileList.map((f) => f.replace(/^\.\//, "").trim()),
  );

  const hasPackageJson = normalizedFiles.has("package.json") || (rawPackageJson !== undefined && rawPackageJson !== null);

  if (!hasPackageJson) {
    return {
      isNodeProject: false,
      packageManager: "npm",
      installCommand: "npm install --ignore-scripts --no-audit --no-fund",
      hasLint: false,
      hasTypecheck: false,
      hasTest: false,
    };
  }

  // Determine package manager strictly from lockfiles
  let packageManager: "npm" | "pnpm" | "yarn" = "npm";
  let installCommand = "npm install --ignore-scripts --no-audit --no-fund";

  if (normalizedFiles.has("package-lock.json")) {
    packageManager = "npm";
    installCommand = "npm ci --ignore-scripts";
  } else if (normalizedFiles.has("pnpm-lock.yaml")) {
    packageManager = "pnpm";
    installCommand = "corepack enable pnpm 2>/dev/null || npm i -g pnpm && pnpm install --frozen-lockfile --ignore-scripts";
  } else if (normalizedFiles.has("yarn.lock")) {
    packageManager = "yarn";
    installCommand = "yarn install --frozen-lockfile --ignore-scripts";
  }

  // Parse package.json scripts safely without trusting any values
  let scripts: Record<string, unknown> = {};
  if (rawPackageJson) {
    try {
      const parsed = JSON.parse(rawPackageJson);
      if (parsed && typeof parsed === "object" && typeof parsed.scripts === "object" && parsed.scripts !== null) {
        scripts = parsed.scripts;
      }
    } catch {
      // Malformed package.json
    }
  }

  const hasLint = typeof scripts.lint === "string" && scripts.lint.trim().length > 0;
  const hasTypecheckScript = typeof scripts.typecheck === "string" && scripts.typecheck.trim().length > 0;
  const hasTsConfig = normalizedFiles.has("tsconfig.json");
  const hasTypecheck = hasTypecheckScript || hasTsConfig;
  const hasTest = typeof scripts.test === "string" && scripts.test.trim().length > 0;

  // All commands are strictly fixed strings - NEVER interpolate repository or user values
  const lintCommand = hasLint
    ? packageManager === "pnpm"
      ? "pnpm run lint"
      : packageManager === "yarn"
        ? "yarn run lint"
        : "npm run lint"
    : undefined;

  const typecheckCommand = hasTypecheckScript
    ? packageManager === "pnpm"
      ? "pnpm run typecheck"
      : packageManager === "yarn"
        ? "yarn run typecheck"
        : "npm run typecheck"
    : hasTsConfig
      ? "npx tsc --noEmit"
      : undefined;

  const testCommand = hasTest
    ? packageManager === "pnpm"
      ? "pnpm test"
      : packageManager === "yarn"
        ? "yarn test"
        : "npm test"
    : undefined;

  return {
    isNodeProject: true,
    packageManager,
    installCommand,
    hasLint,
    lintCommand,
    hasTypecheck,
    typecheckCommand,
    hasTest,
    testCommand,
  };
}

