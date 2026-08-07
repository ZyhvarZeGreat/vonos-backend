import { matchSorter, rankings } from "match-sorter";

/**
 * Shared client-side search — match-sorter ranked contains/prefix.
 * Use for every in-memory list / picker / report filter across the app
 * (including VAG). Never hits the API.
 */

export type MatchSearchKey<T> =
  | string
  | ((item: T) => string | number | null | undefined);

const MATCH_OPTS = {
  threshold: rankings.CONTAINS,
  // Fold accents so "cafe" matches "Café" — staff type without diacritics.
  keepDiacritics: false,
} as const;

/** Cheap prefilter threshold — avoid ranking the whole catalog on every keystroke. */
const LARGE_CATALOG = 400;

function isAscii(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 127) return false;
  }
  return true;
}

function fold(value: string): string {
  // ASCII path skips NFD + Unicode property escapes (hot on large catalogs).
  if (isAscii(value)) return value.toLowerCase();
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function keyValue(row: unknown, key: MatchSearchKey<never>): string {
  if (typeof key === "function") {
    const v = key(row as never);
    if (v == null) return "";
    return String(v);
  }
  if (row == null || typeof row !== "object") return "";
  const v = (row as Record<string, unknown>)[key];
  if (v == null) return "";
  return String(v);
}

function rowContainsQuery(
  row: unknown,
  foldedQuery: string,
  keys: MatchSearchKey<never>[],
): boolean {
  if (keys.length === 0) {
    return fold(rowSearchBlob(row)).includes(foldedQuery);
  }
  for (const key of keys) {
    if (fold(keyValue(row, key)).includes(foldedQuery)) return true;
  }
  return false;
}

/**
 * Lightweight rank for large catalogs after a contains prefilter.
 * Prefix hits first, then other contains — avoids match-sorter on hundreds of rows.
 */
function rankContainsHits<T>(
  rows: readonly T[],
  foldedQuery: string,
  keys: MatchSearchKey<T>[],
): T[] {
  const typedKeys = keys as MatchSearchKey<never>[];
  const prefix: T[] = [];
  const rest: T[] = [];

  for (const row of rows) {
    let isPrefix = false;
    if (typedKeys.length === 0) {
      isPrefix = fold(rowSearchBlob(row)).startsWith(foldedQuery);
    } else {
      for (const key of typedKeys) {
        if (fold(keyValue(row, key)).startsWith(foldedQuery)) {
          isPrefix = true;
          break;
        }
      }
    }
    if (isPrefix) prefix.push(row);
    else rest.push(row);
  }

  return prefix.length === 0 ? [...rows] : [...prefix, ...rest];
}

/**
 * Filter rows with explicit keys (preferred when you know the fields).
 */
export function matchSearchRows<T>(
  rows: readonly T[],
  rawSearch: string,
  keys: MatchSearchKey<T>[],
): T[] {
  const q = rawSearch.trim();
  if (!q || rows.length === 0) return [...rows];
  if (keys.length === 0) return filterRowsBySearch([...rows], q);

  const typedKeys = keys as MatchSearchKey<never>[];
  const foldedQ = fold(q);

  if (rows.length > LARGE_CATALOG) {
    const pool = rows.filter((row) =>
      rowContainsQuery(row, foldedQ, typedKeys),
    );
    return rankContainsHits(pool, foldedQ, keys);
  }

  return matchSorter([...rows], q, {
    keys: keys as Array<string | ((item: T) => string)>,
    ...MATCH_OPTS,
  });
}

/**
 * Client-side list search over the sliding-window page already in memory.
 * Indexes top-level strings, numbers, and string/number arrays (e.g. variation
 * values). Nested objects are skipped so typing stays instant on fat DTOs.
 */
export function filterRowsBySearch<T>(rows: T[], rawSearch: string): T[] {
  const q = rawSearch.trim();
  if (!q || rows.length === 0) return rows;

  const foldedQ = fold(q);

  if (rows.length > LARGE_CATALOG) {
    const pool = rows.filter((row) => rowContainsQuery(row, foldedQ, []));
    return rankContainsHits(pool, foldedQ, []);
  }

  return matchSorter(rows, q, {
    keys: [rowSearchBlob],
    ...MATCH_OPTS,
  });
}

export function rowMatchesListSearch(
  row: unknown,
  rawSearch: string,
): boolean {
  const q = rawSearch.trim();
  if (!q) return true;
  return rowContainsQuery(row, fold(q), []);
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
