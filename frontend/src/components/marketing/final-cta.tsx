"use client";

import * as React from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { useMotionEnabled } from "@/src/lib/motion";

gsap.registerPlugin(ScrollTrigger);

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

export function MarketingFinalCTA() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scanLineRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const motionEnabled = useMotionEnabled();

  React.useEffect(() => {
    if (!motionEnabled || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Slower background parallax on blueprint grid
      if (gridRef.current) {
        gsap.to(gridRef.current, {
          y: 40,
          ease: "none",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      // One-time scan-line sweep motion across card when section enters (not on loop)
      if (scanLineRef.current) {
        gsap.fromTo(
          scanLineRef.current,
          { x: "-100%", opacity: 0 },
          {
            x: "200%",
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 80%",
              once: true,
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [motionEnabled]);

  return (
    <section
      ref={containerRef}
      className="relative w-full py-20 sm:py-28 overflow-hidden border-b border-border bg-card"
    >
      {/* Slower Parallax Blueprint Grid */}
      <div
        ref={gridRef}
        className="pointer-events-none absolute inset-0 z-0 opacity-40 select-none"
        aria-hidden="true"
      >
        <svg
          className="w-full h-[140%] -top-[20%] absolute text-border"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="cta-blueprint-grid"
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
          <rect width="100%" height="100%" fill="url(#cta-blueprint-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col items-center text-center gap-6">
        {/* Single scan line sweep overlay */}
        <div
          ref={scanLineRef}
          className="pointer-events-none absolute inset-y-0 w-32 bg-primary/10 select-none transform -skew-x-12"
          aria-hidden="true"
        />

        <div className="max-w-2xl flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Get started
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.08]">
            Connect a repository. Get your first scan in minutes.
          </h2>
          <p className="font-body text-base text-muted-foreground mt-1">
            Free forever for single repositories. No credit card required.
          </p>
        </div>

        {/* Primary CTA Button */}
        <div className="pt-2">
          <Button
            variant="default"
            size="lg"
            render={<Link href="/sign-up" />}
            nativeButton={false}
            className="h-11 px-6 text-sm font-semibold justify-center"
          >
            <GithubMark />
            <span>Connect GitHub</span>
          </Button>
        </div>
      </div>
    </section>
  );
}

