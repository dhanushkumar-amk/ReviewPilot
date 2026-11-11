"use client";

import * as React from "react";
import {
  ActivityIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CpuIcon,
  GitCommitIcon,
  GitPullRequestIcon,
  LockIcon,
  PauseIcon,
  PlayIcon,
  ShieldCheckIcon,
  WebhookIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
  CodeBlockTitle,
} from "@/components/ui/code-block";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { useMotionEnabled } from "@/src/lib/motion";
import { cn } from "@/lib/utils";

interface PipelineStage {
  index: number;
  code: string;
  title: string;
  tag: string;
  latency: string;
  progressPct: number;
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  inputContract: string;
  guarantee: string;
  outputContract: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    index: 0,
    code: "01",
    title: "Signed webhook ingest",
    tag: "Edge Gateway",
    latency: "18ms",
    progressPct: 25,
    icon: WebhookIcon,
    summary:
      "Every push and pull request event is validated via timing-safe HMAC SHA-256 verification before queuing.",
    inputContract: "GitHub / GitLab webhook payload",
    guarantee: "Rejects unsigned deliveries & respects .reviewpilot.yml globs",
    outputContract: "Durable Inngest job dispatched",
  },
  {
    index: 1,
    code: "02",
    title: "Parallel engine sweep",
    tag: "Static + Taint",
    latency: "210ms",
    progressPct: 50,
    icon: CpuIcon,
    summary:
      "Semgrep OSS, TypeScript call-graph analysis, and Gitleaks run concurrently on modified diff hunks only.",
    inputContract: "Shallow diff & AST dependency slice",
    guarantee: "Secrets & bearer tokens masked before any patch synthesis",
    outputContract: "Normalized CWE findings list",
  },
  {
    index: 2,
    code: "03",
    title: "Zero-egress sandbox",
    tag: "Test Runner",
    latency: "980ms",
    progressPct: 75,
    icon: LockIcon,
    summary:
      "Candidate patches run inside an ephemeral container with blocked outbound network to prove real tests stay green.",
    inputContract: "Scoped AST patch diff",
    guarantee: "No network egress; container wiped right after test exit",
    outputContract: "Verified lint, typecheck & test log",
  },
  {
    index: 3,
    code: "04",
    title: "PR check & human gate",
    tag: "Merge Policy",
    latency: "45ms",
    progressPct: 100,
    icon: GitPullRequestIcon,
    summary:
      "ReviewPilot posts signed GitHub check runs and inline diff annotations. Your team decides when to merge.",
    inputContract: "Passing sandbox test artifacts",
    guarantee: "Zero unreviewed commits pushed to protected branches",
    outputContract: "Check Run + Pull Request Ready",
  },
];

const WEBHOOK_PAYLOAD = `{
  "event": "pull_request.synchronize",
  "repository": "reviewpilot/auth",
  "commit": "4e902ab",
  "signature_verified": true,
  "policy": "security-strict"
}`;

