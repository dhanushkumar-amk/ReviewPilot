"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import {
  GitCommitIcon,
  CheckCircle2Icon,
  FileCodeIcon,
  FolderIcon,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    step: "01",
    title: "You push code",
    description:
      "ReviewPilot gets a webhook for every push to a connected repository.",
  },
  {
    step: "02",
    title: "It scans what changed",
    description:
      "Semgrep, ESLint, and gitleaks check changed files and the files that depend on them.",
  },
  {
    step: "03",
    title: "You review the findings",
    description:
      "Each finding shows the file, the line, why it matters, and a suggested fix. Accept or reject.",
  },
  {
    step: "04",
    title: "A tested fix becomes a pull request",
    description:
      "Approved fixes run lint and tests in a sandbox. If they pass, ReviewPilot opens a pull request. You click Merge.",
  },
];

export function MarketingPipelineStory() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isDesktop = window.innerWidth >= 1024;

    if (prefersReducedMotion || !isDesktop) {
      // Static fallback on mobile or reduced motion
      return;
    }

    const ctx = gsap.context(() => {
      // Pin right stage and drive activeStep from scroll scrub
      ScrollTrigger.create({
        trigger: container,
        start: "top top+=70",
        end: "+=300%",
        pin: stage,
        pinSpacing: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const progress = self.progress;
          const stepIndex = Math.min(
            3,
            Math.floor(progress * 4)
          );
          setActiveStep(stepIndex);
        },
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="features"
      ref={containerRef}
      className="relative w-full py-16 sm:py-24 border-b border-border bg-background"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="mb-12 flex flex-col gap-2 max-w-xl">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Pipeline loop
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            From push to pull request
          </h2>
          <p className="font-body text-base text-muted-foreground">
            Automated verification without surrender of developer control.
          </p>
        </div>

        {/* 2-Column Layout: Left Steps Scroll, Right Stage Pinned */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
          {/* Left Column (5 Cols): Progress Rail & Steps */}
          <div className="lg:col-span-5 relative flex gap-6">
            {/* Vertical Progress Rail */}
            <div
              className="relative flex flex-col items-center select-none"
              aria-hidden="true"
            >
              <div className="w-px h-full bg-border" />
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute size-3 rounded-full border border-card transition-colors duration-200",
                    i <= activeStep ? "bg-foreground" : "bg-border"
                  )}
                  style={{ top: `${i * 25 + 3}%` }}
                />
              ))}
            </div>

            {/* Steps Text Stack */}
            <div className="flex flex-col gap-20 sm:gap-28 py-2 w-full">
              {STEPS.map((s, idx) => {
                const isActive = activeStep === idx;
                return (
                  <div
                    key={s.step}
                    className={cn(
                      "flex flex-col gap-2.5 transition-opacity duration-200",
                      isActive ? "opacity-100" : "opacity-40"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">
                        {s.step}
                      </span>
                      <span className="h-px w-6 bg-border" />
                    </div>
                    <h3 className="font-heading text-xl sm:text-2xl font-semibold text-foreground">
                      {s.title}
                    </h3>
                    <p className="font-body text-sm sm:text-base leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (7 Cols): Pinned Morphing Stage */}
          <div className="lg:col-span-7">
            <div
              ref={stageRef}
              className="w-full rounded-lg border border-border bg-card p-5 sm:p-6 min-h-[380px] sm:min-h-[440px] flex flex-col justify-between shadow-none select-none"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary" />
                  <span className="font-semibold text-foreground">
                    STAGE {activeStep + 1}: {STEPS[activeStep].title.toUpperCase()}
                  </span>
                </div>
                <span>reviewpilot-worker-pool</span>
              </div>

              {/* Dynamic Morphing Stage Body */}
              <div className="flex-1 py-5 flex items-center justify-center">
                {/* STEP 1 VISUAL: Commit row slides in */}
                {activeStep === 0 && (
                  <div className="w-full max-w-md flex flex-col gap-2.5 animate-in fade-in-50 duration-200">
                    <div className="rounded-md border border-border bg-muted/40 p-3 flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <GitCommitIcon className="size-4 text-foreground" />
                        <span className="text-foreground font-semibold">
                          commit 9f2c81a
                        </span>
                      </div>
                      <span>main • 4s ago</span>
                    </div>
                    <div className="rounded-md border border-border bg-card p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          feat: add dynamic customer filtering
                        </span>
                        <span className="font-mono text-muted-foreground text-[11px]">
                          +42 -8
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        Author: alex@reviewpilot.io
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border">
                        <span className="size-2 rounded-full bg-success" />
                        <span>Webhook received and acknowledged in 18ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 VISUAL: File tree with changed files highlighted & scan progress */}
                {activeStep === 1 && (
                  <div className="w-full max-w-md flex flex-col gap-3 animate-in fade-in-50 duration-200">
                    <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-2 font-mono text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                        <FolderIcon className="size-3.5" />
                        <span>src/</span>
                      </div>
                      <div className="pl-4 flex flex-col gap-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <FileCodeIcon className="size-3" />
                            <span>services/client.ts</span>
                          </div>
                          <span className="text-muted-foreground/60">unchanged</span>
                        </div>
                        <div className="flex items-center justify-between rounded bg-primary/10 px-1.5 py-0.5 text-foreground font-medium">
                          <div className="flex items-center gap-1.5">
                            <FileCodeIcon className="size-3 text-primary" />
                            <span>db/query-builder.ts</span>
                          </div>
                          <span className="text-primary text-[10px] font-semibold">
                            CHANGED
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded bg-primary/10 px-1.5 py-0.5 text-foreground font-medium">
                          <div className="flex items-center gap-1.5">
                            <FileCodeIcon className="size-3 text-primary" />
                            <span>services/webhook.ts</span>
                          </div>
                          <span className="text-primary text-[10px] font-semibold">
                            CHANGED
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar filling */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span>AST rules (Semgrep + ESLint + gitleaks)</span>
                        <span>100% complete</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-full bg-foreground rounded-full" />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 VISUAL: Three finding rows with severity badges */}
                {activeStep === 2 && (
                  <div className="w-full max-w-md flex flex-col divide-y divide-border rounded-md border border-border bg-card overflow-hidden animate-in fade-in-50 duration-200">
                    <div className="p-3 bg-muted/40 flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span>3 diagnostics reported</span>
                      <span className="text-destructive font-semibold">
                        Action required
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-destructive">
                          CRITICAL
                        </span>
                        <span className="font-medium text-foreground">
                          SQL injection in dynamic query
                        </span>
                      </div>
                      <span className="font-mono text-muted-foreground text-[11px]">
                        CWE-89
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-destructive">
                          CRITICAL
                        </span>
                        <span className="font-medium text-foreground">
                          Hardcoded bearer token leak
                        </span>
                      </div>
                      <span className="font-mono text-muted-foreground text-[11px]">
                        CWE-798
                      </span>
                    </div>

                    <div className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-warning/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-warning">
                          HIGH
                        </span>
                        <span className="font-medium text-foreground">
                          SSRF in preview URL fetcher
                        </span>
                      </div>
                      <span className="font-mono text-muted-foreground text-[11px]">
                        CWE-918
                      </span>
                    </div>
                  </div>
                )}

                {/* STEP 4 VISUAL: Diff card + sandbox checklist + PR landed */}
                {activeStep === 3 && (
                  <div className="w-full max-w-md flex flex-col gap-3 animate-in fade-in-50 duration-200 font-mono text-xs">
                    <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between border-b border-border pb-1.5 text-[11px] text-muted-foreground">
                        <span>src/db/query-builder.ts</span>
                        <span className="text-success font-semibold">patch applied</span>
                      </div>
                      <div className="flex flex-col gap-1 text-[10px]">
                        <div className="rounded bg-destructive/10 px-2 py-0.5 text-destructive font-mono truncate">
                          {'- const query = `SELECT * FROM users WHERE id = ${id}`;'}
                        </div>
                        <div className="rounded bg-success/10 px-2 py-0.5 text-success font-mono truncate">
                          {'+ const query = sql`SELECT * FROM users WHERE id = ${id}`;'}
                        </div>
                      </div>
                    </div>

                    {/* Sandbox verification checklist */}
                    <div className="rounded-md border border-border bg-muted/40 p-3 flex flex-col gap-1.5 text-[11px]">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2Icon className="size-3.5" />
                        <span>eslint --max-warnings=0: PASSED</span>
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2Icon className="size-3.5" />
                        <span>tsc --noEmit: PASSED</span>
                      </div>
                      <div className="flex items-center gap-2 text-success font-semibold">
                        <CheckCircle2Icon className="size-3.5" />
                        <span>npm test: 14/14 suites PASSED</span>
                      </div>
                    </div>

                    {/* PR Landed confirmation */}
                    <div className="rounded-md border border-border bg-card p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                          OPEN
                        </span>
                        <span className="font-sans font-semibold text-xs text-foreground">
                          PR #128 opened
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-sans">
                        Awaiting your merge
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stage Footer Status */}
              <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] font-mono text-muted-foreground">
                <span>Deterministic AST heuristics</span>
                <span className="text-foreground font-medium">
                  Step {activeStep + 1} of 4
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
