import { cn } from "@/lib/utils/cn";
import { formatNumberCompact } from "@/lib/utils/formatCurrency";

export interface EntitySwitcherItemProps {
  code: string;
  name: string;
  metricLabel: string;
  metricValue: number;
  active?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function EntitySwitcherItem({
  code,
  name,
  metricLabel,
  metricValue,
  active = false,
  onSelect,
  className,
}: EntitySwitcherItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
        active
          ? "border-brand bg-info-bg"
          : "border-border bg-card hover:bg-[var(--color-surface-muted)]",
        className,
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {code}
        </p>
        <p className="text-sm font-medium text-foreground">{name}</p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted">{metricLabel}</p>
        <p className="text-sm font-semibold text-foreground">
          {formatNumberCompact(metricValue)}
        </p>
      </div>
    </button>
  );
}
