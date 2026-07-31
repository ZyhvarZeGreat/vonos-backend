"use client";

import { useEffect, useState } from "react";

/**
 * Soft 0→90% while `active`, then snap to 100% and clear when inactive.
 * Matches TopProgressBar / MutationProgressBar read-write loading UX.
 */
export function useSimulatedLoadPercent(active: boolean): number {
  const [percent, setPercent] = useState(0);
  const [wasActive, setWasActive] = useState(false);

  useEffect(() => {
    if (active) {
      setWasActive(true);
      setPercent(0);
      const tick = window.setInterval(() => {
        setPercent((p) => {
          const gap = 90 - p;
          return Math.min(90, p + Math.max(0.9, gap * 0.14));
        });
      }, 80);
      return () => window.clearInterval(tick);
    }

    if (wasActive) {
      setPercent(100);
      const clear = window.setTimeout(() => {
        setPercent(0);
        setWasActive(false);
      }, 280);
      return () => window.clearTimeout(clear);
    }
  }, [active, wasActive]);

  return Math.round(Math.min(100, Math.max(0, percent)));
}
