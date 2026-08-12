"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListPage, ListSortState } from "@/lib/api/fetchAllPages";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/search";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useUrlCursorPage } from "@/lib/hooks/useUrlCursorPage";
import { filterRowsBySearch } from "@/lib/utils/listClientSearch";
import { stableListFilterKey } from "@/lib/utils/stableListFilterKey";
import { slidingJumpMaxIndex, totalPagesFromEntries } from "@/lib/utils/paginationWindow";

/** Stable React Query key for one cursor page (primitives only — no object identity). */
function listPageQueryKey(
  queryKey: readonly unknown[],
  filterKey: string,
  pageIndex: number,
  cursor: string | undefined,
  pageSize: number,
  sort: ListSortState | null,
) {
  return [
    ...queryKey,
    filterKey,
    pageIndex,
    cursor ?? null,
    pageSize,
    sort?.sortBy ?? null,
    sort?.sortDir ?? null,
  ] as const;
}

export interface ListPageSummary {
  totalCount?: number;
  amountSummary?: ListPage<{ id: string }>["amountSummary"];
}

export interface ListPageFetchOpts {
  /** When false, API skips count/amountSummary for faster first paint. */
  includeSummary?: boolean;
  /** Abort in-flight page loads when the query key changes / unmounts. */
  signal?: AbortSignal;
  /** Debounced typedown search (server mode only). */
  search?: string;
}

export interface UseServerListPageOptions<T extends { id: string }> {
  queryKey: readonly unknown[];
  fetchPage: (
    cursor: string | undefined,
    limit: number,
    sort: ListSortState | null,
    opts?: ListPageFetchOpts,
  ) => Promise<ListPage<T>>;
  /**
   * Optional deferred count/amountSummary fetch. When omitted and
   * `deferSummary` is true, a second request runs with includeSummary=true.
   * Receives the same debounced `search` as page fetches in server mode.
   */
  fetchSummary?: (opts?: { search?: string }) => Promise<ListPageSummary>;
  /**
   * Rows-first by default: page fetch uses includeSummary=false, then summary
   * loads in parallel. Set false for live/polling views that need one shot.
   */
  deferSummary?: boolean;
  enabled?: boolean;
  /** Serialized into the query key; changing values resets to page 1. */
  filters?: Record<string, unknown>;
  search?: string;
  /**
   * `local` — match-sorter over a warm catalog (sliding window only).
   * `server` / `hybrid` — browse with sliding-window prefetch (most recent
   * first); when the user types, switch to debounced full-catalog API search.
   * Prefer `hybrid` for HQ6 tables; `server` is kept as an alias.
   */
  searchMode?: "local" | "server" | "hybrid";
  /**
   * While on the list, background-load this many pages into the local
   * search roster (default 10). Search filters that roster, not page 1 only.
   * Only used when `searchMode` is `local`.
   */
  localSearchWarmPages?: number;
  /**
   * Optional full catalog override for local search (e.g. getItemRoster).
   * When set, search uses this once loaded; progressive warm still helps
   * until it arrives.
   */
  searchCatalog?: T[];
  /** True while `searchCatalog` is still fetching. */
  searchCatalogLoading?: boolean;
  defaultPageSize?: number;
  debounceSearchMs?: number;
  /** Poll interval in ms for live views (e.g. kitchen display). */
  refetchInterval?: number;
  /** React Query staleTime for list pages (default 5 minutes). */
  staleTime?: number;
  /**
   * How many pages ahead to warm after the current page settles.
   * Default 1 so Next is warm without stacking Neon RTTs on open.
   */
  prefetchPagesAhead?: number;
  /**
   * How many already-visited pages to keep in cache behind the current page.
   * Default 3 so Prev across a few pages stays instant.
   */
  retainPagesBehind?: number;
  /** Encode composite cursor from the last row (defaults to row.id). */
  getCursor?: (row: T, sort: ListSortState | null) => string;
  /** Initial server sort — when set, DataTable should use serverSort. */
  defaultSort?: ListSortState | null;
}

