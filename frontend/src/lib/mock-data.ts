export type Severity = "Critical" | "High" | "Medium" | "Low";
export type FindingStatus = "Open" | "Triaged" | "In progress" | "Fixed";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  file: string;
  status: FindingStatus;
  ruleId: string;
  repository: string;
  description: string;
}

export const mockFindings: Finding[] = [
  {
    id: "SEC-101",
    severity: "Critical",
    title: "SQL injection in dynamic filter builder",
    file: "src/db/query-builder.ts",
    status: "Open",
    ruleId: "CWE-89",
    repository: "reviewpilot/core",
    description: `### Vulnerability analysis
Unsanitized user input is concatenated directly into the SQL query string inside the dynamic filter builder. An attacker can supply crafted SQL literals to bypass access controls or extract arbitrary table data.

\`\`\`typescript
// Vulnerable: raw string interpolation into SQL query
const query = \`SELECT * FROM organizations WHERE tenant_id = '\${tenantId}' AND \${rawFilter}\`;
\`\`\`

### Recommended remediation
Use parameterized query builders or typed ORM methods with explicit bind parameters. Never interpolate unsanitized strings directly into database statements.`,
  },
  {
    id: "SEC-102",
    severity: "Critical",
    title: "Hardcoded bearer authentication token",
    file: "src/services/webhook-client.ts",
    status: "Open",
    ruleId: "CWE-798",
    repository: "reviewpilot/worker",
    description: `### Vulnerability analysis
A long-lived bearer authentication token was committed directly to the webhook client service. If leaked into public logs or source control mirrors, unauthorized actors can invoke internal administrative webhook endpoints.

### Recommended remediation
1. Immediately rotate the credential in your secrets vault.
2. Invalidate the existing active bearer token.
3. Reference secrets exclusively through protected runtime environment variables (e.g. \`process.env.WEBHOOK_SECRET_KEY\`).`,
  },
  {
    id: "SEC-103",
    severity: "Critical",
    title: "Server-side request forgery (SSRF) in fetch preview",
    file: "src/api/routes/preview.ts",
    status: "Open",
    ruleId: "CWE-918",
    repository: "reviewpilot/web",
    description: `### Vulnerability analysis
The preview endpoint accepts an arbitrary target URL from user requests and executes server-side HTTP requests without validating IP ranges. Attackers can probe internal metadata endpoints such as \`http://169.254.169.254\` or private network services.

### Recommended remediation
Enforce strict URL allowlists and resolve domain names against a DNS checker to disallow internal IP addresses (\`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`, and link-local addresses).`,
  },
  {
    id: "PERF-201",
    severity: "High",
    title: "Unbounded in-memory queue without backpressure",
    file: "src/queue/event-worker.ts",
    status: "Triaged",
    ruleId: "PERF-014",
    repository: "reviewpilot/worker",
    description: `### Performance impact
Incoming webhook events are buffered in a native JavaScript array without capacity limits or backpressure signaling. Under high ingestion spikes, Node process memory exhaustion triggers sudden container OOM terminations.

### Recommended remediation
Implement a bounded priority queue with backpressure or delegate buffering to an external queue (such as Redis Streams or SQS) with configured dead-letter thresholds.`,
  },
  {
    id: "SEC-202",
    severity: "High",
    title: "Permissive CORS origin configuration wildcard",
    file: "src/middleware/cors.ts",
    status: "Open",
    ruleId: "CWE-942",
    repository: "reviewpilot/core",
    description: `### Vulnerability analysis
The API middleware reflects the \`Origin\` header or specifies \`Access-Control-Allow-Origin: *\` in combination with credential forwarding. Untrusted third-party domains can forge authenticated cross-origin requests.

### Recommended remediation
Restrict the allowed origins list to known client domain names. Avoid reflecting untrusted origin headers when credentials mode is enabled.`,
  },
  {
    id: "SEC-203",
    severity: "High",
    title: "Path traversal in static asset handler",
    file: "src/server/asset-server.ts",
    status: "Triaged",
    ruleId: "CWE-22",
    repository: "reviewpilot/web",
    description: `### Vulnerability analysis
The asset delivery handler resolves user-supplied file paths without validating that the normalized path remains within the public root directory. An attacker can request paths containing \`../\` sequences to read host system files.

### Recommended remediation
Use \`path.resolve\` with an explicit root boundary check, or employ an established static file middleware with built-in sandbox boundaries.`,
  },
  {
    id: "PERF-204",
    severity: "High",
    title: "Missing database index on foreign key scans.project_id",
    file: "src/db/migrations/20241012_scans.sql",
    status: "In progress",
    ruleId: "DB-301",
    repository: "reviewpilot/core",
    description: `### Performance impact
Queries joining the \`projects\` and \`scans\` tables result in sequential table scans across millions of rows, causing high database CPU utilization and elevated p99 latency during dashboard renders.

### Recommended remediation
Add a composite index on \`(project_id, created_at DESC)\` to support rapid filtering and ordering.`,
  },
  {
    id: "SEC-205",
    severity: "High",
    title: "Insecure JWT signature algorithm none accepted",
    file: "src/auth/jwt-verifier.ts",
    status: "Fixed",
    ruleId: "CWE-347",
    repository: "reviewpilot/auth",
    description: `### Vulnerability analysis
The token verification routine does not enforce strict algorithm specifications, allowing unsigned tokens with \`"alg": "none"\` to pass verification checks under legacy fallback branches.

### Recommended remediation
Explicitly configure \`algorithms: ['RS256']\` on verification functions and reject any token header deviating from cryptographic standards.`,
  },
  {
    id: "CODE-301",
    severity: "Medium",
    title: "Unchecked return error in asynchronous transaction",
    file: "src/repos/user-repository.ts",
    status: "In progress",
    ruleId: "LINT-402",
    repository: "reviewpilot/core",
    description: `### Code quality issue
An asynchronous transaction callback ignores an internal error return value, potentially leaving pending transactions uncommitted or leading to orphaned database lock handles.

### Recommended remediation
Ensure all promises inside transaction handlers are awaited and wrapped in error handling blocks that trigger explicit rollback handlers on failure.`,
  },
  {
    id: "CODE-302",
    severity: "Medium",
    title: "Deprecated crypto cipher algorithm used",
    file: "src/utils/encryption.ts",
    status: "Triaged",
    ruleId: "CWE-327",
    repository: "reviewpilot/core",
    description: `### Cryptographic weakness
The encryption utility specifies \`aes-128-ecb\`, an unauthenticated cipher mode where identical plaintext blocks yield identical ciphertext blocks, leaking structural data.

### Recommended remediation
Migrate to authenticated modern encryption such as \`aes-256-gcm\` or \`chacha20-poly1305\` with randomized initialization vectors.`,
  },
  {
    id: "SEC-303",
    severity: "Medium",
    title: "Missing rate limiting on authentication endpoints",
    file: "src/api/routes/auth.ts",
    status: "Open",
    ruleId: "CWE-307",
    repository: "reviewpilot/auth",
    description: `### Security consideration
The login and password reset endpoints lack IP-based and account-based rate limiting, leaving them susceptible to credential stuffing and automated brute-force attempts.

### Recommended remediation
Attach a Redis-backed token bucket or sliding-window rate limiter middleware with tiered backoff for repeated failed authentications.`,
  },
  {
    id: "CODE-304",
    severity: "Medium",
    title: "Race condition in distributed cache revalidation",
    file: "src/cache/redis-manager.ts",
    status: "Open",
    ruleId: "CONC-101",
    repository: "reviewpilot/worker",
    description: `### Concurrency issue
Multiple concurrent worker threads attempting to refresh expired cache entries trigger duplicate remote queries (cache stampede).

### Recommended remediation
Use distributed mutex locks (e.g., Redlock) or probabilistic early expiration to ensure a single worker revalidates stale cache keys.`,
  },
  {
    id: "CODE-305",
    severity: "Medium",
    title: "Unhandled promise rejection in background job dispatch",
    file: "src/jobs/scheduler.ts",
    status: "Open",
    ruleId: "PROMISE-03",
    repository: "reviewpilot/worker",
    description: `### Stability concern
A detached promise inside the scheduler loop omits a \`.catch()\` handler, causing unhandled rejections that may terminate Node runtimes depending on node configuration flags.

### Recommended remediation
Always attach error handlers or await promises within top-level try/catch blocks in background job loops.`,
  },
  {
    id: "SEC-306",
    severity: "Medium",
    title: "Sensitive data exposure in verbose debug error response",
    file: "src/middleware/error-handler.ts",
    status: "Fixed",
    ruleId: "CWE-209",
    repository: "reviewpilot/core",
    description: `### Information disclosure
Stack traces and internal database schema names were included in the HTTP 500 error response payload sent to external clients.

### Recommended remediation
Sanitize public error responses in production environments. Output unique correlation IDs and record technical stack traces solely to internal log aggregators.`,
  },
  {
    id: "PERF-307",
    severity: "Medium",
    title: "N+1 query execution in pull request review list",
    file: "src/services/pr-service.ts",
    status: "In progress",
    ruleId: "PERF-202",
    repository: "reviewpilot/web",
    description: `### Latency regression
Iterating over a list of 50 pull requests triggers individual roundtrips to fetch author profiles and badge statistics.

### Recommended remediation
Batch retrieval using SQL \`IN\` queries or DataLoader patterns to consolidate multiple child record lookups into a single roundtrip.`,
  },
  {
    id: "CODE-308",
    severity: "Medium",
    title: "Potential prototype pollution via object merge utility",
    file: "src/lib/deep-merge.ts",
    status: "Triaged",
    ruleId: "CWE-1321",
    repository: "reviewpilot/core",
    description: `### Vulnerability analysis
Recursive object merge functions do not reject \`__proto__\` or \`constructor\` properties, enabling malicious object schemas to modify Object prototypes globally.

### Recommended remediation
Disallow keys named \`__proto__\`, \`prototype\`, and \`constructor\` when traversing nested object hierarchies.`,
  },
  {
    id: "SEC-309",
    severity: "Medium",
    title: "Missing CSRF protection on mutation endpoints",
    file: "src/api/routes/settings.ts",
    status: "Fixed",
    ruleId: "CWE-352",
    repository: "reviewpilot/web",
    description: `### Security consideration
Cookie-authenticated state-changing POST endpoints lacked anti-CSRF token verification or SameSite strict cookies.

### Recommended remediation
Enforce \`SameSite=Lax\` or \`SameSite=Strict\` cookie policies and require custom header verification (e.g. \`X-Requested-With\` or anti-forgery tokens) for all state mutations.`,
  },
  {
    id: "PERF-310",
    severity: "Medium",
    title: "Excessive payload size from uncompressed JSON responses",
    file: "src/api/routes/metrics.ts",
    status: "Open",
    ruleId: "PERF-088",
    repository: "reviewpilot/core",
    description: `### Bandwidth inefficiency
The metrics endpoint emits multi-megabyte JSON telemetry arrays without HTTP compression (gzip/brotli), slowing client loads on mobile connections.

### Recommended remediation
Enable Brotli and gzip compression middleware and paginate metric series samples by timestamp intervals.`,
  },
  {
    id: "STYLE-401",
    severity: "Low",
    title: "Missing readonly constraint on interface members",
    file: "src/types/findings.ts",
    status: "Open",
    ruleId: "TS-501",
    repository: "reviewpilot/core",
    description: `### Best practice suggestion
Immutable domain entities should declare properties as \`readonly\` to prevent inadvertent mutation in downstream service layers.

### Recommended remediation
Add \`readonly\` qualifiers to immutable model definitions or use \`Readonly<T>\`.`,
  },
  {
    id: "STYLE-402",
    severity: "Low",
    title: "Inconsistent console logging in production codepath",
    file: "src/indexer/ast-walker.ts",
    status: "Fixed",
    ruleId: "LINT-102",
    repository: "reviewpilot/core",
    description: `### Code cleanup
Direct invocations of \`console.log\` were left in parsing utility loops. These bypass structured logging pipelines and produce noisy stdout streams.

### Recommended remediation
Replace standard console calls with the structured logger instance (\`logger.debug\`).`,
  },
  {
    id: "STYLE-403",
    severity: "Low",
    title: "Magic numbers used in retry backoff calculation",
    file: "src/services/git-client.ts",
    status: "Open",
    ruleId: "CONST-04",
    repository: "reviewpilot/worker",
    description: `### Readability suggestion
The retry algorithm uses raw numerical constants (1000, 30000, 5) directly in calculation formulas without descriptive identifier names.

### Recommended remediation
Extract numbers to named constants such as \`INITIAL_RETRY_DELAY_MS\` and \`MAX_BACKOFF_CEILING_MS\`.`,
  },
  {
    id: "CODE-404",
    severity: "Low",
    title: "Unused imports detected across legacy routes",
    file: "src/api/v1/legacy-rules.ts",
    status: "Fixed",
    ruleId: "TS-203",
    repository: "reviewpilot/web",
    description: `### Dead code elimination
Several imported types and helper modules are no longer referenced after the v2 API transition.

### Recommended remediation
Remove stale imports to keep bundle size and compilation times optimal.`,
  },
  {
    id: "STYLE-405",
    severity: "Low",
    title: "Non-null assertion operator used in optional chain",
    file: "src/parser/lexer.ts",
    status: "Triaged",
    ruleId: "TS-409",
    repository: "reviewpilot/core",
    description: `### Type safety warning
The \`!\` assertion operator is applied to values that could theoretically be \`undefined\` during incomplete token streams.

### Recommended remediation
Use optional chaining (\`?.\`) or explicit guard clauses instead of non-null assertions.`,
  },
  {
    id: "PERF-406",
    severity: "Low",
    title: "Regular expression created inside tight loop",
    file: "src/search/keyword-matcher.ts",
    status: "Open",
    ruleId: "PERF-102",
    repository: "reviewpilot/core",
    description: `### Performance optimization
A regular expression literal is instantiated repeatedly on every token iteration rather than being compiled once at module scope.

### Recommended remediation
Hoist the RegExp instance outside the loop body or module scope.`,
  },
  {
    id: "STYLE-407",
    severity: "Low",
    title: "Missing JSDoc documentation on public exported SDK methods",
    file: "src/sdk/client.ts",
    status: "Open",
    ruleId: "DOC-001",
    repository: "reviewpilot/core",
    description: `### Documentation enhancement
Public client methods lack parameter and return type documentation, degrading developer experience in IDE autocomplete tooltips.

### Recommended remediation
Add standard TSDoc comments with \`@param\` and \`@returns\` descriptions.`,
  },
  {
    id: "CODE-408",
    severity: "Low",
    title: "Redundant type annotation on initialized primitive variables",
    file: "src/config/env-loader.ts",
    status: "Fixed",
    ruleId: "TS-105",
    repository: "reviewpilot/auth",
    description: `### Code style
Primitive variables with unambiguous literal initializers have redundant explicit type annotations.

### Recommended remediation
Allow TypeScript's type inference to infer primitive types automatically.`,
  },
  {
    id: "PERF-409",
    severity: "Low",
    title: "Array spread operator used in sequential reducer",
    file: "src/utils/array-helpers.ts",
    status: "Open",
    ruleId: "PERF-305",
    repository: "reviewpilot/worker",
    description: `### Performance optimization
Using \`[...acc, item]\` within \`Array.prototype.reduce\` causes O(N^2) memory allocations when combining large arrays.

### Recommended remediation
Use \`acc.push(item)\` inside the reducer or allocate a fixed-length typed array.`,
  },
  {
    id: "STYLE-410",
    severity: "Low",
    title: "Inconsistent parameter naming between interface and implementation",
    file: "src/contracts/scanner.ts",
    status: "Open",
    ruleId: "LINT-311",
    repository: "reviewpilot/core",
    description: `### Consistency suggestion
The scanner interface specifies \`targetPath\` while the concrete implementation names the parameter \`filePath\`.

### Recommended remediation
Align parameter names for clarity and tooling consistency.`,
  },
  {
    id: "CODE-411",
    severity: "Low",
    title: "Implicit any returned from external third-party hook",
    file: "src/hooks/use-socket.ts",
    status: "Triaged",
    ruleId: "TS-701",
    repository: "reviewpilot/web",
    description: `### Type safety warning
The socket wrapper does not cast the external event stream payload, defaulting the event data argument to \`any\`.

### Recommended remediation
Define a generic payload contract \`SocketMessage<T>\` and cast incoming messages safely.`,
  },
  {
    id: "STYLE-412",
    severity: "Low",
    title: "Prefer unknown over any in generic boundary handlers",
    file: "src/utils/serialization.ts",
    status: "Open",
    ruleId: "TS-804",
    repository: "reviewpilot/core",
    description: `### Best practice suggestion
The deserialization fallback uses \`any\` rather than \`unknown\`, disabling compiler safety on deserialized values.

### Recommended remediation
Change return types to \`unknown\` and enforce type narrowing at consumption boundaries.`,
  },
  {
    id: "STYLE-413",
    severity: "Low",
    title: "Missing fallback value in environment variable lookup",
    file: "src/telemetry/statsd.ts",
    status: "Fixed",
    ruleId: "ENV-002",
    repository: "reviewpilot/worker",
    description: `### Operational reliability
StatsD port configurations default to undefined if omitted in local staging environments.

### Recommended remediation
Supply a safe default port \`8125\` when \`STATSD_PORT\` is not specified.`,
  },
  {
    id: "CODE-414",
    severity: "Low",
    title: "Redundant boolean comparison in conditional statement",
    file: "src/auth/permissions.ts",
    status: "Fixed",
    ruleId: "LINT-121",
    repository: "reviewpilot/auth",
    description: `### Code style
Expressions written as \`if (isAdmin === true)\` are redundant when the operand is strictly typed as a boolean.

### Recommended remediation
Simplify to \`if (isAdmin)\`.`,
  },
  {
    id: "PERF-415",
    severity: "Low",
    title: "Unmemoized callback passed to high-frequency list row",
    file: "src/components/row-renderer.tsx",
    status: "Open",
    ruleId: "REACT-012",
    repository: "reviewpilot/web",
    description: `### Frontend render efficiency
An inline arrow function passed to row items causes unnecessary virtual DOM diffing during parent updates.

### Recommended remediation
Wrap row event handlers with \`React.useCallback\` or pass entity identifiers directly.`,
  },
  {
    id: "STYLE-416",
    severity: "Low",
    title: "Missing default branch in exhaustive switch statement",
    file: "src/formatters/status-formatter.ts",
    status: "Triaged",
    ruleId: "TS-902",
    repository: "reviewpilot/core",
    description: `### Maintainability warning
A switch over enum states does not include an explicit \`default: assertNever(val)\` branch to guarantee compile-time exhaustiveness.

### Recommended remediation
Add an exhaustive \`default\` check to catch future enum variant additions.`,
  },
  {
    id: "STYLE-417",
    severity: "Low",
    title: "Multiple return statements in single-line ternary helper",
    file: "src/utils/string-helpers.ts",
    status: "Open",
    ruleId: "STYLE-114",
    repository: "reviewpilot/core",
    description: `### Readability suggestion
A nested ternary operator spans multiple wrapped lines without parenthesized grouping.

### Recommended remediation
Refactor nested ternaries into sequential \`if/else\` statements or a lookup table.`,
  },
  {
    id: "CODE-418",
    severity: "Low",
    title: "Unused function parameter in middleware chain",
    file: "src/middleware/request-id.ts",
    status: "Fixed",
    ruleId: "TS-205",
    repository: "reviewpilot/core",
    description: `### Code cleanup
The \`res\` parameter in the request tracking middleware is unused.

### Recommended remediation
Prefix unused parameters with an underscore (\`_res\`) or remove if unneeded by signature.`,
  },
  {
    id: "PERF-419",
    severity: "Low",
    title: "Deep object clone used where shallow copy suffices",
    file: "src/state/filter-slice.ts",
    status: "Open",
    ruleId: "PERF-211",
    repository: "reviewpilot/web",
    description: `### Performance optimization
Using \`structuredClone\` on flat filter configuration dictionaries adds avoidable cloning overhead.

### Recommended remediation
Use object spread \`{ ...filters }\` for flat state representations.`,
  },
  {
    id: "STYLE-420",
    severity: "Low",
    title: "Hardcoded timezone offset in date formatting utility",
    file: "src/utils/date-helpers.ts",
    status: "Open",
    ruleId: "DATE-003",
    repository: "reviewpilot/core",
    description: `### Internationalization suggestion
A timestamp formatter hardcodes \`UTC\` rather than respecting the configured user locale or timezone.

### Recommended remediation
Accept a timezone parameter or use standard \`date-fns\` / \`Intl.DateTimeFormat\` timezone localization.`,
  },
  {
    id: "CODE-421",
    severity: "Low",
    title: "Missing key prop in dynamic breadcrumb item list",
    file: "src/components/navigation-crumbs.tsx",
    status: "Fixed",
    ruleId: "REACT-004",
    repository: "reviewpilot/web",
    description: `### React warning
An array mapping over breadcrumb paths used array index as the JSX element key rather than a stable path identifier.

### Recommended remediation
Use the unique path segment string as the element key (\`key={segment.href}\`).`,
  },
  {
    id: "STYLE-422",
    severity: "Low",
    title: "File naming convention mismatch with kebab-case guideline",
    file: "src/services/AuditLogger.ts",
    status: "Open",
    ruleId: "FILE-001",
    repository: "reviewpilot/worker",
    description: `### Repository convention
File names across this codebase follow lowercase kebab-case, but \`AuditLogger.ts\` uses PascalCase.

### Recommended remediation
Rename the file to \`audit-logger.ts\` and update corresponding module imports.`,
  },
];
