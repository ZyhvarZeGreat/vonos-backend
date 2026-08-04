"use client";

import { cn } from "@/lib/utils/cn";

/**
 * In-place load hint for empty tables and filter refetch overlays.
 */
export function Hq6LoadProgress({
  percent,
  label = "Loading",
  className,
  compact = false,
}: {
  /** Ignored for display — kept for call-site compatibility. */
  percent?: number;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        compact ? "py-2" : "py-6",
        className,
      )}
      role="status"
      aria-busy
      aria-live="polite"
    >
      <p
        className={cn(
          "font-medium text-[#6b7280]",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {label}…
      </p>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-[#e5e7eb]",
          compact ? "h-1 max-w-[10rem]" : "h-1.5 max-w-[12rem]",
        )}
      >
        <div className="mutation-progress-bar h-full bg-[#3c8dbc]" />
      </div>
    </div>
  );
}