/** Browse + sliding window; typedown uses the API (not the warm page window). */
function isApiSearchMode(mode: "local" | "server" | "hybrid"): boolean {
  return mode === "server" || mode === "hybrid";
}

export function useServerListPage<T extends { id: string }>({
  queryKey,
  fetchPage,
  fetchSummary,
  deferSummary = true,
  enabled = true,
  filters = {},
  search = "",
  searchMode = "local",
  localSearchWarmPages = 10,
  searchCatalog,
  searchCatalogLoading = false,
  defaultPageSize = DEFAULT_TABLE_PAGE_SIZE,
  debounceSearchMs = searchMode === "local" ? 0 : SEARCH_DEBOUNCE_MS,
  refetchInterval,
  staleTime = 10 * 60_000,
  prefetchPagesAhead = 1,
  retainPagesBehind = 3,
  getCursor,
  defaultSort = { sortBy: "updatedAt", sortDir: "desc" },
}: UseServerListPageOptions<T>) {
  const queryClient = useQueryClient();
  const apiSearch = isApiSearchMode(searchMode);
  const debouncedSearch = useDebouncedValue(search.trim(), debounceSearchMs);
  const {
    pageIndex,
    urlPageIndex,
    cursor,
    canGoPrev,
    goNext,
    goPrev,
    goToPage,
    reset,
    setPageSize,
    setUrlPageIndex,
    maxReachablePageIndex,
    extendCursorsTo,
    pageSize,
  } = useUrlCursorPage(defaultPageSize);
  const [sort, setSort] = useState<ListSortState | null>(defaultSort);
  const [isJumping, setIsJumping] = useState(false);

  // Local mode: never put typedown search in the query key (no Neon round-trip).
  // Hybrid/server: empty search = browse recent pages; non-empty = API search.
  const filterKey = useMemo(() => {
    const { search: _ignoredSearch, ...restFilters } = filters;
    return stableListFilterKey(
      restFilters,
      sort,
      apiSearch ? { search: debouncedSearch } : undefined,
    );
  }, [apiSearch, filters, debouncedSearch, sort]);

  const resetRef = useRef(reset);
  resetRef.current = reset;
  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;
  const getCursorRef = useRef(getCursor);
  getCursorRef.current = getCursor;
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const searchModeRef = useRef(searchMode);
  searchModeRef.current = searchMode;
  const debouncedSearchRef = useRef(debouncedSearch);
  debouncedSearchRef.current = debouncedSearch;
  const apiSearchRef = useRef(apiSearch);
  apiSearchRef.current = apiSearch;

  const pageFetchOpts = useCallback(
    (extra?: ListPageFetchOpts): ListPageFetchOpts => ({
      ...extra,
      search: apiSearch && debouncedSearch ? debouncedSearch : undefined,
    }),
    [apiSearch, debouncedSearch],
  );

  const didMountRef = useRef(false);

  // Reset to page 1 before paint when filters/search/sort change — useEffect
  // ran after paint and briefly showed the old cursor + new search (often
  // empty → "No data available") before snapping back to page 1.
  useLayoutEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    resetRef.current();
  }, [filterKey]);

  const walkCursor = useCallback(
    async (fetchCursor: string | undefined, walkPageIndex: number) => {
      const pageQueryKey = listPageQueryKey(
        queryKeyRef.current,
        filterKey,
        walkPageIndex,
        fetchCursor,
        pageSize,
        sort,
      );
      const data = await queryClient.fetchQuery({
        queryKey: [...pageQueryKey],
        queryFn: () =>
          fetchPageRef.current(fetchCursor, pageSize, sort, {
            includeSummary: false,
            search:
              apiSearchRef.current && debouncedSearchRef.current
                ? debouncedSearchRef.current
                : undefined,
          }),
        staleTime,
        // Keep visited pages around so navigating back is instant.
        gcTime: Math.max(staleTime * 6, 30 * 60_000),
      });
      if (data.items.length === 0) return null;
      if (!data.hasMore) return null;
      const last = data.items[data.items.length - 1]!;
      const cursorOf = getCursorRef.current;
      return cursorOf ? cursorOf(last, sort) : last.id;
    },
    [filterKey, pageSize, queryClient, sort, staleTime],
  );

  const pageQuery = useQuery({
    queryKey: listPageQueryKey(
      queryKey,
      filterKey,
      pageIndex,
      cursor,
      pageSize,
      sort,
    ),
    queryFn: () =>
      fetchPage(cursor, pageSize, sort, pageFetchOpts({
        includeSummary: deferSummary ? false : true,
      })),
    enabled,
    refetchInterval,
    staleTime,
    gcTime: Math.max(staleTime * 6, 30 * 60_000),
    // Instant back-navigation: reuse cache. Only hit the network again when a
    // mutation invalidated this query (or there is no data yet).
    refetchOnMount: (query) => query.isStale() && query.state.isInvalidated,
    refetchOnReconnect: false,
    // Keep prior *rows* while the next page loads — but never keep an empty
    // page as placeholder. An empty prior search + keepPreviousData paints
    // "No data available" for the whole next search round-trip.
    placeholderData: (previousData: ListPage<T> | undefined) => {
      if (!previousData || previousData.items.length === 0) return undefined;
      return previousData;
    },
  });

  const resolveSummary = useCallback(async (): Promise<ListPageSummary> => {
    const searchArg =
      apiSearch && debouncedSearch ? debouncedSearch : undefined;
    if (fetchSummary) return fetchSummary({ search: searchArg });
    const page = await fetchPage(undefined, 1, sort, pageFetchOpts({
      includeSummary: true,
    }));
    return {
      totalCount: page.totalCount,
      amountSummary: page.amountSummary,
    };
  }, [
    apiSearch,
    debouncedSearch,
    fetchPage,
    fetchSummary,
    pageFetchOpts,
    sort,
  ]);

  const summaryQuery = useQuery({
    queryKey: [...queryKey, "summary", filterKey],
    queryFn: resolveSummary,
    // Skip count/sum while the user is still typing (debounce pending).
    // After settle, one summary request runs on the fast SQL path.
    enabled:
      enabled &&
      deferSummary &&
      !(apiSearch && search.trim() !== debouncedSearch),
    staleTime,
    gcTime: Math.max(staleTime * 6, 30 * 60_000),
    refetchOnMount: (query) => query.isStale() && query.state.isInvalidated,
    refetchOnReconnect: false,
  });

  const [paintItems, setPaintItems] = useState<T[] | null>(null);
  /** Progressive catalog for local search (pages 1…N), updated as each page lands. */
  const [warmedSearchRoster, setWarmedSearchRoster] = useState<T[]>([]);
  const [searchWarmComplete, setSearchWarmComplete] = useState(false);
  const [searchWarmInFlight, setSearchWarmInFlight] = useState(false);

  // Drop optimistic paint once React Query has the real page.
  useEffect(() => {
    if (!pageQuery.isPlaceholderData && pageQuery.data) {
      setPaintItems(null);
    }
  }, [pageIndex, pageQuery.data, pageQuery.isPlaceholderData]);

  const rawItems = paintItems ?? pageQuery.data?.items ?? [];

  // Background-load pages into the local search roster (from the head of the list).
  useEffect(() => {
    if (searchMode !== "local") return;
    if (!enabled || localSearchWarmPages <= 0) return;

    let cancelled = false;
    const targetPages = localSearchWarmPages;
    setSearchWarmInFlight(true);
    setSearchWarmComplete(false);

    const accumulate = async () => {
      const byId = new Map<string, T>();
      const page0Key = listPageQueryKey(
        queryKeyRef.current,
        filterKey,
        0,
        undefined,
        pageSize,
        sort,
      );
      let page0: ListPage<T> | undefined =
        queryClient.getQueryData<ListPage<T>>(page0Key);
      if (!page0 && pageIndex === 0 && pageQuery.data) {
        page0 = pageQuery.data;
      }
      if (!page0) {
        try {
          page0 = await queryClient.fetchQuery({
            queryKey: [...page0Key],
            queryFn: () =>
              fetchPageRef.current(undefined, pageSize, sort, {
                includeSummary: false,
              }),
            staleTime,
            gcTime: Math.max(staleTime * 6, 30 * 60_000),
          });
        } catch {
          if (!cancelled) {
            setSearchWarmComplete(true);
            setSearchWarmInFlight(false);
          }
          return;
        }
      }
      if (cancelled) return;

      const seed = page0?.items ?? [];
      for (const row of seed) byId.set(row.id, row);
      setWarmedSearchRoster([...byId.values()]);

      if (seed.length === 0) {
        setSearchWarmComplete(true);
        setSearchWarmInFlight(false);
        return;
      }

      const cursorOf = getCursorRef.current;
      let walkCursorValue: string | undefined = cursorOf
        ? cursorOf(seed[seed.length - 1]!, sort)
        : seed[seed.length - 1]!.id;
      let walkPageIndex = 0;
      let pageHasMore = page0?.hasMore ?? seed.length >= pageSize;

      for (let step = 1; step < targetPages && pageHasMore; step += 1) {
        if (cancelled) return;
        walkPageIndex += 1;
        const nextKey = listPageQueryKey(
          queryKeyRef.current,
          filterKey,
          walkPageIndex,
          walkCursorValue,
          pageSize,
          sort,
        );
        let page: ListPage<T> | undefined =
          queryClient.getQueryData<ListPage<T>>(nextKey);
        if (!page) {
          page = await queryClient.fetchQuery({
            queryKey: [...nextKey],
            queryFn: () =>
              fetchPageRef.current(walkCursorValue, pageSize, sort, {
                includeSummary: false,
              }),
            staleTime,
            gcTime: Math.max(staleTime * 6, 30 * 60_000),
          });
        }
        if (cancelled) return;
        if (!page || page.items.length === 0) break;
        for (const row of page.items) byId.set(row.id, row);
        setWarmedSearchRoster([...byId.values()]);
        pageHasMore = page.hasMore;
        if (!pageHasMore) break;
        const lastRow = page.items[page.items.length - 1]!;
        walkCursorValue = cursorOf ? cursorOf(lastRow, sort) : lastRow.id;
      }

      if (!cancelled) {
        setSearchWarmComplete(true);
        setSearchWarmInFlight(false);
      }
    };

    void accumulate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    filterKey,
    localSearchWarmPages,
    pageSize,
    searchMode,
    staleTime,
  ]);

  // Reset warm roster when filters change.
  useEffect(() => {
    if (searchMode !== "local") return;
    setWarmedSearchRoster([]);
    setSearchWarmComplete(false);
  }, [filterKey, searchMode]);

  const searchQ = search.trim();
  const searchPool = useMemo(() => {
    if (searchMode !== "local") return rawItems;
    if (searchCatalog && searchCatalog.length > 0) return searchCatalog;
    if (warmedSearchRoster.length > 0) return warmedSearchRoster;
    return rawItems;
  }, [rawItems, searchCatalog, searchMode, warmedSearchRoster]);

  const searchMatched = useMemo(() => {
    if (searchMode !== "local" || !searchQ) return null;
    return filterRowsBySearch(searchPool, searchQ);
  }, [searchMode, searchPool, searchQ]);

  const isSearchWarming = Boolean(
    searchMode === "local" &&
      searchQ &&
      (searchMatched?.length ?? 0) === 0 &&
      (searchCatalogLoading || (searchWarmInFlight && !searchWarmComplete)),
  );

  const items = useMemo(() => {
    if (searchMode !== "local") return rawItems;
    if (!searchQ) return rawItems;
    const matched = searchMatched ?? [];
    // Show search hits from the warm catalog (cap to a few pages so the table stays usable).
    return matched.slice(0, pageSize * Math.max(localSearchWarmPages, 1));
  }, [
    localSearchWarmPages,
    pageSize,
    rawItems,
    searchMatched,
    searchMode,
    searchQ,
  ]);

  const totalCount =
    searchMode === "local" && searchQ && searchMatched
      ? searchMatched.length
      : (summaryQuery.data?.totalCount ?? pageQuery.data?.totalCount);
  const amountSummary =
    summaryQuery.data?.amountSummary ?? pageQuery.data?.amountSummary;

  const hasMore =
    searchMode === "local" && searchQ
      ? false
      : totalCount != null
        ? (pageIndex + 1) * pageSize < totalCount
        : (pageQuery.data?.hasMore ?? false);

  const lastItemId = rawItems[rawItems.length - 1]?.id;
  const sortBy = sort?.sortBy ?? null;
  const sortDir = sort?.sortDir ?? null;

  // Sliding window: warm N pages ahead as soon as the visible page is real
  // data (not a placeholder). Do NOT depend on isFetching / totalCount — those
  // flip when the deferred summary lands and were cancelling the warm mid-flight,
  // so Next kept missing cache and hitting Neon.
  useEffect(() => {
    if (!enabled || isJumping || !pageQuery.isSuccess) return;
    if (pageQuery.isPlaceholderData) return;
    if (prefetchPagesAhead <= 0 || rawItems.length === 0) return;

    const pageHasMoreHint =
      pageQuery.data?.hasMore ??
      (totalCount != null
        ? (pageIndex + 1) * pageSize < totalCount
        : rawItems.length >= pageSize);
    if (!pageHasMoreHint) return;

    const baseKey = queryKeyRef.current;
    const baseLen = baseKey.length;
    const minKeep = Math.max(0, pageIndex - retainPagesBehind);
    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (key.length < baseLen + 4) return false;
        for (let i = 0; i < baseLen; i += 1) {
          if (key[i] !== baseKey[i]) return false;
        }
        if (key[baseLen] === "summary") return false;
        if (key[baseLen] !== filterKey) return false;
        const idx = key[baseLen + 1];
        if (typeof idx !== "number") return false;
        if (key[baseLen + 3] !== pageSize) return false;
        return idx < minKeep;
      },
    });

    let cancelled = false;
    const settledItems = rawItems;
    const settledSort = sort;
    const settledPageIndex = pageIndex;

    const warm = async () => {
      const cursorOf = getCursorRef.current;
      let walkCursorValue: string | undefined = cursorOf
        ? cursorOf(settledItems[settledItems.length - 1]!, settledSort)
        : settledItems[settledItems.length - 1]!.id;
      let walkPageIndex = settledPageIndex;

      for (let step = 1; step <= prefetchPagesAhead; step += 1) {
        if (cancelled) return;
        walkPageIndex += 1;
        const pageQueryKey = listPageQueryKey(
          queryKeyRef.current,
          filterKey,
          walkPageIndex,
          walkCursorValue,
          pageSize,
          settledSort,
        );
        let page: ListPage<T> | undefined =
          queryClient.getQueryData<ListPage<T>>(pageQueryKey);
        if (!page) {
          page = await queryClient.fetchQuery({
            queryKey: [...pageQueryKey],
            queryFn: () =>
              fetchPageRef.current(walkCursorValue, pageSize, settledSort, {
                includeSummary: false,
                search:
                  apiSearchRef.current && debouncedSearchRef.current
                    ? debouncedSearchRef.current
                    : undefined,
              }),
            staleTime,
            gcTime: Math.max(staleTime * 6, 30 * 60_000),
          });
        }
        if (cancelled) return;
        const resolved = page;
        if (!resolved || resolved.items.length === 0) return;
        if (!resolved.hasMore) return;
        const lastRow: T = resolved.items[resolved.items.length - 1]!;
        walkCursorValue = cursorOf
          ? cursorOf(lastRow, settledSort)
          : lastRow.id;
      }
    };

    void warm();
    return () => {
      cancelled = true;
    };
    // Intentionally omit isFetching / totalCount / hasMore — those churn on
    // summary arrival and were aborting the warm window before Next could hit it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    filterKey,
    isJumping,
    lastItemId,
    pageIndex,
    pageQuery.isPlaceholderData,
    pageQuery.isSuccess,
    pageSize,
    prefetchPagesAhead,
    queryClient,
    retainPagesBehind,
    sortBy,
    sortDir,
    staleTime,
  ]);

  const handleNext = () => {
    const last = rawItems[rawItems.length - 1];
    if (!last || !hasMore || isJumping) return;
    const nextCursor = getCursor ? getCursor(last, sort) : last.id;
    const nextKey = listPageQueryKey(
      queryKeyRef.current,
      filterKey,
      pageIndex + 1,
      nextCursor,
      pageSize,
      sort,
    );
    const nextCached = queryClient.getQueryData<ListPage<T>>(nextKey);
    // Paint cached rows in this click — don't wait for useQuery to commit.
    if (nextCached?.items?.length) {
      setPaintItems(nextCached.items);
    }
    goNext(nextCursor);
  };

  const handlePrev = () => {
    if (!canGoPrev || isJumping) return;
    const prevIndex = pageIndex - 1;
    // Cursor for prev page is already on the stack; look up by walking keys
    // is hard — read from React Query cache via known stack after goPrev.
    // Optimistic: clear paint and let cache/placeholder handle it.
    setPaintItems(null);
    goPrev();
  };

  const totalPages = totalPagesFromEntries(totalCount, pageSize);

  const canSelectPage = useCallback(
    (index: number) => {
      if (index < 0) return false;
      const maxJump = slidingJumpMaxIndex(maxReachablePageIndex, {
        hasMore,
        prefetchPagesAhead,
        totalPages,
      });
      return index <= maxJump;
    },
    [hasMore, maxReachablePageIndex, prefetchPagesAhead, totalPages],
  );

  const jumpToPage = useCallback(
    async (targetIndex: number) => {
      if (targetIndex < 0) return;
      if (targetIndex <= maxReachablePageIndex) {
        goToPage(targetIndex);
        setUrlPageIndex(targetIndex);
        return;
      }
      if (totalPages != null && targetIndex >= totalPages) return;
      const maxJump = slidingJumpMaxIndex(maxReachablePageIndex, {
        hasMore,
        prefetchPagesAhead,
        totalPages,
      });
      if (targetIndex > maxJump) return;

      // Pin the URL target so the stack→URL mirror does not wipe ?page= mid-walk.
      setUrlPageIndex(targetIndex);
      setIsJumping(true);
      try {
        const landing = await extendCursorsTo(targetIndex, walkCursor);
        setUrlPageIndex(landing);
      } finally {
        setIsJumping(false);
      }
    },
    [
      extendCursorsTo,
      goToPage,
      hasMore,
      maxReachablePageIndex,
      prefetchPagesAhead,
      setUrlPageIndex,
      totalPages,
      walkCursor,
    ],
  );

  const jumpToPageRef = useRef(jumpToPage);
  jumpToPageRef.current = jumpToPage;
  const deepLinkTargetRef = useRef<number | null>(null);

  // Deep-link / refresh: URL page exceeds cursor stack — walk forward once.
  useEffect(() => {
    if (!enabled || isJumping) return;
    if (urlPageIndex <= maxReachablePageIndex) {
      deepLinkTargetRef.current = null;
      return;
    }
    if (totalPages != null && urlPageIndex >= totalPages) {
      const clamped = Math.max(0, totalPages - 1);
      if (clamped !== urlPageIndex) {
        setUrlPageIndex(clamped);
      }
      return;
    }
    // Avoid re-entrant walks to the same target (was fighting URL sync).
    if (deepLinkTargetRef.current === urlPageIndex) return;
    deepLinkTargetRef.current = urlPageIndex;
    void jumpToPageRef.current(urlPageIndex).finally(() => {
      if (deepLinkTargetRef.current === urlPageIndex) {
        deepLinkTargetRef.current = null;
      }
    });
  }, [
    enabled,
    isJumping,
    maxReachablePageIndex,
    setUrlPageIndex,
    totalPages,
    urlPageIndex,
  ]);

  // Empty page while past the end of totalCount — step back once.
  // Do NOT bounce on transient empty responses mid-navigation (that was
  // sending users back to page 1 after every Next click).
  useEffect(() => {
    if (!enabled || isJumping || pageQuery.isFetching || pageQuery.isPending) {
      return;
    }
    if (pageQuery.isPlaceholderData) return;
    if (pageIndex <= 0) return;
    if (rawItems.length > 0) return;
    if (!pageQuery.isSuccess) return;
    if (totalCount == null) return;
    if (pageIndex * pageSize < totalCount) return;
    goPrev();
  }, [
    enabled,
    goPrev,
    isJumping,
    rawItems.length,
    pageIndex,
    pageQuery.isFetching,
    pageQuery.isPending,
    pageQuery.isPlaceholderData,
    pageQuery.isSuccess,
    pageSize,
    totalCount,
  ]);

  const handleSortChange = (sortBy: string, sortDir: ListSortState["sortDir"]) => {
    setSort({ sortBy, sortDir });
    reset();
  };

  const pagePending =
    (pageQuery.isPending && !pageQuery.isPlaceholderData) ||
    (pageQuery.isFetching && rawItems.length === 0 && !pageQuery.isPlaceholderData) ||
    isJumping;

  // True only while the target page is not in cache yet (network / cursor walk).
  // Prefetched Next/Prev hits resolve synchronously — no spinner, no blur.
  // paintItems means handleNext already applied the warm cache — don't flash busy.
  const isAwaitingPage =
    isJumping ||
    (pageQuery.isFetching &&
      Boolean(pageQuery.isPlaceholderData) &&
      paintItems == null);

  /** Typedown search in flight (debounce and/or server fetch). */
  const isSearching = Boolean(
    isSearchWarming ||
      (apiSearch &&
        (search.trim() !== debouncedSearch ||
          // Any in-flight/pending page for an active search term — including
          // when prior empty results left no placeholder (isPending + []).
          ((search.trim().length > 0 || debouncedSearch.length > 0) &&
            (pageQuery.isFetching ||
              pageQuery.isPending ||
              Boolean(pageQuery.isPlaceholderData))))),
  );

  return {
    items,
    hasMore,
    totalCount,
    amountSummary,
    pageIndex,
    pageSize,
    canGoPrev: searchQ && searchMode === "local" ? false : canGoPrev,
    goNext: handleNext,
    goPrev: handlePrev,
    goToPage: jumpToPage,
    canSelectPage:
      searchQ && searchMode === "local" ? () => false : canSelectPage,
    setPageSize,
    sort,
    setSort: handleSortChange,
    isLoading: pagePending && rawItems.length === 0,
    // Never treat background search-roster warm as a table overlay.
    isFetching: isAwaitingPage && rawItems.length === 0,
    isPaging: isAwaitingPage,
    isSearchWarming,
    isSearching,
    searchRosterSize: searchPool.length,
    error: pageQuery.error,
    reset,
  };
}

