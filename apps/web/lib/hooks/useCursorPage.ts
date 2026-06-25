"use client";

import { useCallback, useState } from "react";

export interface CursorPageState {
  pageIndex: number;
  cursor: string | undefined;
  canGoPrev: boolean;
  goNext: (lastItemId: string) => void;
  goPrev: () => void;
  reset: () => void;
}

/** Cursor stack for server-paginated lists (id-based cursors). */
export function useCursorPage(): CursorPageState {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);

  const cursor = cursors[pageIndex];

  const goNext = useCallback((lastItemId: string) => {
    setPageIndex((index) => {
      setCursors((prev) => [...prev.slice(0, index + 1), lastItemId]);
      return index + 1;
    });
  }, []);

  const goPrev = useCallback(() => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, []);

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
    reset,
  };
}
