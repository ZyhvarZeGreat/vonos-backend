import type { KpiCardConfig } from "@vonos/types";
import {
  ArrowDown,
  ArrowUp,
  Calculator,
  Package,
} from "lucide-react";
import { KpiCard } from "@/components/molecules/KpiCard";
import { KpiRowSkeleton } from "@/components/organisms/skeletons";
import type { IconComponent } from "@/lib/utils/icons";
import { cn } from "@/lib/utils/cn";

const iconMap: Record<string, IconComponent> = {
  boxes: Package,
  package: Package,
  "arrow-down-to-line": ArrowDown,
  "arrow-down": ArrowDown,
  "arrow-up-from-line": ArrowUp,
  "arrow-up": ArrowUp,
  wallet: Calculator,
  calculator: Calculator,
};

const tintByMetric: Record<string, "emerald" | "blue" | "purple" | "rose"> = {
  totalSku: "emerald",
  todayInbound: "blue",
  todayOutbound: "purple",
  stockValue: "rose",
};

export interface KpiRowProps {
  cards: KpiCardConfig[];
  values: Record<string, number | string>;
  deltas?: Record<string, number>;
  deltaLabels?: Record<string, string>;
  deltaPercents?: Record<string, string>;
  isLoading?: boolean;
  /** Passed to each KpiCard — VAG uses `zero-spinner`. */
  loadingDisplay?: "skeleton" | "zero-spinner";
  className?: string;
}

export function KpiRow({
  cards,
  values,
  deltas = {},
  deltaLabels = {},
  deltaPercents = {},
  isLoading = false,
  loadingDisplay = "skeleton",
  className,
}: KpiRowProps) {
  // No known labels yet — fall back to blank card skeletons (unless zero-spinner).
  if (isLoading && cards.length === 0 && loadingDisplay === "skeleton") {
    return <KpiRowSkeleton count={4} className={className} />;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2",
        cards.length > 4 ? "lg:grid-cols-3" : "lg:grid-cols-4",
        className,
      )}
      aria-busy={isLoading || undefined}
    >
      {cards.map((card) => {
        const Icon = iconMap[card.icon] ?? Package;
        const tint = tintByMetric[card.metricKey] ?? "emerald";
        const zeroWhileLoading =
          isLoading && loadingDisplay === "zero-spinner"
            ? typeof values[card.metricKey] === "number"
              ? 0
              : "0"
            : undefined;
        return (
          <KpiCard
            key={card.metricKey}
            label={card.label}
            icon={Icon}
            value={
              zeroWhileLoading ??
              values[card.metricKey] ??
              (loadingDisplay === "zero-spinner" ? "0" : "—")
            }
            delta={isLoading ? undefined : deltas[card.metricKey]}
            deltaLabel={isLoading ? undefined : deltaLabels[card.metricKey]}
            deltaPercent={isLoading ? undefined : deltaPercents[card.metricKey]}
            tint={tint}
            isLoading={isLoading}
            loadingDisplay={loadingDisplay}
          />
        );
      })}
    </div>
  );
}
