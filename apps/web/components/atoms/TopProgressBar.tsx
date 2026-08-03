"use client";

import { useEffect, useState } from "react";
import { useMutationBusyStore } from "@/stores/mutationBusyStore";
import { useNavigationBusyStore } from "@/stores/navigationBusyStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

/**
 * Thin top bar for route / entity switches only.
 * List search and background React Query refetches must NOT flash a fake % —
 * tables keep previous rows via placeholderData.
 */
export function TopProgressBar({ className }: { className?: string }) {
  const writeBusy = useMutationBusyStore(
    (s) => s.pendingCount > 0 || s.finishing,
  );
  const navPending = useNavigationBusyStore((s) => s.pending);
  const entitySwitch = useUiStore((s) => s.entitySwitch);
  const [visible, setVisible] = useState(false);

  const entityBusy = Boolean(entitySwitch);
  const active = !writeBusy && (navPending || entityBusy);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 180);
    return () => clearTimeout(t);
  }, [active]);

  if ((!visible && !active) || writeBusy) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[199] transition-opacity duration-150",
        active ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <div
        className="h-0.5 w-full overflow-hidden bg-transparent"
        role="progressbar"
        aria-valuetext={
          entitySwitch ? `Switching to ${entitySwitch.name}` : "Loading"
        }
        aria-busy={active}
        aria-hidden={!active}
      >
        <div className="animate-top-progress h-full w-full origin-left bg-[var(--color-brand-primary,#2563eb)]" />
      </div>
    </div>
  );
}
