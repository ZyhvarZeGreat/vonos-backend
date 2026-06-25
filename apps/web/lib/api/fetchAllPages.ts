/** Default page size for list views (one request instead of unbounded pagination). */
export const DEFAULT_LIST_LIMIT = 500;

/** Fetch a single cursor page — avoids N round-trips from fetchAllPages. */
export async function fetchFirstPage<T extends { id: string }>(
  fetchPage: (cursor?: string, limit?: number) => Promise<T[]>,
  limit = DEFAULT_LIST_LIMIT,
): Promise<T[]> {
  return fetchPage(undefined, limit);
}

/** Fetch every page from a cursor-paginated list API (items must have `id`). */
export async function fetchAllPages<T extends { id: string }>(
  fetchPage: (cursor?: string, limit?: number) => Promise<T[]>,
  pageSize = 500,
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
