"use client";

import { useEffect, useState } from "react";
import { useMutationBusyStore } from "@/stores/mutationBusyStore";
import { cn } from "@/lib/utils/cn";

/**
 * Determinate 0–100% write progress for any React Query mutation
 * (and manual `withWriteProgress` calls).
 */
export function MutationProgressBar() {
  const pendingCount = useMutationBusyStore((s) => s.pendingCount);
  const percent = useMutationBusyStore((s) => s.percent);
  const finishing = useMutationBusyStore((s) => s.finishing);
  const label = useMutationBusyStore((s) => s.label);
  const active = pendingCount > 0 || finishing;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 200);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible && !active) return null;

  const display = Math.round(Math.min(100, Math.max(0, percent)));

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[200] transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className="h-1 w-full overflow-hidden bg-black/5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={display}
        aria-valuetext={`${label} ${display}%`}
        aria-hidden={!active}
      >
        <div
          className="h-full bg-[var(--color-brand-primary,#2563eb)] transition-[width] duration-100 ease-out"
          style={{ width: `${display}%` }}
        />
      </div>
      {active ? (
        <div className="absolute right-3 top-2 rounded-md bg-[var(--color-brand-primary,#2563eb)] px-2.5 py-1 text-xs font-semibold tabular-nums text-white shadow-md">
          {label} {display}%
        </div>
      ) : null}
    </div>
  );
}
