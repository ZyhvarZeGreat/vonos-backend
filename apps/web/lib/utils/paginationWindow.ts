/**
 * DataTables-style “Showing X to Y of Z” bounds.
 * Never lets `to` (or `from`) exceed a known total — common when
 * keepPreviousData briefly paints a prior full page after Next / page-size change.
 */
export function listEntryRange(options: {
  pageIndex: number;
  pageSize: number;
  itemCount: number;
  totalCount?: number | null;
}): { from: number; to: number; total: number | undefined } {
  const pageSize = Math.max(0, options.pageSize);
  const itemCount = Math.max(0, options.itemCount);
  const total =
    options.totalCount == null || !Number.isFinite(options.totalCount)
      ? undefined
      : Math.max(0, Math.floor(options.totalCount));

  if (itemCount === 0) {
    return { from: 0, to: 0, total: total ?? 0 };
  }

  const rawFrom = options.pageIndex * pageSize + 1;
  const rawTo = options.pageIndex * pageSize + itemCount;

  if (total == null) {
    return { from: rawFrom, to: rawTo, total: undefined };
  }
  if (total === 0 || rawFrom > total) {
    return { from: 0, to: 0, total };
  }
  return {
    from: Math.min(rawFrom, total),
    to: Math.min(rawTo, total),
    total,
  };
}

export function formatListEntriesLabel(range: {
  from: number;
  to: number;
  total?: number | null;
}): string {
  if (range.from === 0 && range.to === 0) {
    const total = range.total ?? 0;
    return `Showing 0 to 0 of ${total.toLocaleString()} entries`;
  }
  if (range.total != null) {
    return `Showing ${range.from} to ${range.to} of ${range.total.toLocaleString()} entries`;
  }
  return `Showing ${range.from} to ${range.to} entries`;
}

/**
 * Exact page count from total entries ÷ page size.
 * 40 entries @ 25/page → 2. Never invents extra pages.
 */
export function totalPagesFromEntries(
  totalCount: number | null | undefined,
  pageSize: number,
): number | undefined {
  if (totalCount == null || !Number.isFinite(totalCount)) return undefined;
  const size = Math.max(1, pageSize);
  const total = Math.max(0, Math.floor(totalCount));
  if (total === 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

/** Up to `maxButtons` page numbers (1-based) centered on the current page. */
export function visiblePageNumbers(
  pageIndex: number,
  options: {
    totalPages?: number;
    hasMore?: boolean;
    maxButtons?: number;
  } = {},
): number[] {
  const maxButtons = Math.max(1, options.maxButtons ?? 5);
  const current = Math.max(1, pageIndex + 1);

  let total = options.totalPages;
  if (total == null) {
    // Unknown catalog size: only current page (+ next if hasMore). Never invent
    // a fake 1..5 strip — that showed page 5 when only 2 pages existed.
    total = options.hasMore ? current + 1 : current;
  }

  if (total <= 0) return [1];
  // Hard cap: never render a button past ceil(entries / pageSize).
  total = Math.floor(total);
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  let end = start + maxButtons - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - maxButtons + 1);
  }
  // Keep current inside the window even if callers pass a stale pageIndex.
  if (current < start) {
    start = current;
    end = Math.min(total, start + maxButtons - 1);
  }
  if (current > end) {
    end = current;
    start = Math.max(1, end - maxButtons + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * 0-based sliding window for HQ6 / DataTables paginate buttons.
 * Always centers on `pageIndex` — never a fixed `0..N` strip (that glitched jumps).
 */
export function slidingPageIndices(
  pageIndex: number,
  options: {
    totalPages?: number;
    hasMore?: boolean;
    maxButtons?: number;
  } = {},
): number[] {
  return visiblePageNumbers(pageIndex, options).map((n) => n - 1);
}

/**
 * Max page index the UI may jump to for cursor lists (visited stack + warm ahead).
 * Always capped by totalPages when known (entries ÷ page size).
 */
export function slidingJumpMaxIndex(
  maxReachablePageIndex: number,
  options: {
    hasMore: boolean;
    prefetchPagesAhead: number;
    totalPages?: number;
  },
): number {
  const ahead = Math.max(1, options.prefetchPagesAhead);
  let max = maxReachablePageIndex + (options.hasMore ? ahead : 0);
  if (options.totalPages != null) {
    max = Math.min(max, Math.max(0, options.totalPages - 1));
  }
  return Math.max(0, max);
}
