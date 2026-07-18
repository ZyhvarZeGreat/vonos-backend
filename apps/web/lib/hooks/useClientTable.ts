"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface UseClientTableOptions<T> {
  data: T[];
  search?: string;
  searchKeys?: (keyof T | string)[];
  sortValue?: (row: T, key: string) => string | number | null;
  pageSize?: number;
}

export function useClientTable<T>({
  data,
  search = "",
  searchKeys = [],
  sortValue,
  pageSize: initialPageSize = 10,
}: UseClientTableOptions<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<SortState | null>(null);

  const filtered = useMemo(() => {
    let rows = data;
    const q = search.trim().toLowerCase();
    if (q && searchKeys.length > 0) {
      rows = rows.filter((row) =>
        searchKeys.some((key) => {
          const val = (row as Record<string, unknown>)[String(key)];
          return String(val ?? "")
            .toLowerCase()
            .includes(q);
        }),
      );
    }
    return rows;
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const { key, direction } = sort;
    const mult = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortValue ? sortValue(a, key) : (a as Record<string, unknown>)[key];
      const bv = sortValue ? sortValue(b, key) : (b as Record<string, unknown>)[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * mult;
      }
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * mult;
    });
  }, [filtered, sort, sortValue]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageData = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  );

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
    setPage(1);
  }

  return {
    pageData,
    page: safePage,
    pageSize,
    total,
    sort,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    toggleSort,
    resetPage: () => setPage(1),
  };
}
