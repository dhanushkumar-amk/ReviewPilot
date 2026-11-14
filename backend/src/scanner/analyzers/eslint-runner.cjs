const fs = require("node:fs");
const path = require("node:path");
const { ESLint } = require("eslint");

const [rawTargetDir, outputFile] = process.argv.slice(2);

if (!rawTargetDir || !outputFile) {
  process.exit(1);
}

const targetDir = path.resolve(rawTargetDir);

async function run() {
  const tsParser = require("typescript-eslint").parser;
  const pluginSecurity = require("eslint-plugin-security");
  const js = require("@eslint/js");

  const eslint = new ESLint({
    cwd: targetDir,
    overrideConfigFile: true,
    baseConfig: [
      {
        files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
        ignores: [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.next/**",
          "**/out/**",
          "**/coverage/**",
          "**/vendor/**",
          "**/*.min.js",
        ],
        languageOptions: {
          parser: tsParser,
          parserOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
          },
        },
        plugins: {
          security: pluginSecurity,
        },
        rules: {
          // Curated Security Rules (detect-object-injection is intentionally OFF)
          "security/detect-eval-with-expression": "error",
          "security/detect-child-process": "error",
          "security/detect-non-literal-require": "error",
          "security/detect-non-literal-fs-filename": "error",
          "security/detect-unsafe-regex": "error",
          "security/detect-possible-timing-attacks": "error",
          "security/detect-pseudoRandomBytes": "error",
          "security/detect-buffer-noassert": "error",
          "security/detect-disable-mustache-escape": "error",
          "security/detect-object-injection": "off",

          // Bug Rules
          "no-undef": "off",
          "no-unreachable": "error",
          "no-dupe-keys": "error",
          "no-unsafe-finally": "error",
          "no-self-assign": "error",
          "use-isnan": "error",
          "valid-typeof": "error",
        },
      },
    ],
  });

  const results = await eslint.lintFiles(["**/*.{js,jsx,mjs,cjs,ts,tsx}"]);
  fs.writeFileSync(outputFile, JSON.stringify(results), "utf8");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

