"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { SplitLines } from "./primitives/split-lines";
import { HeroPoster } from "./hero-poster";
import { useMotionEnabled } from "@/src/lib/motion";
import { RotateCcwIcon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

// Dynamically import 3D Hero Scene with ssr: false
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
  const [replayKey, setReplayKey] = React.useState(0);
  const [isDesktop, setIsDesktop] = React.useState(false);
  const gridParallaxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Parallax on decorative blueprint grid (0.1x scroll speed)
  React.useEffect(() => {
    if (!motionEnabled || !gridParallaxRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to(gridParallaxRef.current, {
        y: 80,
        ease: "none",
        scrollTrigger: {
          trigger: "#hero-section",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, [motionEnabled]);

  const handleReplay = () => {
    setReplayKey((k) => k + 1);
  };

  return (
    <section
      id="hero-section"
      className="relative w-full overflow-hidden pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24 border-b border-border bg-background"
    >
      {/* Blueprint Grid Background Pattern (0.1x Parallax, Hidden on Reduced Motion) */}
      <div
        ref={gridParallaxRef}
        className="pointer-events-none absolute inset-0 z-0 select-none opacity-60"
        aria-hidden="true"
      >
        <svg
          className="w-full h-[120%] -top-[10%] absolute text-border"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="blueprint-grid"
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
          <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* 12-Column Grid: 5 columns left copy, 7 columns right scene bleeding off edge */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column (5 Cols): Typography & CTAs */}
          <div className="lg:col-span-5 flex flex-col gap-6 text-left">
            {/* Display H1 with line mask reveal */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.75rem] font-bold tracking-[-0.03em] leading-[1.05] text-foreground">
              <SplitLines
                lines={["Scan every push.", "Fix it with one click."]}
                stagger={0.06}
              />
            </h1>

            {/* Lede copy */}
            <p className="font-body text-base sm:text-lg leading-relaxed text-muted-foreground">
              ReviewPilot checks each push to your GitHub repository, explains
              what it finds, tests a fix in a sandbox, and opens a pull request.
              You approve every change.
            </p>

            {/* Action Bar: Single Primary Orange Button + Secondary Replay Text Button */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
              <Button
                variant="default"
                size="lg"
                render={<Link href="/findings" />}
                nativeButton={false}
                className="h-11 px-5 text-sm font-semibold justify-center"
              >
                <GithubMark />
                <span>Connect GitHub</span>
              </Button>

              <button
                type="button"
                onClick={handleReplay}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
                aria-label="Replay the 3D pipeline scan animation"
              >
                <RotateCcwIcon className="size-3.5" />
                <span>Replay the scan</span>
              </button>
            </div>

            {/* Small note */}
            <p className="font-mono text-xs text-muted-foreground/80">
              Free plan: 1 repository. No card required.
            </p>
          </div>

          {/* Right Column (7 Cols): 3D Scene or Static Poster fallback */}
          <div className="lg:col-span-7 relative w-full lg:-mr-12">
            {isDesktop && motionEnabled ? (
              <DynamicHeroScene replayKey={replayKey} />
            ) : (
              <HeroPoster animateOnMobile={motionEnabled} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

