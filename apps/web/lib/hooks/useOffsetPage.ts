"use client";

import { useEffect, useMemo } from "react";
import { useUrlPageParams } from "@/lib/hooks/useUrlPageParams";
import { TABLE_REPORT_PAGE_SIZE } from "@/lib/registries/reportTableUi";

export function useOffsetPage<T>(
  items: T[],
  options?: {
    defaultPageSize?: number;
    /** When any value changes, reset to page 1 (e.g. search query). */
    resetKey?: string;
  },
) {
  const defaultPageSize = options?.defaultPageSize ?? TABLE_REPORT_PAGE_SIZE;
  const { pageIndex, pageSize, setPageIndex, setPageSize } =
    useUrlPageParams(defaultPageSize);

  useEffect(() => {
    setPageIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when filter key changes
  }, [options?.resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (pageIndex >= totalPages) {
      setPageIndex(totalPages - 1);
    }
  }, [pageIndex, setPageIndex, totalPages]);

  const pageRows = useMemo(
    () => items.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [items, pageIndex, pageSize],
  );

  return {
    pageIndex,
    pageSize,
    pageRows,
    totalPages,
    totalItems: items.length,
    hasMore: pageIndex < totalPages - 1,
    canGoPrev: pageIndex > 0,
    goPrev: () => setPageIndex(pageIndex - 1),
    goNext: () => setPageIndex(pageIndex + 1),
    setPageIndex,
    setPageSize,
  };
}
