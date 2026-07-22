"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export interface UseServerListPageOptions<T extends { id: string }> {
  queryKey: readonly unknown[];
  fetchPage: (
    cursor: string | undefined,
    limit: number,
    sort: ListSortState | null,
  ) => Promise<ListPage<T>>;
  enabled?: boolean;
  /** Serialized into the query key; changing values resets to page 1. */
  filters?: Record<string, unknown>;
  search?: string;
  defaultPageSize?: number;
  debounceSearchMs?: number;
  /** Poll interval in ms for live views (e.g. kitchen display). */
  refetchInterval?: number;
  /** Encode composite cursor from the last row (defaults to row.id). */
  getCursor?: (row: T, sort: ListSortState | null) => string;
  /** Initial server sort — when set, DataTable should use serverSort. */
  defaultSort?: ListSortState | null;
}

export function useServerListPage<T extends { id: string }>({
  queryKey,
  fetchPage,
  enabled = true,
  filters = {},
  search = "",
  defaultPageSize = DEFAULT_TABLE_PAGE_SIZE,
  debounceSearchMs = 300,
  refetchInterval,
  getCursor,
  defaultSort = null,
}: UseServerListPageOptions<T>) {
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

  const didMountRef = useRef(false);

  useEffect(() => {
    // On first mount we must respect the URL deep-link (e.g. `?page=4`).
    // Resetting here clears the cursor stack and also forces the URL back to page 1.
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    resetRef.current();
  }, [filterKey, pageSize]);

  const walkCursor = useCallback(
    async (fetchCursor: string | undefined) => {
      const data = await fetchPage(fetchCursor, pageSize, sort);
      if (data.items.length === 0) return null;
      if (!data.hasMore && data.items.length < pageSize) return null;
      const last = data.items[data.items.length - 1]!;
      return getCursor ? getCursor(last, sort) : last.id;
    },
    [fetchPage, getCursor, pageSize, sort],
  );

  const pageQuery = useQuery({
    // Include `pageIndex` so React Query refetches even if `cursor` lags
    // during a jump/URL-sync transition.
    queryKey: [...queryKey, filterKey, pageIndex, cursor, pageSize, sort],
    queryFn: () => fetchPage(cursor, pageSize, sort),
    enabled,
    refetchInterval,
    placeholderData: (prev) => prev,
  });

  const items = pageQuery.data?.items ?? [];
  const hasMore = pageQuery.data?.hasMore ?? false;
  const totalCount = pageQuery.data?.totalCount;
  const amountSummary = pageQuery.data?.amountSummary;

  const handleNext = () => {
    const last = items[items.length - 1];
    if (last && hasMore) {
      goNext(getCursor ? getCursor(last, sort) : last.id);
    }
  };

  const totalPages =
    totalCount != null ? Math.max(1, Math.ceil(totalCount / pageSize)) : undefined;

  const canSelectPage = useCallback(
    (index: number) => {
      if (index < 0) return false;
      if (totalPages != null) return index < totalPages;
      return index <= maxReachablePageIndex;
    },
    [maxReachablePageIndex, totalPages],
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
      maxReachablePageIndex,
      setUrlPageIndex,
      totalPages,
      urlPageIndex,
      walkCursor,
    ],
  );

  const jumpToPageRef = useRef(jumpToPage);
  jumpToPageRef.current = jumpToPage;

  // Deep-link / refresh: URL page exceeds cursor stack — walk forward once data is known.
  useEffect(() => {
    if (!enabled || isJumping) return;
    if (urlPageIndex <= maxReachablePageIndex) return;
    if (totalPages != null && urlPageIndex >= totalPages) {
      setUrlPageIndex(Math.max(0, totalPages - 1));
      return;
    }
    void jumpToPageRef.current(urlPageIndex);
  }, [
    enabled,
    isJumping,
    maxReachablePageIndex,
    setUrlPageIndex,
    totalPages,
    urlPageIndex,
  ]);

  const handleSortChange = (sortBy: string, sortDir: ListSortState["sortDir"]) => {
    setSort({ sortBy, sortDir });
    reset();
  };

  return {
    items,
    hasMore,
    totalCount,
    amountSummary,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext: handleNext,
    goPrev,
    goToPage: jumpToPage,
    canSelectPage,
    setPageSize,
    sort,
    setSort: handleSortChange,
    isLoading: pageQuery.isLoading && items.length === 0,
    isFetching: pageQuery.isFetching || isJumping,
    error: pageQuery.error,
    reset,
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
  isFetching?: boolean;
  totalCount?: number;
}

/** Spread onto `ServerPaginatedTable` for URL-synced numbered pagination. */
export function serverPaginationBarProps(
  page: Pick<
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
  >,
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
    isFetching: page.isFetching,
    totalCount: page.totalCount,
  };
}
