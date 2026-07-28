import type { IconComponent } from "@/lib/utils/icons";
import { formatNumberCompact } from "@/lib/utils/formatCurrency";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Spinner } from "@/components/atoms/Spinner";
import { cn } from "@/lib/utils/cn";

export interface KpiCardProps {
  label: string;
  icon: IconComponent;
  value: number | string;
  delta?: number;
  deltaLabel?: string;
  deltaPercent?: string;
  /** Tint preset from home.jsx: emerald | blue | purple | rose */
  tint?: "emerald" | "blue" | "purple" | "rose";
  color?: string;
  /** When true, keep label/icon and skeleton only the value. */
  isLoading?: boolean;
  /**
   * `skeleton` (default) — value skeletons.
   * `zero-spinner` — show 0 + spinner (VAG / legacy Ultimate POS feel).
   */
  loadingDisplay?: "skeleton" | "zero-spinner";
  className?: string;
}

const tintClasses = {
  emerald: {
    bg: "bg-[var(--color-kpi-emerald-bg)]",
    fg: "text-[var(--color-kpi-emerald-fg)]",
  },
  blue: {
    bg: "bg-[var(--color-kpi-blue-bg)]",
    fg: "text-[var(--color-kpi-blue-fg)]",
  },
  purple: {
    bg: "bg-[var(--color-kpi-purple-bg)]",
    fg: "text-[var(--color-kpi-purple-fg)]",
  },
  rose: {
    bg: "bg-[var(--color-kpi-rose-bg)]",
    fg: "text-[var(--color-kpi-rose-fg)]",
  },
} as const;

export function KpiCard({
  label,
  icon: Icon,
  value,
  delta,
  deltaLabel,
  deltaPercent,
  tint = "emerald",
  isLoading = false,
  loadingDisplay = "skeleton",
  className,
}: KpiCardProps) {
  const tintStyle = tintClasses[tint];
  const deltaTone =
    delta === undefined ? "neutral" : delta >= 0 ? "positive" : "negative";
  const showZeroSpinner = isLoading && loadingDisplay === "zero-spinner";

  return (
    <article
      className={cn(
        "hq6-kpi-card flex min-h-[var(--space-kpi-height)] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
      aria-busy={isLoading || undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tintStyle.bg,
            tintStyle.fg,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold leading-snug text-foreground sm:text-base">
          {label}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {showZeroSpinner ? (
          <>
            <span className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              0
            </span>
            <Spinner size="sm" className="text-muted" />
            <span className="text-xs text-muted">Loading…</span>
          </>
        ) : isLoading ? (
          <>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-16" />
          </>
        ) : (
          <>
            <span className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {typeof value === "number" ? formatNumberCompact(value) : value}
            </span>
            {delta !== undefined ? (
              <span
                className={cn(
                  "text-sm font-medium",
                  deltaTone === "positive" && "text-[var(--color-kpi-emerald-fg)]",
                  deltaTone === "negative" && "text-[var(--color-error-text)]",
                )}
              >
                {delta >= 0 ? "+" : ""}
                {formatNumberCompact(delta)}
                {deltaLabel ? (
                  <span className="font-normal text-muted"> {deltaLabel}</span>
                ) : null}
              </span>
            ) : null}
            {deltaPercent ? (
              <span className="text-sm font-medium text-[var(--color-kpi-emerald-fg)]">
                {deltaPercent}
                {deltaLabel ? (
                  <span className="font-normal text-muted"> {deltaLabel}</span>
                ) : null}
              </span>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
