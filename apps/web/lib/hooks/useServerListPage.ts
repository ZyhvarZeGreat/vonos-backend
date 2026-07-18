"use client";

import { useEffect, useMemo, useState } from "react";
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
    cursor,
    canGoPrev,
    goNext,
    goPrev,
    goToPage,
    reset,
    setPageSize,
    canSelectPage,
    pageSize,
  } = useUrlCursorPage(defaultPageSize);
  const [sort, setSort] = useState<ListSortState | null>(defaultSort);

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

  useEffect(() => {
    reset();
  }, [filterKey, pageSize, reset]);

  const pageQuery = useQuery({
    queryKey: [...queryKey, filterKey, cursor, pageSize],
    queryFn: () => fetchPage(cursor, pageSize, sort),
    enabled,
    refetchInterval,
    placeholderData: (prev) => prev,
  });

  const items = pageQuery.data?.items ?? [];
  const hasMore = pageQuery.data?.hasMore ?? false;

  const handleNext = () => {
    const last = items[items.length - 1];
    if (last && hasMore) {
      goNext(getCursor ? getCursor(last, sort) : last.id);
    }
  };

  const handleSortChange = (sortBy: string, sortDir: ListSortState["sortDir"]) => {
    setSort({ sortBy, sortDir });
    reset();
  };

  return {
    items,
    hasMore,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext: handleNext,
    goPrev,
    goToPage,
    canSelectPage,
    setPageSize,
    sort,
    setSort: handleSortChange,
    isLoading: pageQuery.isLoading && items.length === 0,
    isFetching: pageQuery.isFetching,
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
  };
}
