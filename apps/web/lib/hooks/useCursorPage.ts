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
    fetchNext: (
      cursor: string | undefined,
      /** Page index being loaded (0-based). */
      pageIndex: number,
    ) => Promise<string | null>,
  ) => Promise<number>;
}

/** Cursor stack for server-paginated lists (composite or id cursors). */
export function useCursorPage(): CursorPageState {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursorsRef = useRef(cursors);
  cursorsRef.current = cursors;
  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;

  const cursor = cursors[pageIndex];

  const goNext = useCallback((nextCursor: string) => {
    const index = pageIndexRef.current;
    const nextCursors = [
      ...cursorsRef.current.slice(0, index + 1),
      nextCursor,
    ];
    cursorsRef.current = nextCursors;
    pageIndexRef.current = index + 1;
    setCursors(nextCursors);
    setPageIndex(index + 1);
  }, []);

  const goPrev = useCallback(() => {
    const next = Math.max(0, pageIndexRef.current - 1);
    pageIndexRef.current = next;
    setPageIndex(next);
  }, []);

  const goToPage = useCallback((index: number) => {
    if (index < 0 || index >= cursorsRef.current.length) return;
    pageIndexRef.current = index;
    setPageIndex(index);
  }, []);

  const reset = useCallback(() => {
    cursorsRef.current = [undefined];
    pageIndexRef.current = 0;
    setPageIndex(0);
    setCursors([undefined]);
  }, []);

  const extendCursorsTo = useCallback(
    async (
      targetIndex: number,
      fetchNext: (
        cursor: string | undefined,
        pageIndex: number,
      ) => Promise<string | null>,
    ): Promise<number> => {
      if (targetIndex < 0) return 0;

      let nextCursors = [...cursorsRef.current];
      while (nextCursors.length <= targetIndex) {
        const pageBeingFetched = nextCursors.length - 1;
        const fetchCursor = nextCursors[pageBeingFetched];
        const next = await fetchNext(fetchCursor, pageBeingFetched);
        if (!next) break;
        nextCursors = [...nextCursors, next];
      }

      const reachable = Math.max(0, nextCursors.length - 1);
      const landing = Math.min(targetIndex, reachable);

      cursorsRef.current = nextCursors;
      pageIndexRef.current = landing;
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
