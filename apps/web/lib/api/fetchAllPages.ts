/** Rows shown per table page — matches DataTable default. */
export const DEFAULT_TABLE_PAGE_SIZE = 10;

/** @deprecated Use DEFAULT_TABLE_PAGE_SIZE */
export const DEFAULT_LIST_LIMIT = DEFAULT_TABLE_PAGE_SIZE;

/** Max rows for searchable dropdowns / typeahead (never dump full catalogs). */
export const TYPEAHEAD_PAGE_SIZE = 40;

/** Chunk size when explicitly fetching an entire list (export only). */
export const EXPORT_PAGE_SIZE = 500;

/** Hard cap for export / admin full-list fetches — avoids unbounded browser hangs. */
export const EXPORT_MAX_ROWS = 10_000;

export interface ListPage<T> {
  items: T[];
  hasMore: boolean;
  pageSize: number;
  /** Filtered row count from the API (cursor lists). */
  totalCount?: number;
}

export type ListSortDirection = "asc" | "desc";

export interface ListSortState {
  sortBy: string;
  sortDir: ListSortDirection;
}

type ListApiPayload<T> =
  | T[]
  | {
      items: T[];
      totalCount?: number;
      hasMore?: boolean;
    };

function normalizeListPayload<T extends { id: string }>(
  payload: ListApiPayload<T>,
  limit: number,
): ListPage<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      hasMore: payload.length >= limit,
      pageSize: limit,
    };
  }
  const items = payload.items ?? [];
  return {
    items,
    hasMore: payload.hasMore ?? items.length >= limit,
    pageSize: limit,
    totalCount: payload.totalCount,
  };
}

/** Fetch one cursor page and infer whether more rows exist server-side. */
export async function fetchListPage<T extends { id: string }>(
  fetchPage: (cursor?: string, limit?: number) => Promise<ListApiPayload<T>>,
  cursor?: string,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<T>> {
  const payload = await fetchPage(cursor, limit);
  return normalizeListPayload(payload, limit);
}

/** First page only — default for list views (no unbounded pagination). */
export async function fetchFirstPage<T extends { id: string }>(
  fetchPage: (cursor?: string, limit?: number) => Promise<ListApiPayload<T>>,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<T[]> {
  const page = await fetchListPage(fetchPage, undefined, limit);
  return page.items;
}

/**
 * Fetch every page — **export / admin tooling only**.
 * Never use for table initial render or dropdown options.
 * Stops at `maxRows` (default EXPORT_MAX_ROWS) to protect the browser.
 */
export async function fetchAllPages<T extends { id: string }>(
  fetchPage: (cursor?: string, limit?: number) => Promise<ListApiPayload<T>>,
  pageSize = EXPORT_PAGE_SIZE,
  getCursor: (row: T) => string = (row) => row.id,
  maxRows = EXPORT_MAX_ROWS,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await fetchListPage(fetchPage, cursor, pageSize);
    all.push(...page.items);
    if (!page.hasMore || all.length >= maxRows) break;
    cursor = getCursor(page.items[page.items.length - 1]!);
  }

  return all.length > maxRows ? all.slice(0, maxRows) : all;
}
