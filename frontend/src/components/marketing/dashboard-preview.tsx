"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BrowserFrame } from "./primitives/browser-frame";
import { FindingRow, type FindingRowData } from "./primitives/finding-row";
import {
  SlidersHorizontalIcon,
  SearchIcon,
  DownloadIcon,
  ColumnsIcon,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// TODO: Replace public/marketing/findings.png with a full-resolution screenshot of your live /findings dashboard once custom styling is locked. Until then, this high-fidelity DOM mock provides instant loading with zero blurriness.

const PREVIEW_FINDINGS: FindingRowData[] = [
  {
    id: "SEC-101",
    ruleId: "CWE-89",
    title: "SQL injection in dynamic filter builder",
    file: "src/db/query-builder.ts",
    severity: "Critical",
    status: "Open",
  },
  {
    id: "SEC-102",
    ruleId: "CWE-798",
    title: "Hardcoded bearer authentication token",
    file: "src/services/webhook-client.ts",
    severity: "Critical",
    status: "Open",
  },
  {
    id: "SEC-103",
    ruleId: "CWE-918",
    title: "Server-side request forgery (SSRF) in fetch preview",
    file: "src/api/routes/preview.ts",
    severity: "Critical",
    status: "Open",
  },
  {
    id: "PERF-201",
    ruleId: "PERF-014",
    title: "Unbounded in-memory queue without backpressure",
    file: "src/queue/event-worker.ts",
    severity: "High",
    status: "Triaged",
  },
  {
    id: "SEC-202",
    ruleId: "CWE-942",
    title: "Permissive CORS origin wildcard configuration",
    file: "src/middleware/cors.ts",
    severity: "High",
    status: "Open",
  },
  {
    id: "CODE-301",
    ruleId: "LINT-402",
    title: "Unchecked return error in async transaction",
    file: "src/repos/user-repository.ts",
    severity: "Medium",
    status: "In progress",
  },
];

export function MarketingDashboardPreview() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const parallaxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion || !containerRef.current || !parallaxRef.current)
      return;

    const ctx = gsap.context(() => {
      // Subtle parallax inside overflow-hidden frame (-6% to +6%)
      gsap.fromTo(
        parallaxRef.current,
        { y: "-6%" },
        {
          y: "6%",
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full py-16 sm:py-24 border-b border-border bg-muted/40"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="mb-10 flex flex-col items-center text-center gap-2 max-w-xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Interface
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Built for daily engineering review
          </h2>
          <p className="font-body text-base text-muted-foreground">
            Clear triage actions, real-time filters, and complete visibility across every repository.
          </p>
        </div>

        {/* Browser Frame with inner parallax */}
        <div className="w-full max-w-5xl mx-auto overflow-hidden rounded-lg">
          <BrowserFrame url="reviewpilot.dev/findings">
            <div className="relative w-full overflow-hidden bg-background">
              <div
                ref={parallaxRef}
                className="w-full flex flex-col gap-4 p-4 sm:p-6 will-change-transform"
              >
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-0.5">
                    <span className="text-[11px] font-mono text-muted-foreground">Open findings</span>
                    <span className="text-xl font-bold text-foreground">42</span>
                    <span className="text-[10px] text-muted-foreground">+5 since yesterday</span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-0.5">
                    <span className="text-[11px] font-mono text-muted-foreground">Critical</span>
                    <span className="text-xl font-bold text-destructive">3</span>
                    <span className="text-[10px] text-muted-foreground">Immediate attention</span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-0.5">
                    <span className="text-[11px] font-mono text-muted-foreground">Scans today</span>
                    <span className="text-xl font-bold text-foreground">18</span>
                    <span className="text-[10px] text-muted-foreground">3 in progress</span>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-0.5">
                    <span className="text-[11px] font-mono text-muted-foreground">Queue lag</span>
                    <span className="text-xl font-bold text-success">0.4s</span>
                    <span className="text-[10px] text-muted-foreground">Optimal throughput</span>
                  </div>
                </div>

                {/* Table Card with Toolbar & Mock Rows */}
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between border-b border-border p-3 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
                        <SearchIcon className="size-3" />
                        <span>Search findings...</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs font-mono text-muted-foreground">
                        <SlidersHorizontalIcon className="size-3" />
                        <span>Severity</span>
                      </div>
                      <div className="hidden sm:flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs font-mono text-muted-foreground">
                        <ColumnsIcon className="size-3" />
                        <span>Columns</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                      <span>42 findings</span>
                      <div className="flex items-center gap-1 rounded border border-border bg-card px-2 py-1">
                        <DownloadIcon className="size-3" />
                        <span>Export</span>
                      </div>
                    </div>
                  </div>

                  {/* Findings rows */}
                  <div className="flex flex-col divide-y divide-border">
                    {PREVIEW_FINDINGS.map((finding) => (
                      <FindingRow key={finding.id} finding={finding} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </BrowserFrame>
        </div>

        {/* Caption */}
        <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
          The findings page, with filters, bulk actions, and a detail panel.
        </p>
      </div>
    </section>
  );
}
