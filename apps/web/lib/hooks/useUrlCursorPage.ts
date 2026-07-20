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
    extendCursorsTo: extendCursorsToBase,
  } = useCursorPage();

  const skipUrlSyncRef = useRef(false);
  const isExtendingRef = useRef(false);
  const prevUrlPageIndexRef = useRef(urlPageIndex);

  const extendCursorsTo = useCallback(
    async (
      targetIndex: number,
      fetchNext: (cursor: string | undefined) => Promise<string | null>,
    ) => {
      isExtendingRef.current = true;
      try {
        return await extendCursorsToBase(targetIndex, fetchNext);
      } finally {
        isExtendingRef.current = false;
      }
    },
    [extendCursorsToBase],
  );

  // URL → cursor stack when the user navigates via back/forward (not when pageIndex leads).
  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    if (isExtendingRef.current) return;

    const urlChanged = prevUrlPageIndexRef.current !== urlPageIndex;
    prevUrlPageIndexRef.current = urlPageIndex;

    if (!urlChanged || urlPageIndex === pageIndex) return;
    if (urlPageIndex > maxReachablePageIndex) return;
    goToPage(urlPageIndex);
  }, [goToPage, maxReachablePageIndex, pageIndex, urlPageIndex]);

  // Prevent landing beyond the cursor stack (skip while extending cursors).
  useEffect(() => {
    if (isExtendingRef.current) return;
    if (pageIndex > maxReachablePageIndex) {
      goToPage(maxReachablePageIndex);
    }
  }, [goToPage, maxReachablePageIndex, pageIndex]);

  // Cursor stack → URL (don't clobber a deep-link/jump target mid-extension).
  useEffect(() => {
    if (skipUrlSyncRef.current || isExtendingRef.current) return;
    if (pageIndex === urlPageIndex) return;
    if (urlPageIndex > maxReachablePageIndex && pageIndex < urlPageIndex) return;
    setUrlPageIndex(pageIndex);
  }, [maxReachablePageIndex, pageIndex, setUrlPageIndex, urlPageIndex]);

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
