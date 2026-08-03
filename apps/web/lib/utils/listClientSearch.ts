import { matchSorter, rankings } from "match-sorter";

/**
 * Client-side list search over the sliding-window page already in memory.
 * Uses match-sorter for ranked contains/prefix matching — never hits the API.
 *
 * Indexes top-level strings, numbers, and string/number arrays (e.g. variation
 * values). Nested objects are skipped so typing stays instant on fat DTOs.
 */
export function filterRowsBySearch<T>(rows: T[], rawSearch: string): T[] {
  const q = rawSearch.trim();
  if (!q || rows.length === 0) return rows;

  return matchSorter(rows, q, {
    keys: [rowSearchBlob],
    threshold: rankings.CONTAINS,
    keepDiacritics: true,
  });
}

export function rowMatchesListSearch(
  row: unknown,
  rawSearch: string,
): boolean {
  const q = rawSearch.trim();
  if (!q) return true;
  return filterRowsBySearch([row], q).length > 0;
}

/** Flatten searchable top-level scalars (and flat arrays) for match-sorter. */
function rowSearchBlob(row: unknown): string {
  if (row == null) return "";
  if (typeof row === "string" || typeof row === "number") return String(row);
  if (typeof row !== "object") return "";

  const parts: string[] = [];
  for (const value of Object.values(row as Record<string, unknown>)) {
    pushSearchPart(parts, value);
  }
  return parts.join(" ");
}

function pushSearchPart(parts: string[], value: unknown): void {
  if (typeof value === "string") {
    if (value) parts.push(value);
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    parts.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        if (item) parts.push(item);
      } else if (typeof item === "number" && Number.isFinite(item)) {
        parts.push(String(item));
      }
    }
  }
}
