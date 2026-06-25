import type { IconComponent } from "@/lib/utils/icons";
import { formatNumberCompact } from "@/lib/utils/formatCurrency";
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
  className,
}: KpiCardProps) {
  const tintStyle = tintClasses[tint];
  const deltaTone =
    delta === undefined ? "neutral" : delta >= 0 ? "positive" : "negative";

  return (
    <article
      className={cn(
        "flex h-[var(--space-kpi-height)] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tintStyle.bg,
            tintStyle.fg,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-base font-semibold text-foreground">{label}</span>
      </div>
      <div className="mt-auto flex items-baseline gap-2">
        <span className="font-heading text-3xl font-semibold tracking-tight text-foreground">
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
      </div>
    </article>
  );
}
