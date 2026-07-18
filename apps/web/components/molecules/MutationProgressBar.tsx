"use client";

import { useMutationBusyStore } from "@/stores/mutationBusyStore";
import { cn } from "@/lib/utils/cn";

/** Thin top progress bar while any React Query mutation is in flight. */
export function MutationProgressBar() {
  const pending = useMutationBusyStore((state) => state.pendingCount > 0);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden transition-opacity duration-200",
        pending ? "opacity-100" : "opacity-0",
      )}
      role="progressbar"
      aria-hidden={!pending}
      aria-valuetext={pending ? "Saving" : undefined}
    >
      <div className="mutation-progress-bar h-full w-full bg-[var(--color-brand-primary)]" />
    </div>
  );
}
