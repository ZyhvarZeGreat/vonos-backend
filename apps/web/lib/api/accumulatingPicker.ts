import {
  FILTER_DROPDOWN_INITIAL_LIMIT,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { matchSorter, rankings } from "match-sorter";

/** Batch size for filter dropdown infinite scroll (~100 first, then more). */
export const FILTER_DROPDOWN_BATCH_SIZE = 100;

export type AccumulatingPickerPage<T> = {
  /** Full accumulated list so far (browse mode) or search hits. */
  items: T[];
  /** Only the newly fetched rows (for append UIs). */
  appended: T[];
  hasMore: boolean;
};

type RosterState<T extends { id: string }> = {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
};

type FetchPageFn<T extends { id: string }> = (
  cursor: string | undefined,
  limit: number,
  search?: string,
) => Promise<ListPage<T> | T[]>;

function asPage<T extends { id: string }>(
  payload: ListPage<T> | T[],
  limit: number,
): ListPage<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      hasMore: payload.length >= limit,
      pageSize: limit,
    };
  }
  return payload;
}

/**
 * Progressive filter-catalog loader:
 * - Open → first batch (~100)
 * - Scroll → keep appending batches until exhausted
 * - Search → match loaded rows first; if none, fetch from API and merge
 */
export function createAccumulatingPicker<T extends { id: string }>(opts: {
  getCursor: (row: T) => string;
  fetchPage: FetchPageFn<T>;
  searchKeys: Array<string | ((row: T) => string)>;
  batchSize?: number;
}) {
  const batchSize = opts.batchSize ?? FILTER_DROPDOWN_BATCH_SIZE;
  const rosters = new Map<string, RosterState<T>>();

  function clear(cacheKey: string): void {
    rosters.delete(cacheKey);
  }

  function clearAll(): void {
    rosters.clear();
  }

  async function ensureFirst(
    cacheKey: string,
  ): Promise<AccumulatingPickerPage<T>> {
    const existing = rosters.get(cacheKey);
    if (existing && existing.items.length > 0) {
      return {
        items: existing.items,
        appended: [],
        hasMore: existing.hasMore,
      };
    }
    const page = asPage(await opts.fetchPage(undefined, batchSize), batchSize);
    const last = page.items[page.items.length - 1];
    const state: RosterState<T> = {
      items: page.items,
      nextCursor: last && page.hasMore ? opts.getCursor(last) : undefined,
      hasMore: page.hasMore,
    };
    rosters.set(cacheKey, state);
    return {
      items: state.items,
      appended: state.items,
      hasMore: state.hasMore,
    };
  }

  async function loadMore(
    cacheKey: string,
  ): Promise<AccumulatingPickerPage<T>> {
    const state = rosters.get(cacheKey);
    if (!state) return ensureFirst(cacheKey);
    if (!state.hasMore || !state.nextCursor) {
      return { items: state.items, appended: [], hasMore: false };
    }
    const page = asPage(
      await opts.fetchPage(state.nextCursor, batchSize),
      batchSize,
    );
    const seen = new Set(state.items.map((row) => row.id));
    const fresh = page.items.filter((row) => !seen.has(row.id));
    state.items = [...state.items, ...fresh];
    const last = page.items[page.items.length - 1];
    state.hasMore = page.hasMore && fresh.length > 0;
    state.nextCursor =
      last && state.hasMore ? opts.getCursor(last) : undefined;
    rosters.set(cacheKey, state);
    return {
      items: state.items,
      appended: fresh,
      hasMore: state.hasMore,
    };
  }

  async function search(
    cacheKey: string,
    query: string,
  ): Promise<AccumulatingPickerPage<T>> {
    const q = query.trim();
    if (!q) return ensureFirst(cacheKey);

    // Make sure we have at least the first batch to search locally.
    const localRoster = await ensureFirst(cacheKey);
    const localHits = matchSorter(localRoster.items, q, {
      keys: opts.searchKeys,
      threshold: rankings.CONTAINS,
      keepDiacritics: false,
    });
    if (localHits.length > 0) {
      return { items: localHits, appended: localHits, hasMore: false };
    }

    // Not in the loaded window — ask the API and merge into the roster.
    const page = asPage(await opts.fetchPage(undefined, batchSize, q), batchSize);
    const state = rosters.get(cacheKey) ?? {
      items: [],
      hasMore: true,
    };
    const seen = new Set(state.items.map((row) => row.id));
    const fresh = page.items.filter((row) => !seen.has(row.id));
    if (fresh.length > 0) {
      state.items = [...state.items, ...fresh];
      rosters.set(cacheKey, state);
    }
    return {
      items: page.items,
      appended: page.items,
      hasMore: false,
    };
  }

  /** Browse (no query) or search — used by AsyncMenuSelect open / type. */
  async function load(
    cacheKey: string,
    query?: string,
  ): Promise<AccumulatingPickerPage<T>> {
    const q = query?.trim() ?? "";
    return q ? search(cacheKey, q) : ensureFirst(cacheKey);
  }

  /** Snapshot of accumulated rows (may be empty before first load). */
  function peek(cacheKey: string): T[] {
    return rosters.get(cacheKey)?.items ?? [];
  }

  function hasMore(cacheKey: string): boolean {
    return rosters.get(cacheKey)?.hasMore ?? true;
  }

  return {
    batchSize,
    load,
    loadMore,
    search,
    ensureFirst,
    peek,
    hasMore,
    clear,
    clearAll,
  };
}

/** Re-export batch size alias used by older call sites. */
export { FILTER_DROPDOWN_INITIAL_LIMIT };
