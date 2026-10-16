"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Filters panel open state for HQ6 list pages.
 *
 * Open by default on desktop; collapsed on mobile so the table (and its sticky
 * totals row) gets the limited vertical space. Hydration-safe: starts open to
 * match SSR, then collapses after mount when the viewport is mobile-sized.
 */
export function useFiltersPanelOpen(
  mobileQuery = "(max-width: 767px)",
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia(mobileQuery).matches) setOpen(false);
  }, [mobileQuery]);

  return [open, setOpen];
}