/** Spread onto DataTable / ServerPaginatedTable for header-driven server sort. */
export function serverSortProps(
  page: Pick<ReturnType<typeof useServerListPage>, "sort" | "setSort">,
): {
  sortBy: string | null;
  sortDir: ListSortState["sortDir"];
  onSortChange: (sortBy: string, sortDir: ListSortState["sortDir"]) => void;
} {
  return {
    sortBy: page.sort?.sortBy ?? null,
    sortDir: page.sort?.sortDir ?? "asc",
    onSortChange: page.setSort,
  };
}

/** Merge active list sort into API filter bags (`sortBy` / `sortDir`). */
export function withListSort<T extends Record<string, unknown>>(
  filters: T,
  sort: ListSortState | null | undefined,
): T & { sortBy?: string; sortDir?: ListSortState["sortDir"] } {
  if (!sort?.sortBy) return filters;
  return {
    ...filters,
    sortBy: sort.sortBy,
    sortDir: sort.sortDir,
  };
}

export interface ServerListPaginationProps {
  pageIndex: number;
  pageSize: number;
  hasMore: boolean;
  canGoPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onPageSizeChange: (size: number) => void;
  onPageSelect?: (pageIndex: number) => void;
  canSelectPage?: (pageIndex: number) => boolean;
  /** True while waiting on network (cache miss / jump) — bar spinner only. */
  isFetching?: boolean;
  totalCount?: number;
}

