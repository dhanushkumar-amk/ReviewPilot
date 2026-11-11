"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  LayersIcon,
  PlayIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TerminalIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockLine,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Trace,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { useMotionEnabled } from "@/src/lib/motion";
import { HeroPoster } from "./hero-poster";

const DynamicHeroScene = dynamic(
  () => import("./hero-scene").then((mod) => mod.HeroScene),
  {
    ssr: false,
    loading: () => <HeroPoster animateOnMobile={false} />,
  }
);

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

type ScenarioId = "sqli" | "jwt" | "traversal";
type WorkstationTab = "diff" | "trace" | "pr";

interface HeroScenario {
  id: ScenarioId;
  shortLabel: string;
  cwe: string;
  cvss: string;
  severity: "Critical" | "High";
  title: string;
  summary: string;
  file: string;
  prNumber: number;
  branch: string;
  contextBefore: string[];
  removedLine: string;
  addedLine: string;
  contextAfter: string[];
  suiteName: string;
  suiteStats: string;
}

const HERO_SCENARIOS: Record<ScenarioId, HeroScenario> = {
  sqli: {
    id: "sqli",
    shortLabel: "SQL Injection",
    cwe: "CWE-89",
    cvss: "CVSS 9.8",
    severity: "Critical",
    title: "Unparameterized SQL string interpolation",
    summary:
      "User input `id` interpolates directly into a raw SQL template instead of using bound parameters.",
    file: "src/db/query-builder.ts",
    prNumber: 482,
    branch: "feat/search-filters",
    contextBefore: [
      "export async function findCustomerById(id: string) {",
      "  const db = getDatabasePool();",
    ],
    removedLine: "  const query = `SELECT * FROM customers WHERE id = '${id}'`;",
    addedLine: "  const query = Prisma.sql`SELECT * FROM customers WHERE id = ${id}`;",
    contextAfter: ["  return db.query(query);", "}"],
    suiteName: "vitest run src/db/query-builder.test.ts",
    suiteStats: "14/14 assertions passed (412ms)",
  },
  jwt: {
    id: "jwt",
    shortLabel: "JWT Alg Bypass",
    cwe: "CWE-347",
    cvss: "CVSS 9.1",
    severity: "Critical",
    title: "JWT verifier accepts unsigned algorithm fallback",
    summary:
      "`jwtVerify` lacks an explicit `algorithms` allowlist, permitting `alg: none` tokens.",
    file: "src/auth/jwt-verifier.ts",
    prNumber: 119,
    branch: "fix/session-rotation",
    contextBefore: [
      "export async function verifySessionJwt(token: string) {",
      "  const publicKey = await getWorkspacePublicKey();",
    ],
    removedLine: "  return jwtVerify(token, publicKey);",
    addedLine: "  return jwtVerify(token, publicKey, { algorithms: ['RS256'] });",
    contextAfter: ["}"],
    suiteName: "vitest run src/auth/jwt-verifier.test.ts",
    suiteStats: "19/19 security specs passed (328ms)",
  },
  traversal: {
    id: "traversal",
    shortLabel: "Path Traversal",
    cwe: "CWE-22",
    cvss: "CVSS 8.6",
    severity: "High",
    title: "Asset route joins untrusted path without root guard",
    summary:
      "Normalized `../` segments escape `PUBLIC_ROOT` unless validated with `path.resolve` prefix guard.",
    file: "src/api/static-assets.ts",
    prNumber: 304,
    branch: "chore/cdn-fallback",
    contextBefore: [
      "export function resolveAssetPath(requested: string) {",
      "  const target = path.resolve(PUBLIC_ROOT, requested);",
    ],
    removedLine: "  return fs.createReadStream(target);",
    addedLine:
      "  if (!target.startsWith(`${PUBLIC_ROOT}${path.sep}`)) throw new ForbiddenError();",
    contextAfter: ["  return fs.createReadStream(target);", "}"],
    suiteName: "vitest run src/api/static-assets.test.ts",
    suiteStats: "11/11 boundary checks passed (264ms)",
  },
};

