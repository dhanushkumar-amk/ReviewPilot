"use client";

import * as React from "react";

/**
 * Standardized easing curves and durations for ReviewPilot.
 * Follows the motion system rules:
 * - GSAP: power3.out for entrances
 * - CSS / Motion: cubic-bezier(0.2, 0.8, 0.2, 1)
 * - Linear for progress/scan sweep (metaphorical exception: 1.2s)
 */
export const EASINGS = {
  entrance: "power3.out",
  smooth: [0.2, 0.8, 0.2, 1] as const,
  linear: "linear" as const,
};

export const DURATIONS = {
  micro: 0.12,
  ui: 0.22,
  large: 0.4,
  max: 0.6,
  sweep: 1.2, // Intentional progress sweep exception
};

/**
 * Hook to check if motion is enabled:
 * - Returns false if user prefers reduced motion
 * - Returns false if Save-Data header/connection is active
 */
export function useMotionEnabled(): boolean {
  const [enabled, setEnabled] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hasSaveData =
      // @ts-expect-error - connection is not yet in all standard TS lib dom definitions
      Boolean(navigator.connection?.saveData);

    const checkMotion = () => {
      setEnabled(!mediaQuery.matches && !hasSaveData);
    };

    checkMotion();
    mediaQuery.addEventListener("change", checkMotion);
    return () => mediaQuery.removeEventListener("change", checkMotion);
  }, []);

  return enabled;
}
