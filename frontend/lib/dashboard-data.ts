export interface ScanActivityPoint {
  date: string;
  reviews: number;
  findings: number;
  fixed: number;
}

export interface RepositoryRecord {
  id: string;
  fullName: string;
  provider: "GitHub" | "GitLab" | "Bitbucket";
  language: string;
  defaultBranch: string;
  autoScan: boolean;
  webhookStatus: "Connected" | "Pending" | "Attention";
  lastScanAt: string;
  openFindings: number;
  coveragePct: number;
}

export interface ScanStep {
  name: string;
  duration: string;
  status: "Completed" | "Running" | "Failed";
  detail: string;
}

export interface ScanRunRecord {
  id: string;
  repository: string;
  branch: string;
  commitSha: string;
  trigger: "Pull request" | "Push to main" | "Manual" | "Scheduled";
  status: "Completed" | "Running" | "Failed" | "Queued";
  duration: string;
  filesScanned: number;
  findingsCount: number;
  startedAt: string;
  steps: ScanStep[];
}

export interface PullRequestComment {
  id: string;
  file: string;
  line: number;
  severity: "Critical" | "High" | "Medium" | "Low";
  title: string;
  suggestion: string;
  removedLine: string;
  addedLine: string;
}

export interface PullRequestRecord {
  id: string;
  number: number;
  title: string;
  repository: string;
  author: string;
  sourceBranch: string;
  targetBranch: string;
  verdict: "Approved" | "Changes requested" | "In review";
  additions: number;
  deletions: number;
  findingsCount: number;
  updatedAt: string;
  summary: string;
  comments: PullRequestComment[];
}

export interface SecurityRuleRecord {
  id: string;
  name: string;
  cwe: string;
  category: "Security" | "Performance" | "Reliability" | "Style";
  severity: "Critical" | "High" | "Medium" | "Low";
  engine: string;
  enabled: boolean;
  matches30d: number;
  description: string;
  exampleYaml: string;
}

export interface InvoiceRecord {
  id: string;
  period: string;
  description: string;
  amount: string;
  status: "Paid" | "Pending";
  issuedAt: string;
}

export interface SupportTicketRecord {
  id: string;
  subject: string;
  category: "Scanner Engine" | "GitHub App" | "Billing" | "Security";
  priority: "Urgent" | "Normal" | "Low";
  status: "Open" | "In progress" | "Resolved";
  updatedAt: string;
}

export const scanActivityChartData: ScanActivityPoint[] = [
  { date: "Nov 01", reviews: 24, findings: 9, fixed: 7 },
  { date: "Nov 02", reviews: 18, findings: 6, fixed: 5 },
  { date: "Nov 03", reviews: 29, findings: 11, fixed: 10 },
  { date: "Nov 04", reviews: 34, findings: 14, fixed: 11 },
  { date: "Nov 05", reviews: 31, findings: 8, fixed: 8 },
  { date: "Nov 06", reviews: 27, findings: 10, fixed: 9 },
  { date: "Nov 07", reviews: 22, findings: 5, fixed: 5 },
  { date: "Nov 08", reviews: 38, findings: 13, fixed: 12 },
  { date: "Nov 09", reviews: 41, findings: 15, fixed: 13 },
  { date: "Nov 10", reviews: 36, findings: 9, fixed: 9 },
  { date: "Nov 11", reviews: 44, findings: 12, fixed: 10 },
];

export const initialRepositories: RepositoryRecord[] = [
  {
    id: "repo-1",
    fullName: "reviewpilot/core",
    provider: "GitHub",
    language: "TypeScript",
    defaultBranch: "main",
    autoScan: true,
    webhookStatus: "Connected",
    lastScanAt: "4 mins ago",
    openFindings: 8,
    coveragePct: 98,
  },
  {
    id: "repo-2",
    fullName: "reviewpilot/auth",
    provider: "GitHub",
    language: "TypeScript",
    defaultBranch: "main",
    autoScan: true,
    webhookStatus: "Connected",
    lastScanAt: "18 mins ago",
    openFindings: 4,
    coveragePct: 100,
  },
  {
    id: "repo-3",
    fullName: "reviewpilot/web",
    provider: "GitHub",
    language: "TSX",
    defaultBranch: "main",
    autoScan: true,
    webhookStatus: "Connected",
    lastScanAt: "26 mins ago",
    openFindings: 5,
    coveragePct: 94,
  },
  {
    id: "repo-4",
    fullName: "reviewpilot/worker",
    provider: "GitHub",
    language: "Node.js",
    defaultBranch: "main",
    autoScan: true,
    webhookStatus: "Connected",
    lastScanAt: "1 hour ago",
    openFindings: 3,
    coveragePct: 96,
  },
  {
    id: "repo-5",
    fullName: "reviewpilot/infra-terraform",
    provider: "GitLab",
    language: "HCL",
    defaultBranch: "production",
    autoScan: false,
    webhookStatus: "Attention",
    lastScanAt: "2 days ago",
    openFindings: 2,
    coveragePct: 82,
  },
  {
    id: "repo-6",
    fullName: "reviewpilot/billing-service",
    provider: "Bitbucket",
    language: "Go",
    defaultBranch: "master",
    autoScan: true,
    webhookStatus: "Connected",
    lastScanAt: "3 hours ago",
    openFindings: 1,
    coveragePct: 99,
  },
];

