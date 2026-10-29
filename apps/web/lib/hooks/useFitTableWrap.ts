"use client";

import { useEffect, type RefObject } from "react";

/**
 * Size a scrollable table wrap to the viewport so a sticky totals row is
 * visible on load (not only after scrolling the page).
 *
 * Deliberately avoids observing `document.documentElement` — that fires on any
 * page-wide layout change (e.g. a modal locking the scrollbar) and can loop.
 * Instead it re-fits on: mount, window resize, and DOM mutations inside the
 * wrap (rows/tfoot mounting after data loads).
 */
export function useFitTableWrap(
  ref: RefObject<HTMLDivElement | null>,
  options?: { requireTfoot?: boolean; margin?: number },
) {
  const requireTfoot = options?.requireTfoot ?? false;
  const margin = options?.margin ?? 16;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (requireTfoot && !el.querySelector("table tfoot")) {
          el.style.maxHeight = "";
          return;
        }
        const top = el.getBoundingClientRect().top;
        if (top < 0) return;
        const next = `${Math.max(
          240,
          Math.round(window.innerHeight - top - margin),
        )}px`;
        if (el.style.maxHeight !== next) el.style.maxHeight = next;
      });
    };

    fit();
    const timer = window.setTimeout(fit, 300);
    window.addEventListener("resize", fit);

    // Rows/tfoot mount after the first paint (data load) — re-fit then.
    const mutations = new MutationObserver(fit);
    mutations.observe(el, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", fit);
      mutations.disconnect();
    };
  }, [ref, requireTfoot, margin]);
}