export function MarketingHero() {
  const motionEnabled = useMotionEnabled();
  const [viewMode, setViewMode] = React.useState<"console" | "3d">("console");
  const [scenarioId, setScenarioId] = React.useState<ScenarioId>("sqli");
  const [activeTab, setActiveTab] = React.useState<WorkstationTab>("diff");
  const [mergedIds, setMergedIds] = React.useState<Record<string, boolean>>({});
  const [replayKey, setReplayKey] = React.useState(0);
  const [cliCopied, setCliCopied] = React.useState(false);

  const scenario = HERO_SCENARIOS[scenarioId];
  const isMerged = Boolean(mergedIds[scenario.id]);

  // Subtle auto-progression on initial load until user interacts
  const [userInteracted, setUserInteracted] = React.useState(false);
  React.useEffect(() => {
    if (!motionEnabled || userInteracted || viewMode !== "console") return;
    const timer = setInterval(() => {
      setActiveTab((prev) =>
        prev === "diff" ? "trace" : prev === "trace" ? "pr" : "diff"
      );
    }, 5200);
    return () => clearInterval(timer);
  }, [motionEnabled, userInteracted, viewMode]);

  const handleCopyCli = () => {
    navigator.clipboard
      ?.writeText("npx @reviewpilot/cli scan --staged")
      .then(() => {
        setCliCopied(true);
        setTimeout(() => setCliCopied(false), 1800);
      })
      .catch(() => {});
  };

  const handleSelectScenario = (nextId: ScenarioId) => {
    setUserInteracted(true);
    setViewMode("console");
    setScenarioId(nextId);
    setActiveTab("diff");
  };

  const handleResetDemo = () => {
    setUserInteracted(true);
    setMergedIds({});
    setActiveTab("diff");
    setReplayKey((k) => k + 1);
  };

  return (
    <section
      id="hero-section"
      className="relative w-full overflow-hidden border-b border-border bg-background pt-10 pb-16 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24"
    >
      {/* Subtle Architectural Blueprint Grid */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-35 dark:opacity-20"
        aria-hidden="true"
      >
        <svg className="h-full w-full text-border" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="hero-grid-pattern"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left Column (5 cols): Editorial Headline, Actions & Metrics */}
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-card font-mono">
                <span
                  className="size-1.5 rounded-full bg-success"
                  aria-hidden="true"
                />
                ReviewPilot v2.4
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Deterministic AST + Sandbox
              </Badge>
            </div>

            <div className="flex flex-col gap-4">
              <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Scan every push.{" "}
                <span className="text-primary">Block risky diffs</span> before
                they merge.
              </h1>
              <p className="font-body text-base leading-relaxed text-muted-foreground sm:text-lg">
                ReviewPilot inspects every commit with deterministic CWE rules,
                proves each patch inside an isolated test sandbox, and opens a
                clean pull request for your final sign-off.
              </p>
            </div>

            {/* Primary CTA + Secondary Workbench Link */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                render={<Link href="/sign-up" />}
                nativeButton={false}
              >
                <GithubMark />
                Connect GitHub
              </Button>
              <Button
                variant="outline"
                size="lg"
                render={<Link href="/findings" />}
                nativeButton={false}
              >
                <TerminalIcon data-icon="inline-start" />
                Live workbench
              </Button>
            </div>

            {/* Interactive CLI Quickstart Pill */}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-primary">$</span>
                <span className="truncate text-foreground">
                  npx @reviewpilot/cli scan --staged
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Copy CLI command"
                onClick={handleCopyCli}
              >
                {cliCopied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </div>

            {/* Trust Assurances */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2Icon className="size-3.5 text-success" />
                Free for 1 repository
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2Icon className="size-3.5 text-success" />
                Isolated test sandboxes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2Icon className="size-3.5 text-success" />
                Human merge gate
              </span>
            </div>

            {/* Compact Telemetry Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <Card size="sm">
                <CardHeader>
                  <CardDescription className="text-xs">Ingest</CardDescription>
                  <CardTitle className="font-mono text-lg tabular-nums">
                    &lt; 20ms
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription className="text-xs">Tests</CardDescription>
                  <CardTitle className="font-mono text-lg text-success tabular-nums">
                    100%
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardDescription className="text-xs">Auto-merge</CardDescription>
                  <CardTitle className="font-mono text-lg tabular-nums">
                    Never
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Right Column (7 cols): Interactive PR Security Workstation */}
          <div
            className="flex min-w-0 flex-col gap-3 lg:col-span-7"
            onMouseEnter={() => setUserInteracted(true)}
          >
            {/* Top Controls: Scenario Switcher & 3D Topology Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ToggleGroup
                variant="outline"
                size="sm"
                value={[scenarioId]}
                onValueChange={(next) => {
                  if (next[0]) handleSelectScenario(next[0] as ScenarioId);
                }}
              >
                <ToggleGroupItem value="sqli">SQL Injection</ToggleGroupItem>
                <ToggleGroupItem value="jwt">JWT Alg Bypass</ToggleGroupItem>
                <ToggleGroupItem value="traversal">Path Traversal</ToggleGroupItem>
              </ToggleGroup>

              <div className="flex items-center gap-1.5">
                <ToggleGroup
                  variant="outline"
                  size="sm"
                  value={[viewMode]}
                  onValueChange={(next) => {
                    if (next[0]) {
                      setUserInteracted(true);
                      setViewMode(next[0] as "console" | "3d");
                    }
                  }}
                >
                  <ToggleGroupItem value="console">Workstation</ToggleGroupItem>
                  <ToggleGroupItem value="3d">
                    <LayersIcon />
                    <span className="hidden sm:inline">3D View</span>
                  </ToggleGroupItem>
                </ToggleGroup>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reset hero workstation demo"
                  onClick={handleResetDemo}
                >
                  <RotateCcwIcon />
                </Button>
              </div>
            </div>

            {viewMode === "3d" ? (
              <Card className="overflow-hidden p-0">
                <CardHeader className="border-b bg-muted/30">
                  <CardTitle className="font-mono text-xs">
                    3D Repository AST Scan Topology
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    Live spatial sweep across 6 modules
                  </CardDescription>
                  <CardAction>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setViewMode("console")}
                    >
                      Back to workstation
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex min-h-[420px] items-center justify-center">
                    <DynamicHeroScene replayKey={replayKey} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <GitBranchIcon className="size-3.5 text-muted-foreground" />
                      <span className="font-semibold text-foreground">
                        acme-corp/api-gateway
                      </span>
                      <span className="text-muted-foreground">
                        · {scenario.branch}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        PR #{scenario.prNumber}
                      </Badge>
                      <Badge
                        variant={
                          isMerged
                            ? "success"
                            : scenario.severity === "Critical"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {isMerged ? "Merged" : `${scenario.cwe} Blocked`}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="sr-only">
                    {scenario.title}
                  </CardTitle>
                  <CardDescription className="sr-only">
                    {scenario.summary}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
                      setUserInteracted(true);
                      setActiveTab(value as WorkstationTab);
                    }}
                    className="gap-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <TabsList>
                        <TabsTrigger value="diff">1. Diff &amp; Patch</TabsTrigger>
                        <TabsTrigger value="trace">
                          2. Sandbox Trace
                        </TabsTrigger>
                        <TabsTrigger value="pr">3. PR Gate</TabsTrigger>
                      </TabsList>
                      <span className="font-mono text-xs text-muted-foreground">
                        {scenario.cvss}
                      </span>
                    </div>

                    {/* TAB 1: DIFF & PATCH */}
                    <TabsContent value="diff" className="flex flex-col gap-3.5">
                      <Alert variant="destructive">
                        <ShieldAlertIcon />
                        <AlertTitle>{scenario.title}</AlertTitle>
                        <AlertDescription>{scenario.summary}</AlertDescription>
                      </Alert>

                      <CodeBlock size="sm">
                        <CodeBlockHeader>
                          <CodeBlockTitle className="font-mono">
                            {scenario.file}
                          </CodeBlockTitle>
                          <CodeBlockActions>
                            <CodeBlockCopyButton value={scenario.addedLine} />
                          </CodeBlockActions>
                        </CodeBlockHeader>
                        <CodeBlockContent>
                          {scenario.contextBefore.map((line) => (
                            <CodeBlockLine key={line}>{line}</CodeBlockLine>
                          ))}
                          <CodeBlockLine variant="removed">
                            {scenario.removedLine}
                          </CodeBlockLine>
                          <CodeBlockLine className="bg-success/10 text-success after:text-success after:content-['+']">
                            {scenario.addedLine}
                          </CodeBlockLine>
                          {scenario.contextAfter.map((line) => (
                            <CodeBlockLine key={line}>{line}</CodeBlockLine>
                          ))}
                        </CodeBlockContent>
                      </CodeBlock>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Deterministic patch verified against TypeScript AST
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setUserInteracted(true);
                            setActiveTab("trace");
                          }}
                        >
                          <PlayIcon data-icon="inline-start" />
                          Run sandbox tests
                        </Button>
                      </div>
                    </TabsContent>

                    {/* TAB 2: SANDBOX TRACE */}
                    <TabsContent value="trace" className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-medium text-foreground">
                            Container: ephem-runner-492 (zero egress)
                          </span>
                          <Badge variant="success">Verified</Badge>
                        </div>
                        <Progress value={100} />
                      </div>

                      <Trace>
                        <TraceLine>
                          <TraceIcon className="text-success">
                            <CheckCircle2Icon />
                          </TraceIcon>
                          <TraceTitle>
                            Applied AST patch to {scenario.file}
                          </TraceTitle>
                          <TraceDescription>12ms</TraceDescription>
                        </TraceLine>
                        <TraceLine>
                          <TraceIcon className="text-success">
                            <CheckCircle2Icon />
                          </TraceIcon>
                          <TraceTitle>
                            Re-ran {scenario.cwe} static taint check (0 violations)
                          </TraceTitle>
                          <TraceDescription>84ms</TraceDescription>
                        </TraceLine>
                        <TraceLine>
                          <TraceIcon className="text-success">
                            <CheckCircle2Icon />
                          </TraceIcon>
                          <TraceTitle>
                            tsc --noEmit &amp; eslint --max-warnings=0
                          </TraceTitle>
                          <TraceDescription>195ms</TraceDescription>
                        </TraceLine>
                        <TraceLine>
                          <TraceIcon className="text-success">
                            <CheckCircle2Icon />
                          </TraceIcon>
                          <TraceTitle>{scenario.suiteName}</TraceTitle>
                          <TraceDescription>
                            {scenario.suiteStats}
                          </TraceDescription>
                        </TraceLine>
                      </Trace>

                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                          <ShieldCheckIcon className="size-4" />
                          Safe to propose pull request
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setUserInteracted(true);
                            setActiveTab("pr");
                          }}
                        >
                          Inspect PR #{scenario.prNumber}
                        </Button>
                      </div>
                    </TabsContent>

                    {/* TAB 3: PR GATE */}
                    <TabsContent value="pr" className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="success">
                              {isMerged ? "MERGED" : "READY"}
                            </Badge>
                            <span className="font-heading text-sm font-semibold text-foreground">
                              fix({scenario.cwe}): {scenario.title}
                            </span>
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            ReviewPilot[bot]
                          </span>
                        </div>

                        <Separator />

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 text-success">
                            <CheckCircle2Icon className="size-3.5" />
                            AST, ESLint, TypeScript, and unit tests all passing
                          </span>
                          <span className="font-mono text-muted-foreground">
                            1 file ·{" "}
                            <span className="text-success">+1</span>{" "}
                            <span className="text-destructive">-1</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          {isMerged ? (
                            <Badge variant="success">
                              <CheckCircle2Icon data-icon="inline-start" />
                              Merged into main
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setUserInteracted(true);
                                setMergedIds((prev) => ({
                                  ...prev,
                                  [scenario.id]: true,
                                }));
                              }}
                            >
                              <GitPullRequestIcon data-icon="inline-start" />
                              Approve &amp; Merge PR #{scenario.prNumber}
                            </Button>
                          )}
                          <span className="font-mono text-xs text-muted-foreground">
                            {isMerged
                              ? "Production branch protected"
                              : "Awaiting human review"}
                          </span>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>

                <CardFooter className="justify-between text-xs text-muted-foreground">
                  <span className="font-mono">
                    Semgrep + TypeScript AST + Gitleaks
                  </span>
                  <span className="font-mono">
                    Zero source retention
                  </span>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
