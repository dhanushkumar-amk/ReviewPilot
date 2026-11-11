"use client";

import * as React from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

interface SplitLinesProps {
  lines: string[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
}

export function SplitLines({
  lines,
  className,
  lineClassName,
  delay = 0,
  stagger = 0.06,
}: SplitLinesProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !containerRef.current) return;

    const lineElements = containerRef.current.querySelectorAll(".split-line-inner");

    gsap.fromTo(
      lineElements,
      {
        y: "100%",
        opacity: 0,
      },
      {
        y: "0%",
        opacity: 1,
        duration: 0.45,
        ease: "power3.out",
        stagger: stagger,
        delay: delay,
      }
    );
  }, [delay, stagger]);

  return (
    <div ref={containerRef} className={cn("flex flex-col", className)}>
      {lines.map((line, index) => (
        <span
          key={index}
          className="inline-block overflow-hidden leading-[1.05] pb-1 -mb-1"
        >
          <span
            className={cn(
              "split-line-inner inline-block will-change-transform",
              lineClassName
            )}
          >
            {line}
          </span>
        </span>
      ))}
    </div>
  );
}
