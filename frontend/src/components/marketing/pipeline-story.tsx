"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMotionEnabled } from "@/src/lib/motion";
import { cn } from "@/lib/utils";
import {
  GitCommitIcon,
  CheckCircle2Icon,
  ShieldAlertIcon,
  TerminalIcon,
  GitPullRequestIcon,
  CpuIcon,
  CheckIcon,
} from "lucide-react";

interface StepDefinition {
  step: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const STEPS: StepDefinition[] = [
  {
    step: "01",
    title: "You push code",
    description:
      "ReviewPilot ingests a webhook on every push in under 20ms. Validates HMAC signatures and extracts the commit diff.",
    icon: GitCommitIcon,
    tag: "Webhook Ingestion",
  },
  {
    step: "02",
    title: "Deterministic AST scan",
    description:
      "Semgrep, ESLint, and gitleaks run concurrently across modified files and dependency graphs to pinpoint vulnerabilities.",
    icon: ShieldAlertIcon,
    tag: "Security Analysis",
  },
  {
    step: "03",
    title: "Sandbox test runner",
    description:
      "ReviewPilot spins up an ephemeral Docker container, applies the generated AST patch, and executes your real unit tests.",
    icon: CpuIcon,
    tag: "Isolated Verification",
  },
  {
    step: "04",
    title: "Tested PR ready to merge",
    description:
      "Only after 100% of sandbox checks pass, a clean pull request is opened. You review the diff and click merge.",
    icon: GitPullRequestIcon,
    tag: "GitHub Integration",
  },
];

export function MarketingPipelineStory() {
  const motionEnabled = useMotionEnabled();
  const [activeStep, setActiveStep] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [merged, setMerged] = React.useState(false);

  // Auto-advance step every 4.5s unless hovered or paused
  React.useEffect(() => {
    if (!motionEnabled || isPaused) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [motionEnabled, isPaused]);

  return (
    <section
      id="features"
      className="relative w-full py-16 sm:py-24 border-b border-border bg-background"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-12 flex flex-col gap-2 max-w-xl text-left">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            <span>Pipeline loop</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            From push to pull request in four deterministic steps
          </h2>
          <p className="font-body text-base text-muted-foreground leading-relaxed">
            Automated vulnerability remediation that executes real tests in an
            isolated sandbox before asking for your approval.
          </p>
        </div>

        {/* 2-Column Split: Interactive Step Cards Left, High-Fidelity Simulator Right */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Left Column (5 Cols): Clickable Step Cards with Progress Bars */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {STEPS.map((s, idx) => {
              const isActive = activeStep === idx;
              const Icon = s.icon;

              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col gap-2.5 relative overflow-hidden",
                    isActive
                      ? "border-primary/50 bg-card shadow-xs"
                      : "border-border bg-card/50 hover:bg-card hover:border-border/80 opacity-75 hover:opacity-100"
                  )}
                  aria-selected={isActive}
                  role="tab"
                >
                  {/* Active Step Progress Indicator on top border */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-7 rounded-md flex items-center justify-center font-mono text-xs font-bold transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <span className="font-heading font-semibold text-sm text-foreground">
                        {s.step}. {s.title}
                      </span>
                    </div>

                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0 h-4 font-mono"
                    >
                      {s.tag}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground font-body leading-relaxed pl-9">
                    {s.description}
                  </p>
                </button>
              );
            })}

            {/* Quick Helper Note */}
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1 pt-2">
              <span>Deterministic AST heuristics</span>
              <span>Click any step to inspect</span>
            </div>
          </div>

          {/* Right Column (7 Cols): High-Fidelity ReviewPilot Engine Console */}
          <div className="lg:col-span-7">
            <div className="w-full rounded-lg border border-border bg-card overflow-hidden shadow-none select-none flex flex-col min-h-[460px]">
              {/* Console Header Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 text-xs font-mono">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <div className="size-2.5 rounded-full bg-border" />
                    <div className="size-2.5 rounded-full bg-border" />
                    <div className="size-2.5 rounded-full bg-border" />
                  </div>
                  <span className="text-border">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-success" />
                    <span className="font-semibold text-foreground">
                      reviewpilot-engine-v2
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="hidden sm:inline">Worker: worker-us-east-04</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Exit: 0</span>
                </div>
              </div>

              {/* Console Stage Status Header */}
              <div className="px-5 py-2.5 border-b border-border bg-muted/10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">
                    STAGE {STEPS[activeStep].step}:
                  </span>
                  <span className="font-medium text-foreground">
                    {STEPS[activeStep].title.toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Step {activeStep + 1} of 4
                </span>
              </div>

              {/* Dynamic Stage Body */}
              <div className="flex-1 p-5 flex flex-col justify-center">
                {/* STAGE 1 VISUAL: Git Push Ingestion Stream */}
                {activeStep === 0 && (
                  <div className="flex flex-col gap-3.5 animate-in fade-in-50 duration-200">
                    <div className="rounded-md border border-border bg-background p-3.5 font-mono text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                        <TerminalIcon className="size-3.5" />
                        <span>git push stream</span>
                      </div>
                      <div className="text-muted-foreground">
                        $ git push origin main
                      </div>
                      <div className="text-foreground">
                        Counting objects: 7, done.
                      </div>
                      <div className="text-foreground">
                        Compressing objects: 100% (4/4), done.
                      </div>
                      <div className="text-foreground">
                        Writing objects: 100% (7/7), 1.42 KiB | 1.42 MiB/s, done.
                      </div>
                      <div className="text-success mt-1">
                        &nbsp;&nbsp;e14a28b..9f2c81a main -&gt; main
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-card p-4 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <GitCommitIcon className="size-4 text-foreground" />
                          <span className="font-semibold text-foreground">
                            commit 9f2c81a: feat(api): add dynamic customer filter
                          </span>
                        </div>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          +42 -8
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono pt-1">
                        <span>Author: alex@reviewpilot.io</span>
                        <span>main branch</span>
                      </div>
                      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
                        <span className="text-success flex items-center gap-1.5">
                          <CheckCircle2Icon className="size-3.5" />
                          GitHub webhook verified (HMAC SHA-256)
                        </span>
                        <span className="text-muted-foreground">Ingest: 18ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAGE 2 VISUAL: Deep AST Security Analysis */}
                {activeStep === 1 && (
                  <div className="flex flex-col gap-3.5 animate-in fade-in-50 duration-200 font-mono text-xs">
                    {/* Scanner Engine Metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded border border-border bg-muted/30 p-2.5 flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Semgrep OSS</span>
                        <span className="font-bold text-destructive">1 Match (CWE-89)</span>
                      </div>
                      <div className="rounded border border-border bg-muted/30 p-2.5 flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">ESLint Security</span>
                        <span className="font-bold text-success">Clean (0 rules)</span>
                      </div>
                      <div className="rounded border border-border bg-muted/30 p-2.5 flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground">Gitleaks</span>
                        <span className="font-bold text-success">No secrets leaked</span>
                      </div>
                    </div>

                    {/* Flagged Code Block with Highlighted Vulnerability */}
                    <div className="rounded-md border border-border bg-background overflow-hidden text-[11px]">
                      <div className="px-3 py-1.5 border-b border-border bg-muted/40 flex items-center justify-between text-muted-foreground">
                        <span>src/db/query-builder.ts</span>
                        <span className="text-destructive font-semibold">CWE-89 Vulnerability</span>
                      </div>
                      <div className="p-3 flex flex-col gap-1">
                        <div className="bg-destructive/15 text-destructive -mx-3 px-3 py-1 flex items-center justify-between font-semibold">
                          <span>- const q = `SELECT * FROM users WHERE id = $&#123;id&#125;`;</span>
                          <span className="text-[10px]">VULNERABLE</span>
                        </div>
                        <div className="bg-success/15 text-success -mx-3 px-3 py-1 flex items-center justify-between font-semibold">
                          <span>+ const q = sql`SELECT * FROM users WHERE id = $&#123;id&#125;`;</span>
                          <span className="text-[10px]">FIX PROPOSED</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded border border-border bg-card p-3 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-destructive" />
                        <span className="font-semibold text-foreground">
                          Direct SQL string interpolation flagged
                        </span>
                      </div>
                      <span className="text-muted-foreground">Scan duration: 210ms</span>
                    </div>
                  </div>
                )}

                {/* STAGE 3 VISUAL: Ephemeral Sandbox Runner */}
                {activeStep === 2 && (
                  <div className="flex flex-col gap-3.5 animate-in fade-in-50 duration-200 font-mono text-xs">
                    <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border pb-1.5">
                        <span>Ephemeral Sandbox ID: ephem-test-841</span>
                        <span className="text-success font-semibold">Isolated Docker container</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground pt-0.5">
                        Image: <span className="text-foreground">node:20-alpine</span> • CPU: 2 cores • RAM: 256MB
                      </div>
                    </div>

                    {/* Test Suite Checklist */}
                    <div className="rounded-md border border-border bg-muted/40 p-3.5 flex flex-col gap-2 text-[11px]">
                      <div className="flex items-center justify-between text-success">
                        <div className="flex items-center gap-2">
                          <CheckCircle2Icon className="size-3.5" />
                          <span>eslint --max-warnings=0</span>
                        </div>
                        <span>PASSED (110ms)</span>
                      </div>
                      <div className="flex items-center justify-between text-success">
                        <div className="flex items-center gap-2">
                          <CheckCircle2Icon className="size-3.5" />
                          <span>tsc --noEmit</span>
                        </div>
                        <span>PASSED (230ms)</span>
                      </div>
                      <div className="flex items-center justify-between text-success font-semibold">
                        <div className="flex items-center gap-2">
                          <CheckCircle2Icon className="size-3.5" />
                          <span>jest --ci (14/14 test suites, 62 unit tests)</span>
                        </div>
                        <span>PASSED (640ms)</span>
                      </div>
                    </div>

                    <div className="rounded border border-success/30 bg-success/5 p-3 flex items-center justify-between text-xs text-success font-medium">
                      <div className="flex items-center gap-2">
                        <CheckIcon className="size-4" />
                        <span>All sandbox tests passed with 100% assertions green</span>
                      </div>
                      <span className="font-mono text-[11px]">Safe to propose PR</span>
                    </div>
                  </div>
                )}

                {/* STAGE 4 VISUAL: Pull Request Ready to Merge */}
                {activeStep === 3 && (
                  <div className="flex flex-col gap-3.5 animate-in fade-in-50 duration-200">
                    <div className="rounded-md border border-border bg-card p-4 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="rounded bg-success/15 px-2 py-0.5 text-xs font-mono font-semibold text-success">
                            {merged ? "MERGED" : "OPEN"}
                          </span>
                          <span className="font-heading font-semibold text-sm text-foreground">
                            PR #128: fix(security): sanitize dynamic query in query-builder.ts
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          ReviewPilot[bot]
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                          reviewpilot:fix-cwe-89
                        </span>
                        <span>into</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                          main
                        </span>
                      </div>

                      <div className="rounded border border-border bg-muted/30 p-2.5 flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2Icon className="size-3.5" />
                          <span>All 3 checks passed (AST, Lint, Unit Tests)</span>
                        </div>
                        <span className="text-muted-foreground">1 file changed (+1 -1)</span>
                      </div>

                      {/* Interactive Merge Button */}
                      <div className="pt-1 flex items-center justify-between">
                        {merged ? (
                          <div className="inline-flex items-center gap-2 rounded-md bg-success/15 text-success px-4 py-2 text-xs font-mono font-semibold">
                            <CheckCircle2Icon className="size-4" />
                            <span>Merged into main via commit c8e12b</span>
                          </div>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setMerged(true)}
                            className="font-medium cursor-pointer"
                          >
                            <GitPullRequestIcon data-icon="inline-start" />
                            <span>Approve &amp; Merge pull request</span>
                          </Button>
                        )}

                        <span className="text-xs text-muted-foreground font-mono">
                          {merged ? "Closed & deployed" : "Awaiting your click"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Console Footer Status */}
              <div className="px-5 py-2.5 border-t border-border bg-muted/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span>ReviewPilot deterministic pipeline runtime</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => (prev - 1 + STEPS.length) % STEPS.length)}
                    className="hover:text-foreground cursor-pointer"
                  >
                    Previous
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => (prev + 1) % STEPS.length)}
                    className="hover:text-foreground cursor-pointer"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
