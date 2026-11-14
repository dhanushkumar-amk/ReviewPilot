import fs from "node:fs/promises";
import path from "node:path";
import {
  sanitizePosixPath,
  type NormalizedFinding,
} from "../normalize.js";

const SENSITIVE_EXACT_FILES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.staging",
  ".env.development",
  "id_rsa",
  "id_ed25519",
  "id_dsa",
  "credentials.json",
  "service-account.json",
  "client_secret.json",
  "terraform.tfstate",
  "terraform.tfstate.backup",
  "dump.sql",
  "backup.sql",
]);

const SENSITIVE_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".pfx",
  ".p12",
  ".sqlite",
  ".sqlite3",
]);

export async function runHygieneAnalyzer(
  repoDir: string,
): Promise<{ findings: NormalizedFinding[] }> {
  const findings: NormalizedFinding[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = sanitizePosixPath(path.relative(repoDir, fullPath));
      if (!relPath) continue;

      if (
        entry.isDirectory() &&
        (entry.name === "node_modules" ||
          entry.name === ".git" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".next")
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      const basename = entry.name.toLowerCase();
      const ext = path.extname(basename);

      // Check 1: Sensitive & credential files exposed in repository
      if (SENSITIVE_EXACT_FILES.has(basename) || SENSITIVE_EXTENSIONS.has(ext)) {
        findings.push({
          tool: "GITLEAKS",
          ruleId: "exposed-sensitive-file",
          title: "Sensitive credential or state file committed to repository",
          message: `Potentially sensitive file '${relPath}' was committed to version control. Credential and environment files should be stored in secrets managers and added to .gitignore.`,
          severity: "CRITICAL",
          category: "SECRET",
          filePath: relPath,
          startLine: 1,
          endLine: 1,
          snippet: "Sensitive file name: " + entry.name,
        });
      }

      // Check 2: package.json supply chain audits
      if (basename === "package.json") {
        try {
          const content = await fs.readFile(fullPath, "utf8");
          const pkg = JSON.parse(content);
          const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
          };

          for (const [depName, versionRange] of Object.entries(allDeps)) {
            if (typeof versionRange === "string") {
              const trimmed = versionRange.trim();
              if (trimmed === "*" || trimmed === "latest") {
                findings.push({
                  tool: "ESLINT",
                  ruleId: "supply-chain/unpinned-dependency",
                  title: "Wildcard or unpinned package dependency version",
                  message: `Dependency '${depName}' uses wildcard range '${versionRange}'. Unpinned dependencies risk pulling untrusted code or breaking releases unexpectedly.`,
                  severity: "HIGH",
                  category: "SECURITY",
                  filePath: relPath,
                  startLine: 1,
                  endLine: 1,
                  snippet: `"${depName}": "${versionRange}"`,
                });
              } else if (trimmed.startsWith("http://")) {
                findings.push({
                  tool: "ESLINT",
                  ruleId: "supply-chain/unencrypted-dependency-source",
                  title: "Unencrypted HTTP dependency download source",
                  message: `Dependency '${depName}' is downloaded over unencrypted HTTP protocol ('${versionRange}'), which is vulnerable to man-in-the-middle tampering.`,
                  severity: "HIGH",
                  category: "SECURITY",
                  filePath: relPath,
                  startLine: 1,
                  endLine: 1,
                  snippet: `"${depName}": "${versionRange}"`,
                });
              }
            }
          }
        } catch {}
      }

      // Check 3: Dockerfile security checks
      if (basename === "dockerfile" || basename.startsWith("dockerfile.")) {
        try {
          const content = await fs.readFile(fullPath, "utf8");
          const lines = content.split("\n");
          let hasUserDirective = false;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]!.trim();
            const lineNum = i + 1;

            if (line.toUpperCase().startsWith("USER ")) {
              hasUserDirective = true;
            }

            if (line.toUpperCase().startsWith("FROM ")) {
              const image = line.slice(5).trim();
              if (image.endsWith(":latest") || (!image.includes(":") && !image.includes("@sha256:"))) {
                findings.push({
                  tool: "ESLINT",
                  ruleId: "docker/unpinned-base-image",
                  title: "Dockerfile unpinned or latest base image tag",
                  message: `Base image '${image}' uses an unpinned or ':latest' tag. Pin images by specific digest or semantic tag to guarantee reproducibility.`,
                  severity: "MEDIUM",
                  category: "QUALITY",
                  filePath: relPath,
                  startLine: lineNum,
                  endLine: lineNum,
                  snippet: line,
                });
              }
            }

            if (line.toUpperCase().startsWith("ENV ")) {
              const envRest = line.slice(4).trim().toUpperCase();
              if (
                envRest.includes("PASSWORD=") ||
                envRest.includes("SECRET=") ||
                envRest.includes("API_KEY=") ||
                envRest.includes("TOKEN=")
              ) {
                findings.push({
                  tool: "GITLEAKS",
                  ruleId: "docker/hardcoded-env-secret",
                  title: "Hardcoded secret in Dockerfile ENV instruction",
                  message: `Potential credential hardcoded in Dockerfile ENV instruction. Use runtime build secrets (e.g. docker buildkit --secret) instead.`,
                  severity: "HIGH",
                  category: "SECRET",
                  filePath: relPath,
                  startLine: lineNum,
                  endLine: lineNum,
                  snippet: "[REDACTED DOCKERFILE ENV INSTRUCTION]",
                });
              }
            }
          }

          if (!hasUserDirective && lines.length > 3) {
            findings.push({
              tool: "ESLINT",
              ruleId: "docker/missing-user-directive",
              title: "Container executes as root user by default",
              message: `Dockerfile does not specify a non-root 'USER' directive. Containers should run as non-root to reduce blast radius in case of container escape.`,
              severity: "MEDIUM",
              category: "SECURITY",
              filePath: relPath,
              startLine: 1,
              endLine: 1,
              snippet: lines[0] || "FROM ...",
            });
          }
        } catch {}
      }

      // Check 4: GitHub Actions Workflow Security
      if (
        relPath.startsWith(".github/workflows/") &&
        (basename.endsWith(".yml") || basename.endsWith(".yaml"))
      ) {
        try {
          const content = await fs.readFile(fullPath, "utf8");
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]!.trim();
            const lineNum = i + 1;

            if (line.includes("pull_request_target")) {
              findings.push({
                tool: "ESLINT",
                ruleId: "github-actions/pull-request-target",
                title: "Insecure pull_request_target trigger in GitHub Actions",
                message: `'pull_request_target' triggers with write permissions on forks and can be exploited for privilege escalation if untrusted code is checked out.`,
                severity: "HIGH",
                category: "SECURITY",
                filePath: relPath,
                startLine: lineNum,
                endLine: lineNum,
                snippet: line,
              });
            }

            if (line.startsWith("uses:") && (line.includes("@master") || line.includes("@main"))) {
              findings.push({
                tool: "ESLINT",
                ruleId: "github-actions/unpinned-action",
                title: "Unpinned mutable branch ref in third-party GitHub Action",
                message: `Action reference '${line}' uses mutable branch ref (@master/@main). Pin by full commit SHA (e.g. @4f6250...) to prevent supply-chain compromises.`,
                severity: "MEDIUM",
                category: "SECURITY",
                filePath: relPath,
                startLine: lineNum,
                endLine: lineNum,
                snippet: line,
              });
            }
          }
        } catch {}
      }
    }
  }

  await walk(repoDir);
  return { findings };
}
