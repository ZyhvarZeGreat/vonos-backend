"use client";

import { Button } from "@/components/atoms/Button";
import { ChevronDown } from "lucide-react";
import { formatCurrencyCompact } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

export interface RankedListItem {
  label: string;
  units: number;
  revenue?: number;
  currency?: string;
}

export interface RankedListPanelProps {
  title?: string;
  subtitle?: string;
  items: RankedListItem[];
  accentColor?: string;
  periodLabel?: string;
  className?: string;
  onItemClick?: (item: RankedListItem) => void;
}

function formatUnits(units: number): string {
  if (Number.isInteger(units)) return String(units);
  return units.toFixed(1);
}

export function RankedListPanel({
  title = "Top Selling Items",
  subtitle = "Units sold and revenue for the selected period",
  items,
  accentColor = "#14B8A6",
  periodLabel = "This period",
  className,
  onItemClick,
}: RankedListPanelProps) {
  const max = Math.max(...items.map((i) => i.units), 1);

  return (
    <section
      className={cn(
        "flex h-[var(--space-chart-height)] flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <Button variant="secondary" size="sm" className="gap-2">
          {periodLabel}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              className={cn(
                "w-full text-left",
                onItemClick && "rounded-lg transition-colors hover:bg-[var(--color-surface-muted)]",
              )}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
              disabled={!onItemClick}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-foreground">{item.label}</span>
                <span className="shrink-0 text-right text-muted">
                  <span className="font-medium text-foreground">
                    {formatUnits(item.units)} units
                  </span>
                  {item.revenue != null ? (
                    <span className="ml-2">
                      · {formatCurrencyCompact(item.revenue, item.currency ?? "NGN")}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.units / max) * 100}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
