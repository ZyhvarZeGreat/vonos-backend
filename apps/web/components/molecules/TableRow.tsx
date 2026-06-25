import { cn } from "@/lib/utils/cn";

export interface TableRowProps {
  cells: React.ReactNode[];
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function TableRow({
  cells,
  onClick,
  selected = false,
  className,
}: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-border transition-colors",
        onClick && "cursor-pointer hover:bg-[var(--color-surface-muted)]",
        selected && "bg-info-bg/40",
        className,
      )}
    >
      {cells.map((cell, index) => (
        <td key={index} className="px-4 py-3 text-sm text-foreground">
          {cell}
        </td>
      ))}
    </tr>
  );
}
