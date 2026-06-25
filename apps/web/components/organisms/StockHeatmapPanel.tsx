"use client";

import { Button } from "@/components/atoms/Button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface HeatmapCell {
  category: string;
  size: string;
  quantity: number;
}

export interface StockHeatmapPanelProps {
  title?: string;
  subtitle?: string;
  sizes: readonly string[];
  categories: readonly string[];
  data: HeatmapCell[];
  accentColor?: string;
  periodLabel?: string;
  className?: string;
}

function cellQuantity(
  data: HeatmapCell[],
  category: string,
  size: string,
): number {
  return data.find((c) => c.category === category && c.size === size)?.quantity ?? 0;
}

function cellStyle(quantity: number, accentColor: string): React.CSSProperties {
  if (quantity === 0) {
    return { backgroundColor: "#fef2f2", color: "#9ca3af" };
  }
  const max = 70;
  const ratio = Math.min(quantity / max, 1);
  const opacity = 0.15 + ratio * 0.75;
  return {
    backgroundColor: `${accentColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`,
    color: ratio < 0.3 ? "#78716c" : "#1c1917",
  };
}

export function StockHeatmapPanel({
  title = "Variant Stock Heatmap",
  subtitle = "Size × category availability across collections",
  sizes,
  categories,
  data,
  accentColor = "#F59E0B",
  periodLabel = "Last 30 days",
  className,
}: StockHeatmapPanelProps) {
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
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="pb-2 pr-2 text-left text-xs font-medium text-muted">Category</th>
              {sizes.map((size) => (
                <th key={size} className="px-1 pb-2 text-center text-xs font-medium text-foreground">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category}>
                <td className="py-1.5 pr-2 text-xs font-medium text-muted">{category}</td>
                {sizes.map((size) => {
                  const qty = cellQuantity(data, category, size);
                  return (
                    <td key={size} className="p-0.5">
                      <div
                        className={cn(
                          "flex h-9 items-center justify-center rounded-md text-xs font-semibold",
                          qty === 0 && "line-through",
                        )}
                        style={cellStyle(qty, accentColor)}
                      >
                        {qty}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
