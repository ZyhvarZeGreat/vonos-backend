"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCursorPage } from "@/lib/hooks/useCursorPage";
import { useUrlPageParams } from "@/lib/hooks/useUrlPageParams";

/**
 * Cursor pagination with `page` / `pageSize` synced to the URL.
 *
 * Important: only ONE effect owns URL ↔ stack sync. Competing effects
 * (URL→stack, stack→URL, clamp) previously fought during deep-links and
 * pageSize changes, which made `?page=` / `?pageSize=` routes flicker.
 */
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

  /** Suppress the next stack→URL write (after reset / pageSize). */
  const suppressUrlWriteRef = useRef(false);
  /** True while walking cursors for a deep-link / numbered jump. */
  const isExtendingRef = useRef(false);
  const prevUrlPageIndexRef = useRef(urlPageIndex);

  const extendCursorsTo = useCallback(
    async (
      targetIndex: number,
      fetchNext: (
        cursor: string | undefined,
        pageIndex: number,
      ) => Promise<string | null>,
    ) => {
      isExtendingRef.current = true;
      try {
        return await extendCursorsToBase(targetIndex, fetchNext);
      } finally {
        // Keep the guard through the commit that applies landing pageIndex.
        queueMicrotask(() => {
          isExtendingRef.current = false;
        });
      }
    },
    [extendCursorsToBase],
  );

  // Single bidirectional sync — never write URL while URL is ahead of the
  // cursor stack (deep-link / jump in progress).
  useEffect(() => {
    if (isExtendingRef.current) return;

    const urlChanged = prevUrlPageIndexRef.current !== urlPageIndex;
    if (urlChanged) {
      prevUrlPageIndexRef.current = urlPageIndex;
    }

    if (urlPageIndex === pageIndex) {
      suppressUrlWriteRef.current = false;
      return;
    }

    // URL moved (back/forward, replace, or deep-link) and stack can satisfy it.
    if (urlChanged && urlPageIndex <= maxReachablePageIndex) {
      goToPage(urlPageIndex);
      return;
    }

    // URL is ahead of the stack — useServerListPage walks cursors; do not
    // clobber `?page=` back down to the stack head.
    if (urlPageIndex > maxReachablePageIndex) {
      return;
    }

    // Stack moved (Next / Prev / goToPage) — mirror into the URL.
    if (suppressUrlWriteRef.current) {
      suppressUrlWriteRef.current = false;
      return;
    }
    setUrlPageIndex(pageIndex);
  }, [
    goToPage,
    maxReachablePageIndex,
    pageIndex,
    setUrlPageIndex,
    urlPageIndex,
  ]);

  // Safety clamp if stack shrinks under the current index (should be rare).
  useEffect(() => {
    if (isExtendingRef.current) return;
    if (pageIndex > maxReachablePageIndex) {
      goToPage(maxReachablePageIndex);
    }
  }, [goToPage, maxReachablePageIndex, pageIndex]);

  const resetAll = useCallback(() => {
    suppressUrlWriteRef.current = true;
    prevUrlPageIndexRef.current = 0;
    reset();
    setUrlPageIndex(0);
  }, [reset, setUrlPageIndex]);

  const setPageSize = useCallback(
    (size: number) => {
      suppressUrlWriteRef.current = true;
      prevUrlPageIndexRef.current = 0;
      reset();
      setUrlPageSize(size); // also forces pageIndex 0 in the URL
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
