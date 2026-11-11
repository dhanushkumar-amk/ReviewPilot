"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrowserFrame } from "./primitives/browser-frame";
import { HeroPoster } from "./hero-poster";
import { useMotionEnabled } from "@/src/lib/motion";
import {
  RotateCcwIcon,
  CheckCircle2Icon,
  ShieldAlertIcon,
  GitCommitIcon,
  GitPullRequestIcon,
  TerminalIcon,
  LayersIcon,
  CheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Dynamically import 3D Hero Scene with ssr: false as secondary view
const DynamicHeroScene = dynamic(
  () => import("./hero-scene").then((mod) => mod.HeroScene),
  {
    ssr: false,
    loading: () => <HeroPoster animateOnMobile={false} />,
  }
);

// GitHub mark inline SVG
function GithubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function MarketingHero() {
  const motionEnabled = useMotionEnabled();
  const [activeTab, setActiveTab] = React.useState<"push" | "scan" | "sandbox" | "pr">("scan");
  const [viewMode, setViewMode] = React.useState<"console" | "3d">("console");
  const [replayKey, setReplayKey] = React.useState(0);
  const [merged, setMerged] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);

  // Auto-cycle through the 4 stages unless paused by user interaction
  React.useEffect(() => {
    if (!motionEnabled || isPaused || viewMode !== "console") return;

    const timer = setInterval(() => {
      setActiveTab((prev) => {
        if (prev === "push") return "scan";
        if (prev === "scan") return "sandbox";
        if (prev === "sandbox") return "pr";
        return "push";
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [motionEnabled, isPaused, viewMode]);

  const handleReplay = () => {
    setMerged(false);
    setActiveTab("push");
    setReplayKey((k) => k + 1);
  };

  const handleMerge = () => {
    setMerged(true);
  };

  return (
    <section
      id="hero-section"
      className="relative w-full overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20 lg:pt-16 lg:pb-24 border-b border-border bg-background"
    >
      {/* Blueprint Grid Background Pattern */}
      <div
        className="pointer-events-none absolute inset-0 z-0 select-none opacity-40 dark:opacity-25"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full absolute text-border"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="blueprint-grid-hero"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2 6"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#blueprint-grid-hero)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Top telemetry pill badge */}
        <div className="flex justify-start mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-mono text-muted-foreground shadow-none">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="text-foreground font-medium">ReviewPilot v2.4</span>
            <span className="text-border" aria-hidden="true">|</span>
            <span className="hidden sm:inline">Deterministic AST Scanner &amp; Sandbox Fixes</span>
            <span className="sm:hidden">Autonomous Code Review</span>
          </div>
        </div>

        {/* 12-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
          {/* Left Column (5 Cols): Typography & CTAs */}
          <div className="lg:col-span-5 flex flex-col gap-6 text-left">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-[-0.03em] leading-[1.08] text-foreground">
              Scan every push.{" "}
              <span className="text-foreground">Fix vulnerabilities before they merge.</span>
            </h1>

            <p className="font-body text-base sm:text-lg leading-relaxed text-muted-foreground">
              ReviewPilot checks every commit against deterministic AST security rules,
              runs tested patches inside an ephemeral sandbox, and opens a pull request.
              You approve every line.
            </p>

            {/* Action Bar: Single Primary Orange Button + Secondary Outline Demo Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <Button
                variant="default"
                size="lg"
                render={<Link href="/sign-up" />}
                nativeButton={false}
                className="h-11 px-5 text-sm font-semibold justify-center cursor-pointer"
              >
                <GithubMark />
                <span>Connect GitHub</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                render={<Link href="/findings" />}
                nativeButton={false}
                className="h-11 px-4 text-sm font-medium justify-center cursor-pointer"
              >
                <TerminalIcon className="size-4" />
                <span>Explore findings</span>
              </Button>
            </div>

            {/* Trust Assurances */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-y-2 gap-x-5 text-xs text-muted-foreground font-mono">
              <div className="flex items-center gap-1.5">
                <CheckIcon className="size-3.5 text-success shrink-0" />
                <span>Free for 1 repository</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckIcon className="size-3.5 text-success shrink-0" />
                <span>Zero config required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckIcon className="size-3.5 text-success shrink-0" />
                <span>Human merge control</span>
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols): Interactive Developer Workstation Console */}
          <div
            className="lg:col-span-7 relative w-full flex flex-col gap-3"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* View switcher & Replay control header */}
            <div className="flex items-center justify-between px-1">
              {/* Stage switcher pills */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-md border border-border text-[11px] font-mono">
                {(
                  [
                    { id: "push", label: "1. Push" },
                    { id: "scan", label: "2. Scan & Fix" },
                    { id: "sandbox", label: "3. Sandbox" },
                    { id: "pr", label: "4. Pull Request" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setViewMode("console");
                      setActiveTab(tab.id);
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded transition-colors cursor-pointer",
                      viewMode === "console" && activeTab === tab.id
                        ? "bg-card text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View mode toggle (Console vs 3D) & Replay */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === "console" ? "3d" : "console")}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded border border-border bg-card"
                  title="Toggle 3D isometric diagram"
                >
                  <LayersIcon className="size-3" />
                  <span>{viewMode === "console" ? "3D View" : "Console"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReplay}
                  className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded hover:bg-muted"
                  aria-label="Replay scan sequence"
                >
                  <RotateCcwIcon className="size-3" />
                  <span className="hidden sm:inline">Replay</span>
                </button>
              </div>
            </div>

            {/* Core Console Container */}
            {viewMode === "3d" ? (
              <div className="w-full rounded-lg border border-border bg-card overflow-hidden min-h-[420px] flex items-center justify-center">
                <DynamicHeroScene replayKey={replayKey} />
              </div>
            ) : (
              <BrowserFrame
                url="github.com/acme-corp/api-gateway/pull/128"
                className="w-full shadow-none bg-card"
              >
                {/* Console Internal Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success" />
                    <span className="font-semibold text-foreground">
                      api-gateway <span className="text-muted-foreground font-normal">/ main</span>
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      SHA 9f2c81a
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-[11px]">
                    Runtime: 340ms
                  </span>
                </div>

                {/* TAB 1: PUSH EVENT */}
                {activeTab === "push" && (
                  <div className="p-5 flex flex-col gap-4 animate-in fade-in-50 duration-200">
                    <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-xs">
                      <div className="text-muted-foreground mb-1">
                        $ git push origin main
                      </div>
                      <div className="text-foreground">
                        Enumerating objects: 7, done.
                      </div>
                      <div className="text-foreground">
                        To github.com:acme-corp/api-gateway.git
                      </div>
                      <div className="text-success">
                        &nbsp;&nbsp;8a3b10c..9f2c81a main -&gt; main
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-card p-4 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <GitCommitIcon className="size-4 text-foreground" />
                          <span className="font-semibold text-foreground">
                            feat: add parameterized query filtering
                          </span>
                        </div>
                        <span className="font-mono text-muted-foreground text-[11px]">
                          +2 -1 lines
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono flex items-center gap-3">
                        <span>Author: alex@acme.dev</span>
                        <span>•</span>
                        <span>src/db/query-builder.ts</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-[11px] font-mono">
                        <span className="text-success flex items-center gap-1.5">
                          <CheckCircle2Icon className="size-3.5" />
                          Webhook acknowledged &amp; worker assigned
                        </span>
                        <span className="text-muted-foreground">18ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: AST SCAN & FIX (Default Primary View) */}
                {activeTab === "scan" && (
                  <div className="p-4 sm:p-5 flex flex-col gap-3.5 animate-in fade-in-50 duration-200 font-mono text-xs">
                    {/* Vulnerability Alert Box */}
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlertIcon className="size-4 text-destructive shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-destructive">
                              CRITICAL
                            </span>
                            <span className="text-foreground font-semibold">
                              CWE-89: SQL Injection in dynamic query
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-sans">
                            Direct template literal interpolation into raw query builder bypasses driver escaping.
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px] shrink-0">
                        CVSS 9.8
                      </Badge>
                    </div>

                    {/* Code Diff Box with Line Numbers */}
                    <div className="rounded-md border border-border bg-background overflow-hidden text-[12px] leading-relaxed">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/40 text-[11px] text-muted-foreground">
                        <span>src/db/query-builder.ts</span>
                        <span>AST rule: semgrep.sqli-raw-query</span>
                      </div>
                      <div className="p-3 flex flex-col font-mono text-[11px] sm:text-xs">
                        <div className="text-muted-foreground/60 select-none">
                          <span className="inline-block w-6 text-right mr-3 text-muted-foreground/40">40</span>
                          <span>export async function findUserById(id: string) &#123;</span>
                        </div>
                        <div className="text-muted-foreground/60 select-none">
                          <span className="inline-block w-6 text-right mr-3 text-muted-foreground/40">41</span>
                          <span>&nbsp;&nbsp;const pool = getDatabasePool();</span>
                        </div>
                        {/* Red removed vulnerable line */}
                        <div className="bg-destructive/15 text-destructive -mx-3 px-3 py-0.5 flex items-center">
                          <span className="inline-block w-6 text-right mr-3 text-destructive/70 select-none">42</span>
                          <span className="font-semibold">-&nbsp;&nbsp;const q = `SELECT * FROM users WHERE id = $&#123;id&#125;`;</span>
                        </div>
                        {/* Green added safe line */}
                        <div className="bg-success/15 text-success -mx-3 px-3 py-0.5 flex items-center">
                          <span className="inline-block w-6 text-right mr-3 text-success/70 select-none">42</span>
                          <span className="font-semibold">+&nbsp;&nbsp;const q = sql`SELECT * FROM users WHERE id = $&#123;id&#125;`;</span>
                        </div>
                        <div className="text-muted-foreground/60 select-none">
                          <span className="inline-block w-6 text-right mr-3 text-muted-foreground/40">43</span>
                          <span>&nbsp;&nbsp;return await pool.execute(q);</span>
                        </div>
                        <div className="text-muted-foreground/60 select-none">
                          <span className="inline-block w-6 text-right mr-3 text-muted-foreground/40">44</span>
                          <span>&#125;</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom action prompt */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        Deterministic patch generated by ReviewPilot AST engine
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("sandbox")}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Run sandbox test &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: EPHEMERAL SANDBOX TEST */}
                {activeTab === "sandbox" && (
                  <div className="p-5 flex flex-col gap-4 animate-in fade-in-50 duration-200 font-mono text-xs">
                    <div className="rounded-md border border-border bg-card p-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px] border-b border-border pb-1.5">
                        <span>Sandbox container: ephem-runner-492</span>
                        <span className="text-success font-semibold">Active sandbox</span>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Target: <span className="text-foreground">node:20-alpine</span> • Isolated environment
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-muted/40 p-3.5 flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2Icon className="size-4 shrink-0" />
                        <span>Applying AST patch to query-builder.ts (0 errors)</span>
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2Icon className="size-4 shrink-0" />
                        <span>eslint --max-warnings=0: PASSED (112ms)</span>
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2Icon className="size-4 shrink-0" />
                        <span>tsc --noEmit: PASSED (240ms)</span>
                      </div>
                      <div className="flex items-center gap-2 text-success font-semibold">
                        <CheckCircle2Icon className="size-4 shrink-0" />
                        <span>npm test: 14/14 test suites PASSED (680ms)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-success text-xs font-semibold flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-success" />
                        Sandbox verified safe to merge
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("pr")}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Inspect PR preview &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: GITHUB PULL REQUEST */}
                {activeTab === "pr" && (
                  <div className="p-5 flex flex-col gap-4 animate-in fade-in-50 duration-200">
                    <div className="rounded-md border border-border bg-card p-4 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="rounded bg-success/15 px-2 py-0.5 text-xs font-mono font-semibold text-success">
                            {merged ? "MERGED" : "OPEN"}
                          </span>
                          <span className="font-heading font-semibold text-sm text-foreground">
                            PR #128: fix(security): sanitize dynamic SQL query
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
                        <span className="text-muted-foreground">1 file changed</span>
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
                            onClick={handleMerge}
                            className="font-medium cursor-pointer"
                          >
                            <GitPullRequestIcon data-icon="inline-start" />
                            <span>Approve &amp; Merge pull request</span>
                          </Button>
                        )}

                        <span className="text-xs text-muted-foreground font-mono">
                          {merged ? "Production safe" : "Awaiting your click"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Console Footer Telemetry Bar */}
                <div className="px-4 py-2 border-t border-border bg-muted/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>Engine: AST + Semgrep 1.62</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">Sandbox: Ephemeral 256MB</span>
                  </div>
                  <span className="text-foreground font-medium">
                    Stage {activeTab === "push" ? "1" : activeTab === "scan" ? "2" : activeTab === "sandbox" ? "3" : "4"} of 4
                  </span>
                </div>
              </BrowserFrame>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
