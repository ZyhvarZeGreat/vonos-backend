"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ListPage, ListSortState } from "@/lib/api/fetchAllPages";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useUrlCursorPage } from "@/lib/hooks/useUrlCursorPage";

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

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
   */
  fetchSummary?: () => Promise<ListPageSummary>;
  /**
   * Rows-first by default: page fetch uses includeSummary=false, then summary
   * loads in parallel. Set false for live/polling views that need one shot.
   */
  deferSummary?: boolean;
  enabled?: boolean;
  /** Serialized into the query key; changing values resets to page 1. */
  filters?: Record<string, unknown>;
  search?: string;
  defaultPageSize?: number;
  debounceSearchMs?: number;
  /** Poll interval in ms for live views (e.g. kitchen display). */
  refetchInterval?: number;
  /** React Query staleTime for list pages (default 5 minutes). */
  staleTime?: number;
  /**
   * How many pages ahead to warm after the current page settles.
   * Default 1 — keep Neon connection pressure low (pool limit ~8).
   * Prefetch is delayed so the visible page wins first.
   */
  prefetchPagesAhead?: number;
  /**
   * How many already-visited pages to keep in cache behind the current page.
   * Default 1 so Prev stays instant; older pages are dropped to free memory
   * as you move forward (sliding window with the ahead prefetch).
   */
  retainPagesBehind?: number;
  /** Encode composite cursor from the last row (defaults to row.id). */
  getCursor?: (row: T, sort: ListSortState | null) => string;
  /** Initial server sort — when set, DataTable should use serverSort. */
  defaultSort?: ListSortState | null;
}

