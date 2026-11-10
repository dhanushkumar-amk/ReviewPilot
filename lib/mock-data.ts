export type Severity = "Critical" | "High" | "Medium" | "Low";
export type FindingStatus = "Open" | "Triaged" | "In progress";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  file: string;
  status: FindingStatus;
  ruleId: string;
}

export const mockFindings: Finding[] = [
  {
    id: "SEC-101",
    severity: "Critical",
    title: "SQL injection in dynamic filter builder",
    file: "src/db/query-builder.ts",
    status: "Open",
    ruleId: "CWE-89",
  },
  {
    id: "SEC-102",
    severity: "Critical",
    title: "Hardcoded bearer authentication token",
    file: "src/services/webhook-client.ts",
    status: "Open",
    ruleId: "CWE-798",
  },
  {
    id: "SEC-103",
    severity: "Critical",
    title: "Server-side request forgery (SSRF) in fetch preview",
    file: "src/api/routes/preview.ts",
    status: "Open",
    ruleId: "CWE-918",
  },
  {
    id: "PERF-201",
    severity: "High",
    title: "Unbounded in-memory queue without backpressure",
    file: "src/queue/event-worker.ts",
    status: "Triaged",
    ruleId: "PERF-014",
  },
  {
    id: "SEC-202",
    severity: "High",
    title: "Permissive CORS origin configuration wildcard",
    file: "src/middleware/cors.ts",
    status: "Open",
    ruleId: "CWE-942",
  },
  {
    id: "CODE-301",
    severity: "Medium",
    title: "Unchecked return error in asynchronous transaction",
    file: "src/repos/user-repository.ts",
    status: "In progress",
    ruleId: "LINT-402",
  },
  {
    id: "CODE-302",
    severity: "Medium",
    title: "Deprecated crypto cipher algorithm used",
    file: "src/utils/encryption.ts",
    status: "Triaged",
    ruleId: "CWE-327",
  },
  {
    id: "STYLE-401",
    severity: "Low",
    title: "Missing readonly constraint on interface members",
    file: "src/types/findings.ts",
    status: "Open",
    ruleId: "TS-501",
  },
];
