"use client";

import { useEffect, useState } from "react";
import { useMutationBusyStore } from "@/stores/mutationBusyStore";
import { cn } from "@/lib/utils/cn";

/**
 * Thin indeterminate write bar — no fake percentage chip.
 * Optimistic list updates should land instantly; this is a quiet network hint.
 */
export function MutationProgressBar() {
  const pendingCount = useMutationBusyStore((s) => s.pendingCount);
  const finishing = useMutationBusyStore((s) => s.finishing);
  const active = pendingCount > 0 || finishing;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 150);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible && !active) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[200] transition-opacity duration-150",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className="h-0.5 w-full overflow-hidden bg-transparent"
        role="progressbar"
        aria-busy={active}
        aria-valuetext="Saving"
        aria-hidden={!active}
      >
        <div className="mutation-progress-bar h-full bg-[var(--color-brand-primary,#2563eb)]" />
      </div>
    </div>
  );
}
