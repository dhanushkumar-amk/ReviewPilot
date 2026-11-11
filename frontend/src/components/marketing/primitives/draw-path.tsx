"use client";

import * as React from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";

interface DrawPathProps extends React.SVGProps<SVGPathElement> {
  d: string;
  duration?: number;
  delay?: number;
  triggerOnScroll?: boolean;
  className?: string;
}

export function DrawPath({
  d,
  duration = 800,
  delay = 0,
  triggerOnScroll = true,
  className,
  ...props
}: DrawPathProps) {
  const pathRef = React.useRef<SVGPathElement>(null);

  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const path = pathRef.current;
    if (!path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;

    if (prefersReducedMotion) {
      path.style.strokeDashoffset = "0";
      return;
    }

    path.style.strokeDashoffset = `${length}`;

    let observer: IntersectionObserver | null = null;

    const runAnimation = () => {
      animate(path, {
        strokeDashoffset: [length, 0],
        duration: duration,
        delay: delay,
        ease: "outQuad",
      });
    };

    if (triggerOnScroll && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              runAnimation();
              observer?.disconnect();
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(path);
    } else {
      runAnimation();
    }

    return () => {
      observer?.disconnect();
    };
  }, [delay, duration, triggerOnScroll]);

  return (
    <path
      ref={pathRef}
      d={d}
      className={cn("will-change-transform", className)}
      fill="none"
      {...props}
    />
  );
}

