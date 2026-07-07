/** Rows shown per table page — matches DataTable default. */
export const DEFAULT_TABLE_PAGE_SIZE = 25;

/** @deprecated Use DEFAULT_TABLE_PAGE_SIZE */
export const DEFAULT_LIST_LIMIT = DEFAULT_TABLE_PAGE_SIZE;

/** Chunk size when explicitly fetching an entire list (export only). */
export const EXPORT_PAGE_SIZE = 500;

export interface ListPage<T> {
  items: T[];
  hasMore: boolean;
  pageSize: number;
}

/** Fetch one cursor page and infer whether more rows exist server-side. */
export async function fetchListPage<T extends { id: string }>(
  fetchPage: (cursor?: string, limit?: number) => Promise<T[]>,
  cursor?: string,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<T>> {
  const items = await fetchPage(cursor, limit);
  return {
    items,
    hasMore: items.length >= limit,
    pageSize: limit,
  };
}

/** First page only — default for list views (no unbounded pagination). */
export async function fetchFirstPage<T extends { id: string }>(
  fetchPage: (cursor?: string, limit?: number) => Promise<T[]>,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<T[]> {
  return fetchPage(undefined, limit);
}

/** Fetch every page — export / admin tooling only, never for table initial render. */
export async function fetchAllPages<T extends { id: string }>(
  fetchPage: (cursor?: string, limit?: number) => Promise<T[]>,
  pageSize = EXPORT_PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await fetchPage(cursor, pageSize);
    all.push(...page);
    if (page.length < pageSize) break;
    cursor = page[page.length - 1]!.id;
  }

  return all;
}