export function useServerListPage<T extends { id: string }>({
  queryKey,
  fetchPage,
  fetchSummary,
  deferSummary = true,
  enabled = true,
  filters = {},
  search = "",
  defaultPageSize = DEFAULT_TABLE_PAGE_SIZE,
  debounceSearchMs = 300,
  refetchInterval,
  staleTime = 5 * 60_000,
  prefetchPagesAhead = 1,
  retainPagesBehind = 2,
  getCursor,
  defaultSort = null,
}: UseServerListPageOptions<T>) {
  const queryClient = useQueryClient();
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

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        ...filters,
        search: debouncedSearch,
        sortBy: sort?.sortBy ?? null,
        sortDir: sort?.sortDir ?? null,
      }),
    [filters, debouncedSearch, sort],
  );

  const resetRef = useRef(reset);
  resetRef.current = reset;
  const fetchPageRef = useRef(fetchPage);
  fetchPageRef.current = fetchPage;
  const getCursorRef = useRef(getCursor);
  getCursorRef.current = getCursor;
  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const didMountRef = useRef(false);

  useEffect(() => {
    // On first mount we must respect the URL deep-link (e.g. `?page=4`).
    // Resetting here clears the cursor stack and also forces the URL back to page 1.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    // pageSize changes already reset inside setPageSize — only reset for filter/sort.
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
      fetchPage(cursor, pageSize, sort, {
        includeSummary: deferSummary ? false : true,
      }),
    enabled,
    refetchInterval,
    staleTime,
    gcTime: Math.max(staleTime * 6, 30 * 60_000),
    placeholderData: keepPreviousData,
  });

  const resolveSummary = useCallback(async (): Promise<ListPageSummary> => {
    if (fetchSummary) return fetchSummary();
    const page = await fetchPage(undefined, 1, sort, { includeSummary: true });
    return {
      totalCount: page.totalCount,
      amountSummary: page.amountSummary,
    };
  }, [fetchPage, fetchSummary, sort]);

  const summaryQuery = useQuery({
    queryKey: [...queryKey, "summary", filterKey],
    queryFn: resolveSummary,
    enabled: enabled && deferSummary,
    staleTime,
  });

  const [paintItems, setPaintItems] = useState<T[] | null>(null);

  // Drop optimistic paint once React Query has the real page.
  useEffect(() => {
    if (!pageQuery.isPlaceholderData && pageQuery.data) {
      setPaintItems(null);
    }
  }, [pageIndex, pageQuery.data, pageQuery.isPlaceholderData]);

  const items = paintItems ?? pageQuery.data?.items ?? [];
  const totalCount =
    summaryQuery.data?.totalCount ?? pageQuery.data?.totalCount;
  const amountSummary =
    summaryQuery.data?.amountSummary ?? pageQuery.data?.amountSummary;

  const hasMore =
    totalCount != null
      ? (pageIndex + 1) * pageSize < totalCount
      : (pageQuery.data?.hasMore ?? false);

  const lastItemId = items[items.length - 1]?.id;
  const sortBy = sort?.sortBy ?? null;
  const sortDir = sort?.sortDir ?? null;

  // Sliding window: warm N pages ahead; drop pages behind. Effect deps are
  // primitives only — unstable fetchPage/queryKey identities used to cancel
  // warm mid-flight on every parent re-render (so Next never hit cache).
  useEffect(() => {
    if (!enabled || isJumping || !pageQuery.isSuccess) {
      return;
    }
    // Don't start warm while this page is still a placeholder wait.
    if (pageQuery.isFetching && pageQuery.isPlaceholderData) return;

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

    if (prefetchPagesAhead <= 0 || !hasMore || items.length === 0) return;

    let cancelled = false;
    const warm = async () => {
      const cursorOf = getCursorRef.current;
      let walkCursorValue: string | undefined = cursorOf
        ? cursorOf(items[items.length - 1]!, sort)
        : items[items.length - 1]!.id;
      let walkPageIndex = pageIndex;

      for (let step = 1; step <= prefetchPagesAhead; step += 1) {
        if (cancelled) return;
        walkPageIndex += 1;
        const pageQueryKey = listPageQueryKey(
          queryKeyRef.current,
          filterKey,
          walkPageIndex,
          walkCursorValue,
          pageSize,
          sort,
        );
        let page: ListPage<T> | undefined =
          queryClient.getQueryData<ListPage<T>>(pageQueryKey);
        if (!page) {
          page = await queryClient.fetchQuery({
            queryKey: [...pageQueryKey],
            queryFn: () =>
              fetchPageRef.current(walkCursorValue, pageSize, sort, {
                includeSummary: false,
              }),
            staleTime,
            gcTime: Math.max(staleTime * 6, 30 * 60_000),
          });
        }
        const resolved = page;
        if (!resolved || resolved.items.length === 0) return;
        const pageHasMore =
          totalCount != null
            ? walkPageIndex * pageSize < totalCount
            : resolved.hasMore;
        if (!pageHasMore) return;
        const lastRow: T = resolved.items[resolved.items.length - 1]!;
        walkCursorValue = cursorOf ? cursorOf(lastRow, sort) : lastRow.id;
      }
    };

    // Let the visible page + summary settle before competing for Neon slots.
    const timer = window.setTimeout(() => {
      if (!cancelled) void warm();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Intentionally omit fetchPage / queryKey / items / sort object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    filterKey,
    hasMore,
    isJumping,
    lastItemId,
    pageIndex,
    pageQuery.isFetching,
    pageQuery.isSuccess,
    pageSize,
    prefetchPagesAhead,
    queryClient,
    retainPagesBehind,
    sortBy,
    sortDir,
    staleTime,
    totalCount,
  ]);

  const handleNext = () => {
    const last = items[items.length - 1];
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
    if (!nextCached && pageQuery.isFetching) return;
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

  const totalPages =
    totalCount != null
      ? Math.max(totalCount === 0 ? 0 : 1, Math.ceil(totalCount / pageSize))
      : undefined;

  /** How far ahead numbered jumps may walk without a totalCount (matches bar window). */
  const maxJumpAhead = Math.max(1, prefetchPagesAhead);

  const canSelectPage = useCallback(
    (index: number) => {
      if (index < 0) return false;
      if (totalPages != null) {
        if (totalPages === 0) return index === 0;
        return index < totalPages;
      }
      // Without a total, allow the visible page window ahead of the cursor stack.
      return index <= maxReachablePageIndex + (hasMore ? maxJumpAhead : 0);
    },
    [hasMore, maxJumpAhead, maxReachablePageIndex, totalPages],
  );

  const jumpToPage = useCallback(
    async (targetIndex: number) => {
      if (targetIndex < 0) return;
      if (targetIndex <= maxReachablePageIndex) {
        goToPage(targetIndex);
        if (targetIndex !== urlPageIndex) {
          setUrlPageIndex(targetIndex);
        }
        return;
      }
      if (totalPages != null && targetIndex >= totalPages) return;
      if (
        totalPages == null &&
        targetIndex > maxReachablePageIndex + maxJumpAhead
      ) {
        return;
      }

      setIsJumping(true);
      try {
        const landing = await extendCursorsTo(targetIndex, walkCursor);
        if (landing !== urlPageIndex) {
          setUrlPageIndex(landing);
        }
      } finally {
        setIsJumping(false);
      }
    },
    [
      extendCursorsTo,
      goToPage,
      maxJumpAhead,
      maxReachablePageIndex,
      setUrlPageIndex,
      totalPages,
      urlPageIndex,
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

  // Landed past the end (empty page after a bad hasMore / stale cursor) — step back.
  // Ignore placeholder/previous-page rows so keepPreviousData does not false-trigger.
  useEffect(() => {
    if (!enabled || isJumping || pageQuery.isFetching || pageQuery.isPending) {
      return;
    }
    if (pageQuery.isPlaceholderData) return;
    if (pageIndex > 0 && items.length === 0 && pageQuery.isSuccess) {
      goPrev();
    }
  }, [
    enabled,
    goPrev,
    isJumping,
    items.length,
    pageIndex,
    pageQuery.isFetching,
    pageQuery.isPending,
    pageQuery.isPlaceholderData,
    pageQuery.isSuccess,
  ]);

  const handleSortChange = (sortBy: string, sortDir: ListSortState["sortDir"]) => {
    setSort({ sortBy, sortDir });
    reset();
  };

  const pagePending =
    (pageQuery.isPending && !pageQuery.isPlaceholderData) ||
    (pageQuery.isFetching && items.length === 0 && !pageQuery.isPlaceholderData) ||
    isJumping;

  // True only while the target page is not in cache yet (network / cursor walk).
  // Prefetched Next/Prev hits resolve synchronously — no spinner, no blur.
  const isAwaitingPage =
    isJumping ||
    (pageQuery.isFetching && Boolean(pageQuery.isPlaceholderData));

  return {
    items,
    hasMore,
    totalCount,
    amountSummary,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext: handleNext,
    goPrev: handlePrev,
    goToPage: jumpToPage,
    canSelectPage,
    setPageSize,
    sort,
    setSort: handleSortChange,
    isLoading: pagePending && items.length === 0,
    // Table overlay: only when there are no rows to keep on screen.
    // Never blur a full table during keepPreviousData / cache hits.
    isFetching: isAwaitingPage && items.length === 0,
    // Pagination bar busy indicator (no table blur).
    isPaging: isAwaitingPage,
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
    // Prefer isPaging — do not busy-lock the bar on silent cache hits.
    isBusy: Boolean(page.isPaging) || Boolean(page.isLoading),
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