export const initialScanRuns: ScanRunRecord[] = [
  {
    id: "SCN-8944",
    repository: "reviewpilot/core",
    branch: "feat/pr-482-sql-filter",
    commitSha: "a91f30c",
    trigger: "Pull request",
    status: "Running",
    duration: "0m 32s",
    filesScanned: 48,
    findingsCount: 2,
    startedAt: "Just now",
    steps: [
      {
        name: "Checkout shallow diff",
        duration: "1.4s",
        status: "Completed",
        detail: "Fetched 48 changed files from commit a91f30c.",
      },
      {
        name: "AST + taint graph analysis",
        duration: "14.8s",
        status: "Completed",
        detail: "Evaluated 142 security & CWE rules across TypeScript AST.",
      },
      {
        name: "AI contextual diff review",
        duration: "15.8s",
        status: "Running",
        detail: "Synthesizing inline patch suggestions for PR #482...",
      },
    ],
  },
  {
    id: "SCN-8943",
    repository: "reviewpilot/web",
    branch: "main",
    commitSha: "71c4d8e",
    trigger: "Push to main",
    status: "Completed",
    duration: "1m 12s",
    filesScanned: 184,
    findingsCount: 0,
    startedAt: "26 mins ago",
    steps: [
      {
        name: "Checkout shallow diff",
        duration: "1.9s",
        status: "Completed",
        detail: "Verified repository webhook signature & checked out main.",
      },
      {
        name: "AST + taint graph analysis",
        duration: "41.2s",
        status: "Completed",
        detail: "Zero regressions across 184 frontend modules.",
      },
      {
        name: "Publish GitHub Check Run",
        duration: "0.7s",
        status: "Completed",
        detail: "Posted green status check on commit 71c4d8e.",
      },
    ],
  },
  {
    id: "SCN-8942",
    repository: "reviewpilot/auth",
    branch: "fix/jwt-strict-alg",
    commitSha: "4e902ab",
    trigger: "Pull request",
    status: "Completed",
    duration: "0m 54s",
    filesScanned: 29,
    findingsCount: 1,
    startedAt: "1 hour ago",
    steps: [
      {
        name: "Checkout shallow diff",
        duration: "1.1s",
        status: "Completed",
        detail: "Fetched PR #119 head ref.",
      },
      {
        name: "AST + taint graph analysis",
        duration: "29.4s",
        status: "Completed",
        detail: "Flagged 1 high-severity rate limit policy gap.",
      },
      {
        name: "Publish GitHub Check Run",
        duration: "0.9s",
        status: "Completed",
        detail: "Annotated src/api/routes/auth.ts line 84.",
      },
    ],
  },
  {
    id: "SCN-8941",
    repository: "reviewpilot/infra-terraform",
    branch: "chore/vpc-peering",
    commitSha: "d22b19a",
    trigger: "Manual",
    status: "Failed",
    duration: "0m 19s",
    filesScanned: 12,
    findingsCount: 0,
    startedAt: "3 hours ago",
    steps: [
      {
        name: "Checkout shallow diff",
        duration: "2.1s",
        status: "Completed",
        detail: "Fetched HCL workspace modules.",
      },
      {
        name: "Provider schema fetch",
        duration: "16.9s",
        status: "Failed",
        detail: "Webhook deployment token expired for private GitLab registry.",
      },
    ],
  },
  {
    id: "SCN-8940",
    repository: "reviewpilot/worker",
    branch: "main",
    commitSha: "b88c012",
    trigger: "Scheduled",
    status: "Completed",
    duration: "1m 46s",
    filesScanned: 215,
    findingsCount: 3,
    startedAt: "5 hours ago",
    steps: [
      {
        name: "Full nightly workspace clone",
        duration: "4.8s",
        status: "Completed",
        detail: "Synced worker repository at b88c012.",
      },
      {
        name: "Concurrency & promise audit",
        duration: "1m 38s",
        status: "Completed",
        detail: "Identified 3 medium reliability findings.",
      },
      {
        name: "Digest report dispatch",
        duration: "2.4s",
        status: "Completed",
        detail: "Synced findings inventory with dashboard.",
      },
    ],
  },
];

