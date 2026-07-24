"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readPageIndex(params: URLSearchParams): number {
  return Math.max(0, parsePositiveInt(params.get("page"), 1) - 1);
}

function readPageSize(params: URLSearchParams, defaultPageSize: number): number {
  return parsePositiveInt(params.get("pageSize"), defaultPageSize);
}

/**
 * Sync `page` (1-based) and `pageSize` query params with the current route.
 *
 * Page-index writes are debounced so rapid Next/Prev does not thrash the
 * address bar or trip Next.js into soft navigations. Local state updates
 * immediately so the table can flip from cache without waiting on the URL.
 */
export function useUrlPageParams(defaultPageSize = 10) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [pageIndex, setPageIndexState] = useState(() =>
    readPageIndex(searchParams),
  );
  const [pageSize, setPageSizeState] = useState(() =>
    readPageSize(searchParams, defaultPageSize),
  );

  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const defaultPageSizeRef = useRef(defaultPageSize);
  defaultPageSizeRef.current = defaultPageSize;
  const urlWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSearchParamsSyncRef = useRef(false);

  // External URL changes (shared link, real Next navigation) → local state.
  useEffect(() => {
    if (skipSearchParamsSyncRef.current) {
      skipSearchParamsSyncRef.current = false;
      return;
    }
    const nextIndex = readPageIndex(searchParams);
    const nextSize = readPageSize(searchParams, defaultPageSize);
    setPageIndexState((prev) => (prev === nextIndex ? prev : nextIndex));
    setPageSizeState((prev) => (prev === nextSize ? prev : nextSize));
  }, [defaultPageSize, searchParams]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setPageIndexState(readPageIndex(params));
      setPageSizeState(readPageSize(params, defaultPageSizeRef.current));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(
    () => () => {
      if (urlWriteTimerRef.current) clearTimeout(urlWriteTimerRef.current);
    },
    [],
  );

  const writeUrl = useCallback(
    (nextPageIndex: number, nextPageSize: number, immediate: boolean) => {
      const apply = () => {
        const defaultSize = defaultPageSizeRef.current;
        const params = new URLSearchParams(window.location.search);
        if (nextPageIndex <= 0) params.delete("page");
        else params.set("page", String(nextPageIndex + 1));

        if (nextPageSize === defaultSize) params.delete("pageSize");
        else params.set("pageSize", String(nextPageSize));

        const query = params.toString();
        const href = query
          ? `${pathnameRef.current}?${query}`
          : pathnameRef.current;
        if (
          href ===
          `${window.location.pathname}${window.location.search}`
        ) {
          return;
        }
        skipSearchParamsSyncRef.current = true;
        window.history.replaceState(window.history.state, "", href);
      };

      if (urlWriteTimerRef.current) clearTimeout(urlWriteTimerRef.current);
      if (immediate) {
        apply();
        return;
      }
      // Debounce page flips — keeps prefetch/cache UX snappy.
      urlWriteTimerRef.current = setTimeout(apply, 400);
    },
    [],
  );

  const commit = useCallback(
    (
      next: { pageIndex?: number; pageSize?: number },
      opts?: { immediateUrl?: boolean },
    ) => {
      const nextPageIndex = next.pageIndex ?? pageIndexRef.current;
      const nextPageSize = next.pageSize ?? pageSizeRef.current;
      const pageSizeChanged = next.pageSize != null && next.pageSize !== pageSizeRef.current;

      pageIndexRef.current = nextPageIndex;
      pageSizeRef.current = nextPageSize;
      setPageIndexState(nextPageIndex);
      setPageSizeState(nextPageSize);

      writeUrl(
        nextPageIndex,
        nextPageSize,
        Boolean(opts?.immediateUrl || pageSizeChanged),
      );
    },
    [writeUrl],
  );

  const setPageIndex = useCallback(
    (index: number) => commit({ pageIndex: Math.max(0, index) }),
    [commit],
  );

  const setPageSize = useCallback(
    (size: number) =>
      commit({ pageIndex: 0, pageSize: size }, { immediateUrl: true }),
    [commit],
  );

  return {
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
  };
}
