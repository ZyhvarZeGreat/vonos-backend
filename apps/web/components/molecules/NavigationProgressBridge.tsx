"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  completeNavigationProgress,
  startNavigationProgress,
} from "@/stores/navigationBusyStore";

function isInternalNavAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.hasAttribute("download")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  const samePath =
    url.pathname === window.location.pathname &&
    url.search === window.location.search;
  // Allow hash-only skips; same path+search with different hash is not a route nav.
  if (samePath) return false;
  return true;
}

/**
 * Starts top progress on internal link clicks (before the route settles) and
 * completes when pathname/search changes. Covers Next `<Link>` and plain `<a>`.
 */
export function NavigationProgressBridge() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const routeKey = `${pathname}?${search}`;
  const prevRoute = useRef(routeKey);
  const booted = useRef(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavAnchor(anchor)) return;
      startNavigationProgress();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      prevRoute.current = routeKey;
      return;
    }
    if (prevRoute.current === routeKey) return;
    prevRoute.current = routeKey;
    // Path settled — finish the bar (React Query fetching may keep TopProgressBar alive).
    completeNavigationProgress();
  }, [routeKey]);

  return null;
}