export const initialPullRequests: PullRequestRecord[] = [
  {
    id: "pr-482",
    number: 482,
    title: "feat(search): add dynamic repository query filters",
    repository: "reviewpilot/core",
    author: "Elena Rostova",
    sourceBranch: "feat/search-filters",
    targetBranch: "main",
    verdict: "Changes requested",
    additions: 148,
    deletions: 32,
    findingsCount: 2,
    updatedAt: "6 mins ago",
    summary:
      "ReviewPilot detected unparameterized SQL interpolation in the query builder and suggested a bound Prisma query alternative.",
    comments: [
      {
        id: "c-1",
        file: "src/repos/search-repository.ts",
        line: 44,
        severity: "Critical",
        title: "SQL injection risk via raw string template",
        suggestion:
          "Use Prisma tagged template parameterization (`Prisma.sql`) instead of interpolating `filter.query` directly.",
        removedLine:
          "const rows = await prisma.$queryRawUnsafe(`SELECT * FROM scans WHERE repo = '${repo}'`);",
        addedLine:
          "const rows = await prisma.$queryRaw(Prisma.sql`SELECT * FROM scans WHERE repo = ${repo}`);",
      },
    ],
  },
  {
    id: "pr-119",
    number: 119,
    title: "fix(auth): enforce strict RS256 verification and cookie rotation",
    repository: "reviewpilot/auth",
    author: "Marcus Vance",
    sourceBranch: "fix/jwt-strict-alg",
    targetBranch: "main",
    verdict: "Approved",
    additions: 64,
    deletions: 19,
    findingsCount: 0,
    updatedAt: "42 mins ago",
    summary:
      "All security checks passed. Algorithm fallback branch eliminated and session rotation verified across edge routes.",
    comments: [
      {
        id: "c-2",
        file: "src/auth/jwt-verifier.ts",
        line: 27,
        severity: "Low",
        title: "Consider documenting token clock tolerance",
        suggestion:
          "Explicitly specify `clockTolerance: 5` seconds for distributed clock skew.",
        removedLine: "return jwtVerify(token, publicKey);",
        addedLine:
          "return jwtVerify(token, publicKey, { algorithms: ['RS256'], clockTolerance: 5 });",
      },
    ],
  },
  {
    id: "pr-307",
    number: 307,
    title: "perf(worker): batch Inngest finding persistence jobs",
    repository: "reviewpilot/worker",
    author: "Priya Nair",
    sourceBranch: "perf/batch-findings",
    targetBranch: "main",
    verdict: "In review",
    additions: 210,
    deletions: 85,
    findingsCount: 1,
    updatedAt: "2 hours ago",
    summary:
      "ReviewPilot confirmed reduced Neon round-trips, with one medium suggestion on retry idempotency keys.",
    comments: [
      {
        id: "c-3",
        file: "src/jobs/persist-findings.ts",
        line: 61,
        severity: "Medium",
        title: "Ensure idempotent upsert key during Inngest step retries",
        suggestion:
          "Use `createMany({ skipDuplicates: true })` inside `step.run` so partial retries remain idempotent.",
        removedLine: "await prisma.finding.createMany({ data: batch });",
        addedLine:
          "await prisma.finding.createMany({ data: batch, skipDuplicates: true });",
      },
    ],
  },
  {
    id: "pr-641",
    number: 641,
    title: "ui(dashboard): upgrade repository health cards and diff tokens",
    repository: "reviewpilot/web",
    author: "Liam O'Connor",
    sourceBranch: "ui/dashboard-refresh",
    targetBranch: "main",
    verdict: "Approved",
    additions: 312,
    deletions: 124,
    findingsCount: 0,
    updatedAt: "4 hours ago",
    summary:
      "Clean accessibility and zero XSS/sanitization issues across client components.",
    comments: [],
  },
];

