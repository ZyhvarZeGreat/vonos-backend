"use client";

import { useCallback, useState } from "react";

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
}

/** Cursor stack for server-paginated lists (composite or id cursors). */
export function useCursorPage(): CursorPageState {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

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
      if (index < 0 || index >= cursors.length) return current;
      return index;
    });
  }, [cursors.length]);

  const reset = useCallback(() => {
    setPageIndex(0);
    setCursors([undefined]);
  }, []);

  return {
    pageIndex,
    cursor,
    canGoPrev: pageIndex > 0,
    goNext,
    goPrev,
    goToPage,
    reset,
    maxReachablePageIndex: Math.max(0, cursors.length - 1),
  };
}
