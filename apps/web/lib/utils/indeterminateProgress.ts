/**
 * Snappy fake progress — races toward the ceiling so redirects feel instant.
 * Real completion snaps to 100% when the caller finishes.
 */
export const INDETERMINATE_PROGRESS_CEILING = 90;

/** One tick of the former ease-toward-90% curve. */
export function nextIndeterminatePercent(current: number): number {
  const gap = INDETERMINATE_PROGRESS_CEILING - Math.max(0, current);
  return Math.min(
    INDETERMINATE_PROGRESS_CEILING,
    current + Math.max(0.9, gap * 0.14),
  );
}
