/** Up to `maxButtons` page numbers (1-based) centered on the current page. */
export function visiblePageNumbers(
  pageIndex: number,
  options: {
    totalPages?: number;
    hasMore?: boolean;
    maxButtons?: number;
  } = {},
): number[] {
  const maxButtons = options.maxButtons ?? 5;
  const current = pageIndex + 1;

  let total = options.totalPages;
  if (total == null) {
    total = current + (options.hasMore ? 1 : 0);
  }

  if (total <= 0) return [1];
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  let start = Math.max(1, current - Math.floor(maxButtons / 2));
  let end = start + maxButtons - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - maxButtons + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