type ServerListPageSlice = Pick<
  ReturnType<typeof useServerListPage>,
  | "pageIndex"
  | "pageSize"
  | "hasMore"
  | "canGoPrev"
  | "goNext"
  | "goPrev"
  | "setPageSize"
  | "goToPage"
  | "canSelectPage"
  | "isFetching"
  | "isSearching"
  | "totalCount"
> & {
  isPaging?: boolean;
  isLoading?: boolean;
  items?: { id: string }[];
  error?: Error | null;
};

/** Spread onto `ServerPaginatedTable` for URL-synced numbered pagination. */
export function serverPaginationBarProps(
  page: ServerListPageSlice,
): ServerListPaginationProps {
  return {
    pageIndex: page.pageIndex,
    pageSize: page.pageSize,
    hasMore: page.hasMore,
    canGoPrev: page.canGoPrev,
    onNext: page.goNext,
    onPrev: page.goPrev,
    onPageSizeChange: page.setPageSize,
    onPageSelect: page.goToPage,
    canSelectPage: page.canSelectPage,
    isFetching: page.isPaging ?? page.isFetching,
    totalCount: page.totalCount,
  };
}

/**
 * Spread onto Hq6StandardListShell / Hq6DataListPage `pagination` so every
 * HQ6 list wires totalCount + busy state the same way.
 */
