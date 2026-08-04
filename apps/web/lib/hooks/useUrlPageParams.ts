"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  // Reject 0 / negative (DataTables "All" used to send -1 and crashed Prisma take).
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
 * Local state updates immediately so the table can flip from cache without
 * waiting on the URL. Address-bar writes use `history.replaceState` (not the
 * Next router) so soft-navigations do not remount the list.
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
  /** Ignore Next searchParams echoes briefly after our own replaceState. */
  const ignoreRouterSyncUntilRef = useRef(0);

  // External URL changes → local state.
  // Always prefer `window.location.search`: we write via replaceState, which
  // leaves Next `useSearchParams` stale. Syncing from that stale value was
  // snapping lists back to page 1 after Next/numbered jumps.
  useEffect(() => {
    if (Date.now() < ignoreRouterSyncUntilRef.current) return;
    const live =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : searchParams;
    const nextIndex = readPageIndex(live);
    const nextSize = readPageSize(live, defaultPageSize);
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

  const writeUrl = useCallback(
    (nextPageIndex: number, nextPageSize: number) => {
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
        href === `${window.location.pathname}${window.location.search}`
      ) {
        return;
      }
      // Ignore router searchParams for a beat — replaceState does not update them.
      ignoreRouterSyncUntilRef.current = Date.now() + 750;
      window.history.replaceState(window.history.state, "", href);
    },
    [],
  );

  const commit = useCallback(
    (next: { pageIndex?: number; pageSize?: number }) => {
      const nextPageIndex = next.pageIndex ?? pageIndexRef.current;
      const nextPageSize = next.pageSize ?? pageSizeRef.current;

      pageIndexRef.current = nextPageIndex;
      pageSizeRef.current = nextPageSize;
      setPageIndexState(nextPageIndex);
      setPageSizeState(nextPageSize);
      writeUrl(nextPageIndex, nextPageSize);
    },
    [writeUrl],
  );

  const setPageIndex = useCallback(
    (index: number) => commit({ pageIndex: Math.max(0, index) }),
    [commit],
  );

  const setPageSize = useCallback(
    (size: number) => {
      const safe =
        Number.isFinite(size) && size > 0
          ? Math.min(Math.floor(size), 1000)
          : defaultPageSizeRef.current;
      commit({ pageIndex: 0, pageSize: safe });
    },
    [commit],
  );

  return {
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
  };
}