export function MarketingPipelineStory() {
  const motionEnabled = useMotionEnabled();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = React.useState(true);
  const [simulatedPass, setSimulatedPass] = React.useState(true);

  React.useEffect(() => {
    if (!motionEnabled || !isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PIPELINE_STAGES.length);
    }, 4800);
    return () => clearInterval(timer);
  }, [motionEnabled, isAutoPlaying]);

  const stage = PIPELINE_STAGES[activeIndex];

  const handleSelectStage = (index: number) => {
    setIsAutoPlaying(false);
    setActiveIndex(index);
  };

  return (
    <section
      id="features"
      className="w-full border-b border-border bg-background py-16 sm:py-24"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                <ActivityIcon data-icon="inline-start" />
                Execution Architecture
              </Badge>
              <Badge variant="secondary" className="font-mono">
                Inngest Orchestrated
              </Badge>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Four deterministic stages from webhook to verified check run
            </h2>
            <p className="font-body text-base leading-relaxed text-muted-foreground">
              Every step enforces strict isolation boundaries and verifiable
              outputs before a single suggestion reaches your pull request.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-end">
            <ButtonGroup>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleSelectStage(
                    (activeIndex - 1 + PIPELINE_STAGES.length) %
                      PIPELINE_STAGES.length
                  )
                }
                aria-label="Previous pipeline stage"
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAutoPlaying((prev) => !prev)}
                aria-label={isAutoPlaying ? "Pause auto-cycle" : "Play auto-cycle"}
              >
                {isAutoPlaying ? (
                  <PauseIcon data-icon="inline-start" />
                ) : (
                  <PlayIcon data-icon="inline-start" />
                )}
                {isAutoPlaying ? "Auto" : "Paused"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleSelectStage((activeIndex + 1) % PIPELINE_STAGES.length)
                }
                aria-label="Next pipeline stage"
              >
                <ChevronRightIcon />
              </Button>
            </ButtonGroup>
          </div>
        </div>

        {/* Horizontal 4-Stage Stepper Grid */}
        <div
          role="tablist"
          aria-label="ReviewPilot pipeline stages"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PIPELINE_STAGES.map((item) => {
            const isActive = item.index === activeIndex;
            const Icon = item.icon;

            return (
              <button
                key={item.code}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelectStage(item.index)}
                className={cn(
                  "group flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer",
                  isActive
                    ? "border-primary bg-card"
                    : "border-border bg-card/60 hover:bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg border transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <Badge
                    variant={isActive ? "default" : "outline"}
                    className="font-mono"
                  >
                    {item.latency}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    Stage {item.code} · {item.tag}
                  </span>
                  <span className="font-heading text-sm font-semibold text-foreground">
                    {item.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Inspector Split: Contract Guarantees + Live Worker Output */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left (5 cols): Stage Contract & Boundary Guarantees */}
          <Card className="flex min-w-0 flex-col lg:col-span-5">
            <CardHeader className="border-b">
              <CardDescription className="font-mono">
                Stage {stage.code} · {stage.tag}
              </CardDescription>
              <CardTitle>{stage.title}</CardTitle>
              <CardAction>
                <Badge variant="outline" className="font-mono">
                  {stage.latency}
                </Badge>
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4 pt-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {stage.summary}
              </p>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Pipeline progress
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {stage.progressPct}%
                  </span>
                </div>
                <Progress value={stage.progressPct} />
              </div>

              <Separator />

              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/30 p-2.5">
                  <span className="font-mono text-muted-foreground">
                    INPUT
                  </span>
                  <span className="font-medium text-foreground">
                    {stage.inputContract}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/30 p-2.5">
                  <span className="font-mono text-muted-foreground">
                    SECURITY GUARANTEE
                  </span>
                  <span className="font-medium text-foreground">
                    {stage.guarantee}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/30 p-2.5">
                  <span className="font-mono text-muted-foreground">
                    OUTPUT
                  </span>
                  <span className="font-medium text-success">
                    {stage.outputContract}
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="justify-between text-xs text-muted-foreground">
              <span>Step {stage.index + 1} of 4</span>
              <span className="font-mono">Deterministic execution</span>
            </CardFooter>
          </Card>

          {/* Right (7 cols): Live Stage Payload & Worker Output */}
          <Card className="flex min-w-0 flex-col lg:col-span-7">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="size-2 rounded-full bg-success" />
                  <span className="font-semibold text-foreground">
                    worker-us-east-04
                  </span>
                  <span className="text-muted-foreground">· job SCN-8942</span>
                </div>
                <Badge variant="success">Exit 0</Badge>
              </div>
              <CardTitle className="sr-only">
                Worker telemetry for {stage.title}
              </CardTitle>
              <CardDescription className="sr-only">
                Live execution output for stage {stage.code}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col justify-center gap-4 pt-4">
              {/* Stage 01 View */}
              {activeIndex === 0 ? (
                <div className="flex flex-col gap-4">
                  <CodeBlock size="sm">
                    <CodeBlockHeader>
                      <CodeBlockTitle className="font-mono">
                        POST /webhooks/github (verified)
                      </CodeBlockTitle>
                      <CodeBlockActions>
                        <CodeBlockCopyButton value={WEBHOOK_PAYLOAD} />
                      </CodeBlockActions>
                    </CodeBlockHeader>
                    <CodeBlockContent lineNumbers>
                      {WEBHOOK_PAYLOAD}
                    </CodeBlockContent>
                  </CodeBlock>

                  <Alert>
                    <ShieldCheckIcon />
                    <AlertTitle>HMAC SHA-256 signature valid</AlertTitle>
                    <AlertDescription>
                      Matched `.reviewpilot.yml` ruleset in 18ms and enqueued
                      incremental diff analysis via Inngest.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}

              {/* Stage 02 View */}
              {activeIndex === 1 ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Card size="sm">
                      <CardHeader>
                        <CardDescription className="font-mono text-xs">
                          Semgrep CWE
                        </CardDescription>
                        <CardTitle className="text-base text-destructive">
                          1 flagged
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card size="sm">
                      <CardHeader>
                        <CardDescription className="font-mono text-xs">
                          TypeScript AST
                        </CardDescription>
                        <CardTitle className="text-base text-success">
                          Type-safe
                        </CardTitle>
                      </CardHeader>
                    </Card>
                    <Card size="sm">
                      <CardHeader>
                        <CardDescription className="font-mono text-xs">
                          Gitleaks
                        </CardDescription>
                        <CardTitle className="text-base text-success">
                          0 secrets
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </div>

                  <Trace>
                    <TraceCollapsible defaultOpen>
                      <TraceCollapsibleTrigger>
                        <TraceLine>
                          <TraceIcon className="text-primary">
                            <GitCommitIcon />
                          </TraceIcon>
                          <TraceTitle>
                            Concurrent fan-out across 29 changed files
                          </TraceTitle>
                          <TraceDescription>210ms</TraceDescription>
                        </TraceLine>
                      </TraceCollapsibleTrigger>
                      <TraceCollapsibleContent>
                        Isolated taint sink in{" "}
                        <span className="font-mono text-foreground">
                          src/api/routes/auth.ts:84
                        </span>{" "}
                        and masked 2 environment variables prior to generating
                        candidate patch.
                      </TraceCollapsibleContent>
                    </TraceCollapsible>
                  </Trace>
                </div>
              ) : null}

              {/* Stage 03 View */}
              {activeIndex === 2 ? (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <span className="font-mono text-muted-foreground">
                        Network
                      </span>
                      <p className="mt-1 font-medium text-foreground">
                        Egress blocked
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <span className="font-mono text-muted-foreground">
                        Filesystem
                      </span>
                      <p className="mt-1 font-medium text-foreground">
                        Ephemeral tmpfs
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <span className="font-mono text-muted-foreground">
                        Teardown
                      </span>
                      <p className="mt-1 font-medium text-success">
                        Wiped on exit
                      </p>
                    </div>
                  </div>

                  <Trace>
                    <TraceLine>
                      <TraceIcon className="text-success">
                        <CheckCircle2Icon />
                      </TraceIcon>
                      <TraceTitle>
                        Applied candidate patch cleanly without conflicts
                      </TraceTitle>
                      <TraceDescription>14ms</TraceDescription>
                    </TraceLine>
                    <TraceLine>
                      <TraceIcon className="text-success">
                        <CheckCircle2Icon />
                      </TraceIcon>
                      <TraceTitle>
                        npx tsc --noEmit &amp;&amp; npm run lint
                      </TraceTitle>
                      <TraceDescription>312ms</TraceDescription>
                    </TraceLine>
                    <TraceLine>
                      <TraceIcon className="text-success">
                        <CheckCircle2Icon />
                      </TraceIcon>
                      <TraceTitle>
                        vitest run — 42/42 integration specs passing
                      </TraceTitle>
                      <TraceDescription>654ms</TraceDescription>
                    </TraceLine>
                  </Trace>
                </div>
              ) : null}

              {/* Stage 04 View */}
              {activeIndex === 3 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={simulatedPass ? "success" : "destructive"}
                        >
                          {simulatedPass ? "Checks passed" : "Merge blocked"}
                        </Badge>
                        <span className="font-mono text-xs text-foreground">
                          ReviewPilot / Security Gate
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setSimulatedPass((v) => !v)}
                      >
                        Toggle simulation
                      </Button>
                    </div>
                    <Separator />
                    <p className="text-sm text-muted-foreground">
                      {simulatedPass
                        ? "All blocking policies resolved and sandbox tests verified. Pull request #119 is cleared for developer approval."
                        : "Critical finding unresolved. GitHub Branch Protection blocks merge until suggested patch is accepted."}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>

            <CardFooter className="justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5 text-success" />
                Zero unmasked secrets ever leave worker memory
              </span>
              <span className="font-mono">SLA p95 &lt; 1.5s</span>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
