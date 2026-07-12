"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ListPage } from "@/lib/api/fetchAllPages";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useCursorPage } from "@/lib/hooks/useCursorPage";

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
  ) => Promise<ListPage<T>>;
  enabled?: boolean;
  /** Serialized into the query key; changing values resets to page 1. */
  filters?: Record<string, unknown>;
  search?: string;
  defaultPageSize?: number;
  debounceSearchMs?: number;
  /** Poll interval in ms for live views (e.g. kitchen display). */
  refetchInterval?: number;
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
}: UseServerListPageOptions<T>) {
  const debouncedSearch = useDebouncedValue(search.trim(), debounceSearchMs);
  const { cursor, pageIndex, canGoPrev, goNext, goPrev, reset } = useCursorPage();
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filterKey = useMemo(
    () => JSON.stringify({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  useEffect(() => {
    reset();
  }, [filterKey, pageSize, reset]);

  const pageQuery = useQuery({
    queryKey: [...queryKey, filterKey, cursor, pageSize],
    queryFn: () => fetchPage(cursor, pageSize),
    enabled,
    refetchInterval,
    placeholderData: (prev) => prev,
  });

  const items = pageQuery.data?.items ?? [];
  const hasMore = pageQuery.data?.hasMore ?? false;

  const handleNext = () => {
    const last = items[items.length - 1];
    if (last && hasMore) goNext(last.id);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
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
    setPageSize: handlePageSizeChange,
    isLoading: pageQuery.isLoading && items.length === 0,
    isFetching: pageQuery.isFetching,
    error: pageQuery.error,
    reset,
  };
}