export function hq6ListPaginationProps(page: ServerListPageSlice) {
  return {
    pageIndex: page.pageIndex,
    pageSize: page.pageSize,
    itemCount: page.items?.length ?? 0,
    hasMore: page.hasMore,
    canGoPrev: page.canGoPrev,
    onPrev: page.goPrev,
    onNext: page.goNext,
    onPageSizeChange: page.setPageSize,
    onPageSelect: page.goToPage,
    canSelectPage: page.canSelectPage,
    totalItems: page.totalCount,
    maxPageButtons: 5,
    // Only lock pagination while jumping pages — never the toolbar/search/exports.
    isBusy: Boolean(page.isPaging),
    isSearching: Boolean(page.isSearching),
  };
}

/**
 * Flat props for `ServerPaginatedTable` — prefetch window + instant paint
 * from `useServerListPage` without re-wiring each call site.
 */
export function serverListTableProps(page: ServerListPageSlice) {
  return {
    items: page.items ?? [],
    isLoading: page.isLoading ?? false,
    // Overlay only when empty (cache hits stay sharp).
    isFetching: page.isFetching,
    // Bar busy while network wait / jump.
    isPaging: page.isPaging ?? false,
    error: page.error ? "Failed to load list" : null,
    ...serverPaginationBarProps(page),
  };
}