export const initialRules: SecurityRuleRecord[] = [
  {
    id: "RULE-101",
    name: "Block unparameterized SQL execution",
    cwe: "CWE-89",
    category: "Security",
    severity: "Critical",
    engine: "Taint-TS / SQL",
    enabled: true,
    matches30d: 14,
    description:
      "Detects template literals or string concatenation passed into raw database execution methods.",
    exampleYaml: `id: CWE-89
severity: critical
block_merge: true
targets: ["prisma.$queryRawUnsafe", "pool.query"]`,
  },
  {
    id: "RULE-102",
    name: "Reject unsigned JWT algorithm fallback",
    cwe: "CWE-347",
    category: "Security",
    severity: "Critical",
    engine: "Crypto-AST",
    enabled: true,
    matches30d: 6,
    description:
      "Ensures signature verification enforces an explicit asymmetric algorithm allowlist.",
    exampleYaml: `id: CWE-347
severity: critical
algorithms: ["RS256", "EdDSA"]`,
  },
  {
    id: "RULE-204",
    name: "Path traversal root boundary guard",
    cwe: "CWE-22",
    category: "Security",
    severity: "High",
    engine: "Taint-FS",
    enabled: true,
    matches30d: 9,
    description:
      "Flags file system reads where `path.resolve` output is not verified against a static base directory.",
    exampleYaml: `id: CWE-22
severity: high
require_prefix_check: true`,
  },
  {
    id: "RULE-301",
    name: "Require composite index on foreign key migrations",
    cwe: "DB-301",
    category: "Performance",
    severity: "High",
    engine: "SQL-Plan",
    enabled: true,
    matches30d: 11,
    description:
      "Warns when new SQL foreign keys or tenant columns lack a supporting index.",
    exampleYaml: `id: DB-301
severity: high
check_migrations: true`,
  },
  {
    id: "RULE-402",
    name: "Unhandled promise rejection inside async jobs",
    cwe: "PROMISE-03",
    category: "Reliability",
    severity: "Medium",
    engine: "ControlFlow-TS",
    enabled: true,
    matches30d: 19,
    description:
      "Prevents fire-and-forget async worker dispatches without error handling or Inngest step wrappers.",
    exampleYaml: `id: PROMISE-03
severity: medium
enforce_await_or_catch: true`,
  },
  {
    id: "RULE-501",
    name: "Enforce kebab-case file naming convention",
    cwe: "STYLE-001",
    category: "Style",
    severity: "Low",
    engine: "Repo-Lint",
    enabled: false,
    matches30d: 27,
    description:
      "Checks that new service and component modules match lowercase kebab-case conventions.",
    exampleYaml: `id: STYLE-001
severity: low
pattern: "^[a-z0-9-]+\\\\.(ts|tsx)$"`,
  },
];

export const billingInvoices: InvoiceRecord[] = [
  {
    id: "INV-2026-11",
    period: "Nov 1 – Nov 30, 2026",
    description: "Enterprise Plan (25 seats, unlimited PR scans)",
    amount: "$490.00",
    status: "Paid",
    issuedAt: "Nov 01, 2026",
  },
  {
    id: "INV-2026-10",
    period: "Oct 1 – Oct 31, 2026",
    description: "Enterprise Plan (25 seats, unlimited PR scans)",
    amount: "$490.00",
    status: "Paid",
    issuedAt: "Oct 01, 2026",
  },
  {
    id: "INV-2026-09",
    period: "Sep 1 – Sep 30, 2026",
    description: "Enterprise Plan (20 seats, unlimited PR scans)",
    amount: "$390.00",
    status: "Paid",
    issuedAt: "Sep 01, 2026",
  },
  {
    id: "INV-2026-08",
    period: "Aug 1 – Aug 31, 2026",
    description: "Enterprise Plan (20 seats, unlimited PR scans)",
    amount: "$390.00",
    status: "Paid",
    issuedAt: "Aug 01, 2026",
  },
];

export const initialSupportTickets: SupportTicketRecord[] = [
  {
    id: "SUP-418",
    subject: "GitLab self-managed runner webhook TLS verification",
    category: "GitHub App",
    priority: "Normal",
    status: "In progress",
    updatedAt: "3 hours ago",
  },
  {
    id: "SUP-392",
    subject: "Enable SOC2 evidence bundle export on billing page",
    category: "Security",
    priority: "Low",
    status: "Resolved",
    updatedAt: "4 days ago",
  },
];

export const configSnippetYaml = `# .reviewpilot.yml — place in repository root
version: 2
reviews:
  auto_review: true
  fail_on_severity: high
  inline_patch_suggestions: true
ignore_paths:
  - "dist/**"
  - "**/*.generated.ts"
rules:
  enable_cwe_suite: true
  enforce_db_migration_indexes: true`;

export const cliSnippetBash = `# Install & run local diff inspection before pushing
npx @reviewpilot/cli scan --staged
npx @reviewpilot/cli check --rule-pack security-strict`;

export const webhookSnippetTs = `import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookSignature(payload: string, header: string, secret: string) {
  const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}`;

