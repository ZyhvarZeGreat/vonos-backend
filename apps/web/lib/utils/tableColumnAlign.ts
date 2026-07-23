export type ColumnAlign = "left" | "right";

export type TableDensity = "condensed" | "regular" | "relaxed";

export const TABLE_DENSITY_PX: Record<TableDensity, number> = {
  condensed: 40,
  regular: 48,
  relaxed: 56,
};

type AlignableColumn = {
  align?: ColumnAlign;
  numeric?: boolean;
};

export function resolveColumnAlign(column: AlignableColumn): ColumnAlign {
  if (column.align) return column.align;
  if (column.numeric) return "right";
  return "left";
}

export function columnCellClassName(column: AlignableColumn): string {
  const align = resolveColumnAlign(column);
  const numeric = Boolean(column.numeric) || align === "right";
  return [
    align === "right" ? "text-right" : "text-left",
    numeric ? "tabular-nums" : null,
  ]
    .filter(Boolean)
    .join(" ");
}
