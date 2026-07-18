"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Sync `page` (1-based) and `pageSize` query params with the current route. */
export function useUrlPageParams(defaultPageSize = 10) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageIndex = Math.max(0, parsePositiveInt(searchParams.get("page"), 1) - 1);
  const pageSize = parsePositiveInt(
    searchParams.get("pageSize"),
    defaultPageSize,
  );

  const commit = useCallback(
    (next: { pageIndex?: number; pageSize?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextPageIndex = next.pageIndex ?? pageIndex;
      const nextPageSize = next.pageSize ?? pageSize;

      if (nextPageIndex <= 0) params.delete("page");
      else params.set("page", String(nextPageIndex + 1));

      if (nextPageSize === defaultPageSize) params.delete("pageSize");
      else params.set("pageSize", String(nextPageSize));

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultPageSize, pageIndex, pageSize, pathname, router, searchParams],
  );

  const setPageIndex = useCallback(
    (index: number) => commit({ pageIndex: Math.max(0, index) }),
    [commit],
  );

  const setPageSize = useCallback(
    (size: number) => commit({ pageIndex: 0, pageSize: size }),
    [commit],
  );

  return {
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
  };
}
