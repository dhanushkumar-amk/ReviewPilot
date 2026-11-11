"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { ShieldCheckIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// TODO: Verify organizational data retention, zero-data-retention AI model routing, and GDPR privacy policy with legal before launch. Do not state unverified data policy claims.

const SECURITY_NODES = [
  {
    step: "01",
    title: "Secrets are redacted before the AI sees any code",
    description:
      "Regex and entropy scanners mask bearer tokens, API keys, and connection strings prior to AST generation.",
  },
  {
    step: "02",
    title: "Fixes run in an isolated sandbox",
    description:
      "Candidate patches execute ephemeral containerized test suites with no egress network access.",
  },
  {
    step: "03",
    title: "Patches can only change files you approved",
    description:
      "Diff generation is scoped strictly to files containing detected diagnostic rule violations.",
  },
  {
    step: "04",
    title: "A person approves every pull request",
    description:
      "No branch mutations or automated merges take place without developer review and GitHub pull request merge.",
  },
];

export function MarketingSecurityTimeline() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pathRef = React.useRef<SVGLineElement>(null);
  const [activeNodeIndex, setActiveNodeIndex] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    const path = pathRef.current;
    if (!container || !path) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      setActiveNodeIndex(3);
      path.style.strokeDashoffset = "0";
      return;
    }

    const totalHeight = 360;
    path.style.strokeDasharray = `${totalHeight}`;
    path.style.strokeDashoffset = `${totalHeight}`;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: "top 70%",
        end: "bottom 50%",
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          path.style.strokeDashoffset = `${totalHeight * (1 - progress)}`;
          const index = Math.min(3, Math.floor(progress * 4));
          setActiveNodeIndex(index);
        },
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="security"
      ref={containerRef}
      className="relative w-full py-16 sm:py-24 border-b border-border bg-background"
    >
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column (5 Cols): Copy */}
          <div className="lg:col-span-5 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
              <ShieldCheckIcon className="size-4 text-foreground" />
              <span>Security model</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.1]">
              Built for code you do not fully trust
            </h2>
            <p className="font-body text-base text-muted-foreground leading-relaxed">
              Every verification step runs inside hardened boundaries. We treat
              all repository code and third-party dependencies as untrusted
              inputs.
            </p>
            <div className="rounded-md border border-border bg-card p-4 mt-2">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                <span className="size-2 rounded-full bg-success" />
                <span className="text-foreground font-semibold">
                  Zero automatic merge capability
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ReviewPilot is structurally incapable of pushing directly to
                production branches. It proposes standard GitHub pull requests.
              </p>
            </div>
          </div>

          {/* Right Column (7 Cols): Vertical SVG Timeline Scrub */}
          <div className="lg:col-span-7 relative flex pl-2 sm:pl-6">
            {/* Vertical Drawing SVG Track */}
            <div className="relative flex flex-col items-center mr-6 select-none" aria-hidden="true">
              <svg width="24" height="380" className="overflow-visible">
                {/* Background base hairline track */}
                <line
                  x1="12"
                  y1="10"
                  x2="12"
                  y2="370"
                  stroke="#E4E4E7"
                  strokeWidth="2"
                />
                {/* Animated Drawing Path */}
                <line
                  ref={pathRef}
                  x1="12"
                  y1="10"
                  x2="12"
                  y2="370"
                  stroke="#111111"
                  strokeWidth="2"
                />

                {/* 4 Nodes along track */}
                {[10, 130, 250, 370].map((cy, i) => (
                  <circle
                    key={i}
                    cx="12"
                    cy={cy}
                    r="5"
                    fill={i <= activeNodeIndex ? "#111111" : "#FFFFFF"}
                    stroke={i <= activeNodeIndex ? "#111111" : "#E4E4E7"}
                    strokeWidth="2"
                    className="transition-colors duration-200"
                  />
                ))}
              </svg>
            </div>

            {/* Nodes Text Content */}
            <div className="flex flex-col gap-10 sm:gap-14 py-0">
              {SECURITY_NODES.map((node, idx) => (
                <div
                  key={node.step}
                  className={cn(
                    "flex flex-col gap-1 transition-opacity duration-200",
                    idx <= activeNodeIndex ? "opacity-100" : "opacity-40"
                  )}
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    STAGE {node.step}
                  </span>
                  <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground">
                    {node.title}
                  </h3>
                  <p className="font-body text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {node.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
