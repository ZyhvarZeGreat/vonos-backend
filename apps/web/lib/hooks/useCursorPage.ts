"use client";

import { useCallback, useRef, useState } from "react";

export interface CursorPageState {
  pageIndex: number;
  cursor: string | undefined;
  canGoPrev: boolean;
  goNext: (nextCursor: string) => void;
  goPrev: () => void;
  goToPage: (pageIndex: number) => void;
  reset: () => void;
  /** Highest page index reachable with the current cursor stack. */
  maxReachablePageIndex: number;
  /** Walk forward through cursors until `targetIndex` is reachable (or data ends). */
  extendCursorsTo: (
    targetIndex: number,
    fetchNext: (cursor: string | undefined) => Promise<string | null>,
  ) => Promise<number>;
}

/** Cursor stack for server-paginated lists (composite or id cursors). */
export function useCursorPage(): CursorPageState {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursorsRef = useRef(cursors);
  cursorsRef.current = cursors;

  const cursor = cursors[pageIndex];

  const goNext = useCallback((nextCursor: string) => {
    setPageIndex((index) => {
      setCursors((prev) => [...prev.slice(0, index + 1), nextCursor]);
      return index + 1;
    });
  }, []);

  const goPrev = useCallback(() => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToPage = useCallback((index: number) => {
    setPageIndex((current) => {
      if (index < 0 || index >= cursorsRef.current.length) return current;
      return index;
    });
  }, []);

  const reset = useCallback(() => {
    setPageIndex(0);
    setCursors([undefined]);
  }, []);

  const extendCursorsTo = useCallback(
    async (
      targetIndex: number,
      fetchNext: (cursor: string | undefined) => Promise<string | null>,
    ): Promise<number> => {
      if (targetIndex < 0) return 0;

      let nextCursors = [...cursorsRef.current];
      while (nextCursors.length <= targetIndex) {
        const fetchCursor = nextCursors[nextCursors.length - 1];
        const next = await fetchNext(fetchCursor);
        if (!next) break;
        nextCursors = [...nextCursors, next];
      }

      const reachable = Math.max(0, nextCursors.length - 1);
      const landing = Math.min(targetIndex, reachable);

      // Batch cursor stack + page index so clamp effects never see a mismatch.
      setCursors(nextCursors);
      setPageIndex(landing);
      return landing;
    },
    [],
  );

  return {
    pageIndex,
    cursor,
    canGoPrev: pageIndex > 0,
    goNext,
    goPrev,
    goToPage,
    reset,
    maxReachablePageIndex: Math.max(0, cursors.length - 1),
    extendCursorsTo,
  };
}
