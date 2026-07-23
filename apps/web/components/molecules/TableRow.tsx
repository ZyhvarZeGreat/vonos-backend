import { cn } from "@/lib/utils/cn";
import type { TableDensity } from "@/lib/utils/tableColumnAlign";
import { TABLE_DENSITY_PX } from "@/lib/utils/tableColumnAlign";

export interface TableRowProps {
  cells: React.ReactNode[];
  /** Per-cell className (align, sticky, etc.). */
  cellClassNames?: Array<string | undefined>;
  density?: TableDensity;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function TableRow({
  cells,
  cellClassNames,
  density = "regular",
  onClick,
  selected = false,
  className,
}: TableRowProps) {
  const rowHeight = TABLE_DENSITY_PX[density];
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border transition-colors",
        onClick && "cursor-pointer hover:bg-[var(--color-surface-muted)]",
        selected && "bg-info-bg/40",
        className,
      )}
      style={{ height: rowHeight }}
    >
      {cells.map((cell, index) => (
        <td
          key={index}
          className={cn(
            "px-4 text-sm text-foreground align-middle",
            cellClassNames?.[index],
          )}
          style={{
            height: rowHeight,
            paddingTop: density === "condensed" ? 6 : density === "relaxed" ? 14 : 10,
            paddingBottom: density === "condensed" ? 6 : density === "relaxed" ? 14 : 10,
          }}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}
