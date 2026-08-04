"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCursorPage } from "@/lib/hooks/useCursorPage";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readPageIndexFromLocation(): number {
  if (typeof window === "undefined") return 0;
  const params = new URLSearchParams(window.location.search);
  return Math.max(0, parsePositiveInt(params.get("page"), 1) - 1);
}

function readPageSizeFromLocation(defaultPageSize: number): number {
  if (typeof window === "undefined") return defaultPageSize;
  const params = new URLSearchParams(window.location.search);
  return parsePositiveInt(params.get("pageSize"), defaultPageSize);
}

function writeListPageToUrl(
  pageIndex: number,
  pageSize: number,
  defaultPageSize: number,
) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (pageIndex <= 0) params.delete("page");
  else params.set("page", String(pageIndex + 1));
  if (pageSize === defaultPageSize) params.delete("pageSize");
  else params.set("pageSize", String(pageSize));

  const query = params.toString();
  const href = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;
  if (href === `${window.location.pathname}${window.location.search}`) return;
  window.history.replaceState(window.history.state, "", href);
}

/**
 * Cursor pagination with a cosmetic URL mirror.
 *
 * Cursor stack = source of truth. URL is write-only after mount (shareable
 * links). We never sync Next `useSearchParams` back into the stack — that
 * race was snapping lists to page 1 on every Next/page click.
 */
export function useUrlCursorPage(defaultPageSize = 10) {
  const initialPageSize = readPageSizeFromLocation(defaultPageSize);
  const initialUrlPage = readPageIndexFromLocation();

  const {
    pageIndex,
    cursor,
    canGoPrev,
    goNext,
    goPrev,
    goToPage,
    reset,
    maxReachablePageIndex,
    extendCursorsTo,
  } = useCursorPage();

  const [pageSize, setPageSizeState] = useState(initialPageSize);
  /** Target page from deep link / popstate until the cursor stack catches up. */
  const [urlPageIndex, setUrlPageIndexState] = useState(initialUrlPage);
  const defaultPageSizeRef = useRef(defaultPageSize);
  defaultPageSizeRef.current = defaultPageSize;

  // Mirror stack → URL once the stack has reached (or passed) the URL target.
  useEffect(() => {
    if (pageIndex < urlPageIndex) {
      // Still walking toward a deep-linked page — don't clobber ?page=.
      return;
    }
    if (pageIndex !== urlPageIndex) {
      setUrlPageIndexState(pageIndex);
    }
    writeListPageToUrl(pageIndex, pageSize, defaultPageSizeRef.current);
  }, [pageIndex, pageSize, urlPageIndex]);

  useEffect(() => {
    const onPopState = () => {
      const nextIndex = readPageIndexFromLocation();
      const nextSize = readPageSizeFromLocation(defaultPageSizeRef.current);
      setPageSizeState(nextSize);
      setUrlPageIndexState(nextIndex);
      if (nextIndex <= maxReachablePageIndex) {
        goToPage(nextIndex);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [goToPage, maxReachablePageIndex]);

  const resetAll = useCallback(() => {
    reset();
    setUrlPageIndexState(0);
    writeListPageToUrl(0, pageSize, defaultPageSizeRef.current);
  }, [pageSize, reset]);

  const setPageSize = useCallback(
    (size: number) => {
      const safe =
        Number.isFinite(size) && size > 0
          ? Math.min(Math.floor(size), 1000)
          : defaultPageSizeRef.current;
      reset();
      setPageSizeState(safe);
      setUrlPageIndexState(0);
      writeListPageToUrl(0, safe, defaultPageSizeRef.current);
    },
    [reset],
  );

  const setUrlPageIndex = useCallback((index: number) => {
    setUrlPageIndexState(Math.max(0, index));
  }, []);

  return {
    pageIndex,
    urlPageIndex,
    pageSize,
    cursor,
    canGoPrev,
    goNext,
    goPrev,
    goToPage,
    reset: resetAll,
    setPageSize,
    setUrlPageIndex,
    maxReachablePageIndex,
    extendCursorsTo,
    canSelectPage: (index: number) => index <= maxReachablePageIndex,
  };
}
