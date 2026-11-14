# Test Violations Suite

This folder contains test verification fixtures for ReviewPilot's static analyzer and AI remediation engine:

### 1. Injection & Critical Security Rules
- `eval-injection.js`: `security/detect-eval-with-expression` (HIGH)
- `command-injection.js`: `security/detect-child-process` (HIGH)
- `advanced-security.js`:
  - `no-new-func`: Dynamic `new Function()` code execution (HIGH)
  - `no-script-url`: `javascript:` URL protocol XSS injection (HIGH)
  - `no-proto`: Deprecated `__proto__` prototype pollution vector (HIGH)

### 2. File & Cryptographic Security Rules
- `path-traversal.js`: `security/detect-non-literal-fs-filename` (MEDIUM)
- `timing-attack.js`: `security/detect-possible-timing-attacks` (MEDIUM)
- `unsafe-regex.js`: `security/detect-unsafe-regex` ReDoS regular expression (MEDIUM)

### 3. Logic & Runtime Bug Rules
- `advanced-bugs.js`:
  - `no-async-promise-executor`: Async function in Promise constructor (HIGH)
  - `no-loss-of-precision`: Number exceeding `MAX_SAFE_INTEGER` precision (HIGH)
  - `no-compare-neg-zero`: Strict comparison against `-0` (MEDIUM)
  - `no-unsafe-negation`: Ambiguous negation `!key in obj` (MEDIUM)
  - `no-fallthrough`: Unintentional case fallthrough in switch block (MEDIUM)
- `bugs.js`:
  - `valid-typeof`: Invalid typeof string comparison (MEDIUM)
  - `use-isnan`: Equality comparison against `NaN` (MEDIUM)
  - `no-dupe-keys`: Duplicate key in object literal (MEDIUM)
  - `no-unreachable`: Dead unreachable code after return (MEDIUM)
  - `no-unsafe-finally`: Unsafe return flow in finally block (MEDIUM)

### 4. Repository Hygiene & Supply Chain Engine
- Exposed sensitive files: `.env`, `id_rsa`, `credentials.json`, `*.pem`, `*.tfstate`, `dump.sql`
- Supply chain security: Wildcard (`*`, `latest`) and unencrypted (`http://`) dependencies in `package.json`
- Container security: Dockerfile missing `USER` (running as root) and unpinned base images
- CI/CD security: Insecure GitHub Actions `pull_request_target` triggers and unpinned mutable actions
