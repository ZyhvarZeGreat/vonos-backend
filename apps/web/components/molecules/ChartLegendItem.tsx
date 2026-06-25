import { cn } from "@/lib/utils/cn";

export interface ChartLegendItemProps {
  label: string;
  color: string;
  value?: string | number;
  className?: string;
}

export function ChartLegendItem({
  label,
  color,
  value,
  className,
}: ChartLegendItemProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted">{label}</span>
      {value !== undefined ? (
        <span className="ml-auto font-medium text-foreground">{value}</span>
      ) : null}
    </div>
  );
}
