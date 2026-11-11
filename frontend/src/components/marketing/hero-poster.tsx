"use client";

import * as React from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface HeroPosterProps {
  className?: string;
  animateOnMobile?: boolean;
}

export function HeroPoster({ className, animateOnMobile = false }: HeroPosterProps) {
  const containerRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!animateOnMobile) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion || !containerRef.current) return;

    const isMobile = window.innerWidth < 1024;
    if (!isMobile) return;

    // Short mobile GSAP entrance sequence
    const cards = containerRef.current.querySelectorAll(".poster-card");
    const flagged = containerRef.current.querySelectorAll(".poster-flagged-line");
    const overlays = containerRef.current.querySelectorAll(".poster-overlay");

    const tl = gsap.timeline({ delay: 0.1 });
    tl.fromTo(
      cards,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: "power3.out" }
    )
      .fromTo(
        flagged,
        { fill: "#E4E4E7" },
        { fill: "#CF222E", duration: 0.3, stagger: 0.08, ease: "power2.out" },
        "+=0.2"
      )
      .fromTo(
        overlays,
        { scale: 0.95, opacity: 0, y: 15 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "power3.out" },
        "-=0.1"
      );

    return () => {
      tl.kill();
    };
  }, [animateOnMobile]);

  return (
    <svg
      ref={containerRef}
      viewBox="0 0 760 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-auto select-none", className)}
      role="img"
      aria-label="Interactive isometric visualization of ReviewPilot scanning repository files, flagging vulnerabilities, testing sandbox fixes, and generating pull requests."
    >
      <defs>
        {/* Subtle drop shadow for floating PR card */}
        <filter id="card-shadow" x="-8%" y="-8%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.06" />
        </filter>
      </defs>

      {/* Layer 1: Background Blueprint Grid */}
      <g stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" opacity="0.6">
        <line x1="40" y1="0" x2="40" y2="520" />
        <line x1="160" y1="0" x2="160" y2="520" />
        <line x1="280" y1="0" x2="280" y2="520" />
        <line x1="400" y1="0" x2="400" y2="520" />
        <line x1="520" y1="0" x2="520" y2="520" />
        <line x1="640" y1="0" x2="640" y2="520" />
        <line x1="0" y1="80" x2="760" y2="80" />
        <line x1="0" y1="200" x2="760" y2="200" />
        <line x1="0" y1="320" x2="760" y2="320" />
        <line x1="0" y1="440" x2="760" y2="440" />
      </g>

      {/* Isometric File Stack (6 Cards, stacked with depth) */}
      {/* Card 1 (Bottom): event-worker.ts */}
      <g className="poster-card" transform="translate(180, 260) skewX(-24) rotate(4)">
        <rect width="360" height="180" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <text x="20" y="28" fill="var(--muted-foreground)" fontSize="11" fontFamily="monospace" fontWeight="500">
          src/queue/event-worker.ts
        </text>
        <rect x="20" y="44" width="220" height="5" rx="2.5" fill="var(--border)" />
        <rect x="20" y="58" width="160" height="5" rx="2.5" fill="var(--border)" />
        <rect x="20" y="72" width="280" height="5" rx="2.5" fill="var(--border)" />
      </g>

      {/* Card 2: cors.ts */}
      <g className="poster-card" transform="translate(160, 225) skewX(-24) rotate(4)">
        <rect width="360" height="180" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <text x="20" y="28" fill="var(--muted-foreground)" fontSize="11" fontFamily="monospace" fontWeight="500">
          src/middleware/cors.ts
        </text>
        <rect x="20" y="44" width="260" height="5" rx="2.5" fill="var(--border)" />
        <rect x="20" y="58" width="190" height="5" rx="2.5" fill="var(--border)" />
        <rect x="20" y="72" width="140" height="5" rx="2.5" fill="var(--border)" />
      </g>

      {/* Card 3: preview.ts (Contains SSRF) */}
      <g className="poster-card" transform="translate(140, 190) skewX(-24) rotate(4)">
        <rect width="360" height="180" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <text x="20" y="28" fill="var(--muted-foreground)" fontSize="11" fontFamily="monospace" fontWeight="500">
          src/api/routes/preview.ts
        </text>
        <rect x="20" y="44" width="240" height="5" rx="2.5" fill="var(--border)" />
        {/* Flagged SSRF line */}
        <rect className="poster-flagged-line" x="20" y="60" width="280" height="6" rx="2.5" fill="#FFAC00" />
        <rect x="20" y="76" width="180" height="5" rx="2.5" fill="var(--border)" />
      </g>

      {/* Card 4: webhook-client.ts (Contains Token leak) */}
      <g className="poster-card" transform="translate(120, 155) skewX(-24) rotate(4)">
        <rect width="360" height="180" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <text x="20" y="28" fill="var(--muted-foreground)" fontSize="11" fontFamily="monospace" fontWeight="500">
          src/services/webhook-client.ts
        </text>
        <rect x="20" y="44" width="190" height="5" rx="2.5" fill="var(--border)" />
        {/* Flagged Token line */}
        <rect className="poster-flagged-line" x="20" y="60" width="300" height="6" rx="2.5" fill="#CF222E" />
        <rect x="20" y="76" width="160" height="5" rx="2.5" fill="var(--border)" />
      </g>

      {/* Card 5 (Top Stack): query-builder.ts (Contains SQL Injection) */}
      <g className="poster-card" transform="translate(100, 120) skewX(-24) rotate(4)">
        <rect width="360" height="180" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <text x="20" y="28" fill="var(--foreground)" fontSize="11" fontFamily="monospace" fontWeight="600">
          src/db/query-builder.ts
        </text>
        <rect x="20" y="44" width="220" height="5" rx="2.5" fill="var(--border)" />
        {/* Flagged SQLi line */}
        <rect className="poster-flagged-line" x="20" y="60" width="290" height="6" rx="2.5" fill="#CF222E" />
        <rect x="20" y="76" width="140" height="5" rx="2.5" fill="var(--border)" />
        <rect x="20" y="90" width="240" height="5" rx="2.5" fill="var(--border)" />
      </g>

      {/* Orange Scan Sweep Plane (Visual depiction in final position) */}
      <g opacity="0.14" transform="translate(90, 110) skewX(-24) rotate(4)">
        <rect width="380" height="210" rx="8" fill="#F6821F" stroke="#F6821F" strokeWidth="1.5" />
      </g>

      {/* Annotation Tag 1: SQL Injection callout */}
      <g className="poster-overlay" transform="translate(490, 110)">
        <line x1="0" y1="14" x2="-65" y2="28" stroke="#CF222E" strokeWidth="1" strokeDasharray="3 3" />
        <rect width="148" height="26" rx="4" fill="var(--card)" stroke="#CF222E" strokeWidth="1" />
        <circle cx="12" cy="13" r="3" fill="#CF222E" />
        <text x="22" y="17" fill="#CF222E" fontSize="11" fontFamily="monospace" fontWeight="600">
          CWE-89: SQL injection
        </text>
      </g>

      {/* Annotation Tag 2: Hardcoded token callout */}
      <g className="poster-overlay" transform="translate(510, 175)">
        <line x1="0" y1="14" x2="-75" y2="24" stroke="#CF222E" strokeWidth="1" strokeDasharray="3 3" />
        <rect width="142" height="26" rx="4" fill="var(--card)" stroke="#CF222E" strokeWidth="1" />
        <circle cx="12" cy="13" r="3" fill="#CF222E" />
        <text x="22" y="17" fill="#CF222E" fontSize="11" fontFamily="monospace" fontWeight="600">
          CWE-798: Bearer token
        </text>
      </g>

      {/* Foreground Element 1: Diff & Sandbox Card (Slides out in front) */}
      <g className="poster-overlay" transform="translate(40, 240)" filter="url(#card-shadow)">
        <rect width="340" height="150" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <rect width="340" height="30" rx="8" fill="var(--muted)" />
        <text x="14" y="20" fill="var(--foreground)" fontSize="11" fontFamily="monospace" fontWeight="600">
          Patch preview • src/db/query-builder.ts
        </text>

        {/* Removed line */}
        <rect x="12" y="42" width="316" height="22" rx="3" fill="#CF222E" fillOpacity="0.1" />
        <text x="20" y="57" fill="#CF222E" fontSize="10" fontFamily="monospace">
          {'- const q = `SELECT * FROM users WHERE id = ${id}`;'}
        </text>

        {/* Added line */}
        <rect x="12" y="68" width="316" height="22" rx="3" fill="#1A7F37" fillOpacity="0.1" />
        <text x="20" y="83" fill="#1A7F37" fontSize="10" fontFamily="monospace">
          {'+ const q = sql`SELECT * FROM users WHERE id = ${id}`;'}
        </text>

        {/* Test status footer */}
        <line x1="0" y1="102" x2="340" y2="102" stroke="var(--border)" strokeWidth="1" />
        <circle cx="22" cy="124" r="5" fill="#1A7F37" />
        <path d="M19.5 124 L21.5 126 L25 122" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
        <text x="34" y="128" fill="#1A7F37" fontSize="11" fontFamily="monospace" fontWeight="600">
          Sandbox tests passed (14/14 test suites)
        </text>
      </g>

      {/* Foreground Element 2: Pull Request Landed Card */}
      <g className="poster-overlay" transform="translate(360, 320)" filter="url(#card-shadow)">
        <rect width="360" height="120" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
        <rect x="14" y="14" width="46" height="18" rx="4" fill="#1A7F37" fillOpacity="0.12" />
        <text x="21" y="27" fill="#1A7F37" fontSize="10" fontFamily="monospace" fontWeight="600">
          OPEN
        </text>
        <text x="68" y="27" fill="var(--foreground)" fontSize="12" fontWeight="600">
          Pull request #128 opened
        </text>
        <text x="14" y="52" fill="var(--muted-foreground)" fontSize="11">
          reviewpilot/core: Fix SQL injection in query-builder.ts
        </text>

        {/* Decorative Approve and Merge Button */}
        <g transform="translate(14, 72)" aria-hidden="true">
          <rect width="140" height="32" rx="6" fill="#F6821F" />
          <text x="22" y="21" fill="#111111" fontSize="11" fontWeight="600">
            Approve &amp; merge
          </text>
        </g>
        <text x="166" y="92" fill="var(--muted-foreground)" fontSize="10" fontFamily="monospace">
          1 file changed • +1 -1
        </text>
      </g>
    </svg>
  );
}
