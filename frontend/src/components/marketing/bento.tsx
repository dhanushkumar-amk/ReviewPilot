"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { FindingRow, type FindingRowData } from "./primitives/finding-row";
import { DiffCard } from "./primitives/diff-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  CheckCircle2Icon,
  FolderIcon,
  FileCodeIcon,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// Sample findings for the interactive bento card
const SAMPLE_FINDINGS: FindingRowData[] = [
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

// Sample chart telemetry data
const SCAN_TIME_DATA = [
  { push: "p1", ms: 420 },
  { push: "p2", ms: 380 },
  { push: "p3", ms: 510 },
  { push: "p4", ms: 320 },
  { push: "p5", ms: 290 },
  { push: "p6", ms: 340 },
  { push: "p7", ms: 310 },
];

const SEVERITY_CHART_DATA = [
  { name: "Critical", count: 3, fill: "#C10007" },
  { name: "High", count: 5, fill: "#FFAC00" },
  { name: "Medium", count: 10, fill: "#52525B" },
  { name: "Low", count: 24, fill: "#A1A1AA" },
];

export function MarketingBento() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedSeverities, setSelectedSeverities] = React.useState<Set<string>>(
    new Set(["Critical", "High", "Medium"])
  );
  const [hasEntered, setHasEntered] = React.useState(false);

  // Staggered reveal for the whole bento grid
  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion || !containerRef.current) {
      setHasEntered(true);
      return;
    }

    const ctx = gsap.context(() => {
      const cards = containerRef.current?.querySelectorAll(".bento-card");
      if (cards) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 85%",
              once: true,
              onEnter: () => setHasEntered(true),
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  const toggleSeverity = (sev: string) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) {
        if (next.size > 1) next.delete(sev);
      } else {
        next.add(sev);
      }
      return next;
    });
  };

  const filteredFindings = SAMPLE_FINDINGS.filter((f) =>
    selectedSeverities.has(f.severity)
  );

  return (
    <section
      id="what-you-get"
      ref={containerRef}
      className="relative w-full py-16 sm:py-24 border-b border-border bg-background"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="mb-12 flex flex-col gap-2 max-w-xl">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Capabilities
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            What you get
          </h2>
          <p className="font-body text-base text-muted-foreground">
            Fast, verifiable static diagnostics designed for engineer confidence.
          </p>
        </div>

        {/* Heterogeneous Bento Grid (8px radius, hairline borders, no shadows) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* CARD 1 (Large - 8 cols): Live Findings Table with Filter Chips */}
          <div className="bento-card md:col-span-8 rounded-lg border border-border bg-card p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-heading text-base font-semibold text-foreground">
                  Findings you can act on
                </h3>
                <p className="text-xs text-muted-foreground font-body">
                  Filter by severity and inspect triaged violations in real time.
                </p>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5" role="toolbar" aria-label="Severity filter chips">
                {(["Critical", "High", "Medium"] as const).map((sev) => {
                  const isSelected = selectedSeverities.has(sev);
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => toggleSeverity(sev)}
                      aria-pressed={isSelected}
                      className={cn(
                        "rounded px-2 py-1 font-mono text-[11px] font-medium transition-colors border outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer",
                        isSelected
                          ? "bg-foreground text-background border-foreground font-semibold"
                          : "bg-muted text-muted-foreground border-border hover:text-foreground"
                      )}
                    >
                      {sev}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Findings List with Motion layout animation */}
            <div className="rounded-md border border-border bg-card divide-y divide-border overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredFindings.map((finding) => (
                  <motion.div
                    key={finding.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <FindingRow finding={finding} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* CARD 2 (Medium - 4 cols): Fixes Tested in Sandbox */}
          <div className="bento-card md:col-span-4 rounded-lg border border-border bg-card p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Fixes tested before you see them
              </h3>
              <p className="text-xs text-muted-foreground font-body">
                Candidate patches run in isolated containers with full test verification.
              </p>
            </div>

            <DiffCard
              file="src/db/query-builder.ts"
              oldLine='- const q = `SELECT * FROM users WHERE id = ${id}`;'
              newLine="+ const q = sql`SELECT * FROM users WHERE id = ${id}`;"
              testStatus="Lint + 14 unit test suites passed"
            />
          </div>

          {/* CARD 3 (Medium - 5 cols): Scan Time Telemetry Chart (SVG Path Draw) */}
          <div className="bento-card md:col-span-5 rounded-lg border border-border bg-card p-5 sm:p-6 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Scan time per push (sample data)
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">
                Sample data. Your repositories will show real numbers.
              </p>
            </div>

            {/* Telemetry Line SVG */}
            <div className="w-full h-28 pt-2">
              <svg viewBox="0 0 340 100" className="w-full h-full overflow-visible">
                {/* Reference Grid lines */}
                <line x1="0" y1="20" x2="340" y2="20" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="340" y2="50" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="340" y2="80" stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3 3" />

                {/* Animated Trend Line */}
                <path
                  d="M 10 50 L 60 40 L 115 65 L 170 30 L 225 25 L 280 35 L 330 30"
                  fill="none"
                  stroke="#111111"
                  strokeWidth="2"
                  className={cn(
                    "transition-all duration-700 ease-out",
                    hasEntered ? "stroke-dashoffset-0" : ""
                  )}
                  style={{
                    strokeDasharray: 360,
                    strokeDashoffset: hasEntered ? 0 : 360,
                  }}
                />

                {/* Data Points */}
                {[
                  [10, 50],
                  [60, 40],
                  [115, 65],
                  [170, 30],
                  [225, 25],
                  [280, 35],
                  [330, 30],
                ].map(([cx, cy], idx) => (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r="3"
                    fill="#FFFFFF"
                    stroke="#111111"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border">
              <span>Median: 340ms</span>
              <span>p99: 510ms</span>
            </div>
          </div>

          {/* CARD 4 (Small - 4 cols): Findings by Severity (Recharts Bar Chart) */}
          <div className="bento-card md:col-span-4 rounded-lg border border-border bg-card p-5 sm:p-6 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Findings by severity (sample data)
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">
                Sample distribution across 42 rules.
              </p>
            </div>

            {/* Recharts Bar Chart with solid fills */}
            <div className="w-full h-28" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SEVERITY_CHART_DATA} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#52525B" }} axisLine={{ stroke: "#E4E4E7" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#52525B" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: "transparent" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded border border-border bg-card px-2 py-1 text-[11px] font-mono shadow-xs">
                            <span className="font-semibold">{payload[0].value}</span> findings
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                    {SEVERITY_CHART_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Accessible table summary fallback for screen readers */}
            <div className="sr-only">
              <table>
                <caption>Findings by severity (sample data)</caption>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {SEVERITY_CHART_DATA.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border">
              <span>Total: 42 findings</span>
              <span>3 Critical</span>
            </div>
          </div>

          {/* CARD 5 (Small - 3 cols): Only What Changed */}
          <div className="bento-card md:col-span-3 rounded-lg border border-border bg-card p-5 sm:p-6 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-heading text-base font-semibold text-foreground">
                Only what changed
              </h3>
              <p className="text-xs text-muted-foreground font-body">
                AST dependency graphs prune unchanged files.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-2.5 font-mono text-[11px] flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FolderIcon className="size-3" />
                <span>packages/backend/</span>
              </div>
              <div className="pl-3.5 flex flex-col gap-1">
                <div className="flex items-center justify-between text-muted-foreground/60">
                  <span>router.ts</span>
                  <span>skipped</span>
                </div>
                <div className="flex items-center justify-between text-primary font-semibold">
                  <div className="flex items-center gap-1">
                    <FileCodeIcon className="size-3" />
                    <span>query.ts</span>
                  </div>
                  <span>scanned</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground/60">
                  <span>schema.ts</span>
                  <span>skipped</span>
                </div>
              </div>
            </div>

            <p className="font-mono text-[11px] text-muted-foreground pt-1 border-t border-border">
              3 of 40 files evaluated
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
