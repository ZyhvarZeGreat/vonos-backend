"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseInViewportOptions {
  /** Expand the intersection root (default: 280px). */
  rootMargin?: string;
  /** Stop observing after first enter (default: true). */
  once?: boolean;
  /** Start as visible (useful for SSR / always-on). Default false. */
  initialInView?: boolean;
}

/**
 * Observe when an element enters (near) the viewport.
 * Used to defer chart fetches/mounts until the panel is about to show.
 */
export function useInViewport<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewportOptions = {},
): { ref: RefObject<T | null>; inView: boolean } {
  const {
    rootMargin = "280px 0px",
    once = true,
    initialInView = false,
  } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(initialInView);

  useEffect(() => {
    if (initialInView) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setInView(true);
        if (once) observer.disconnect();
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [initialInView, once, rootMargin]);

  return { ref, inView };
}
