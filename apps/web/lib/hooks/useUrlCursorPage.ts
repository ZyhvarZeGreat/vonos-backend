"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCursorPage } from "@/lib/hooks/useCursorPage";
import { useUrlPageParams } from "@/lib/hooks/useUrlPageParams";

/** Cursor pagination with `page` / `pageSize` synced to the URL. */
export function useUrlCursorPage(defaultPageSize = 10) {
  const {
    pageIndex: urlPageIndex,
    pageSize,
    setPageIndex: setUrlPageIndex,
    setPageSize: setUrlPageSize,
  } = useUrlPageParams(defaultPageSize);
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

  const skipUrlSyncRef = useRef(false);

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    if (urlPageIndex !== pageIndex) {
      goToPage(urlPageIndex);
    }
  }, [goToPage, pageIndex, urlPageIndex]);

  useEffect(() => {
    if (pageIndex > maxReachablePageIndex) {
      goToPage(maxReachablePageIndex);
    }
  }, [goToPage, maxReachablePageIndex, pageIndex]);

  useEffect(() => {
    if (pageIndex !== urlPageIndex) {
      setUrlPageIndex(pageIndex);
    }
  }, [pageIndex, setUrlPageIndex, urlPageIndex]);

  const resetAll = useCallback(() => {
    skipUrlSyncRef.current = true;
    reset();
    setUrlPageIndex(0);
  }, [reset, setUrlPageIndex]);

  const setPageSize = useCallback(
    (size: number) => {
      skipUrlSyncRef.current = true;
      setUrlPageSize(size);
      reset();
    },
    [reset, setUrlPageSize],
  );

  return {
    pageIndex,
    pageSize,
    cursor,
    canGoPrev,
    goNext,
    goPrev,
    goToPage,
    reset: resetAll,
    setPageSize,
    maxReachablePageIndex,
    extendCursorsTo,
    canSelectPage: (index: number) => index <= maxReachablePageIndex,
  };
}
