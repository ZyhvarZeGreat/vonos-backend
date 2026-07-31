"use client";

import { cn } from "@/lib/utils/cn";

/**
 * In-place read-load progress — "Loading 42%" with a determinate bar.
 * Use while tables / invoice print payloads are fetching.
 */
export function Hq6LoadProgress({
  percent,
  label = "Loading",
  className,
  compact = false,
}: {
  percent: number;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const display = Math.round(Math.min(100, Math.max(0, percent)));

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        compact ? "py-2" : "py-6",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={display}
      aria-valuetext={`${label} ${display}%`}
      aria-busy={display < 100}
    >
      <p
        className={cn(
          "font-semibold tabular-nums text-[#3c8dbc]",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {label} {display}%
      </p>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-[#e5e7eb]",
          compact ? "h-1.5 max-w-[12rem]" : "h-2 max-w-[16rem]",
        )}
      >
        <div
          className="h-full rounded-full bg-[#3c8dbc] transition-[width] duration-100 ease-out"
          style={{ width: `${display}%` }}
        />
      </div>
    </div>
  );
}
