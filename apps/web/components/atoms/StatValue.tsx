import { cn } from "@/lib/utils/cn";
import { formatNumberCompact } from "@/lib/utils/formatCurrency";

export interface StatValueProps {
  value: number | string;
  delta?: number;
  deltaLabel?: string;
  className?: string;
}

export function StatValue({
  value,
  delta,
  deltaLabel,
  className,
}: StatValueProps) {
  const formattedValue =
    typeof value === "number" ? formatNumberCompact(value) : value;
  const deltaTone =
    delta === undefined ? "neutral" : delta >= 0 ? "positive" : "negative";

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {formattedValue}
      </p>
      {delta !== undefined ? (
        <p
          className={cn(
            "text-xs font-medium",
            deltaTone === "positive" && "text-success",
            deltaTone === "negative" && "text-error",
            deltaTone === "neutral" && "text-muted",
          )}
        >
          {delta >= 0 ? "+" : ""}
          {formatNumberCompact(delta)}
          {deltaLabel ? ` ${deltaLabel}` : ""}
        </p>
      ) : null}
    </div>
  );
}
