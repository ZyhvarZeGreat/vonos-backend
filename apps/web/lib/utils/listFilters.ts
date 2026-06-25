import { isWithinDateRange, type DateRangeBounds } from "@/lib/utils/dateRange";

function fieldValue<T extends object>(
  row: T,
  key: keyof T | string,
): unknown {
  return (row as Record<string, unknown>)[String(key)];
}

/** Client-side search across one or more string fields. */
export function filterBySearch<T extends object>(
  rows: T[],
  search: string,
  keys: (keyof T | string)[],
): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    keys.some((key) =>
      String(fieldValue(row, key) ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );
}

/** Filter rows where a date-like field falls in the preset bounds. */
export function filterByDateField<T extends object>(
  rows: T[],
  bounds: DateRangeBounds | null,
  dateField: keyof T | string,
): T[] {
  if (!bounds) return rows;
  return rows.filter((row) => {
    const raw = fieldValue(row, dateField);
    if (typeof raw !== "string" || !raw) return true;
    return isWithinDateRange(raw, bounds);
  });
}

/** Build sorted unique dropdown options from a field on each row. */
export function uniqueFieldOptions<T>(
  rows: T[],
  field: keyof T | ((row: T) => string | null | undefined),
): { value: string; label: string }[] {
  const values = new Set<string>();
  for (const row of rows) {
    const raw =
      typeof field === "function"
        ? field(row)
        : (row[field] as string | null | undefined);
    if (raw) values.add(String(raw));
  }
  return [...values].sort().map((value) => ({ value, label: value }));
}
