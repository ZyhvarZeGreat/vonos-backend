"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsFetching } from "@tanstack/react-query";
import { cn } from "@/lib/utils/cn";

/**
 * Thin top-of-viewport progress indicator for route transitions and in-flight
 * React Query fetches. Prefer this over full-page skeletons for main chrome.
 */
export function TopProgressBar({ className }: { className?: string }) {
  const pathname = usePathname();
  const fetching = useIsFetching();
  const [visible, setVisible] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const prevPath = useRef(pathname);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      setNavigating(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setNavigating(false), 280);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  const active = navigating || fetching > 0;

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 200);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible && !active) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-transparent",
        className,
      )}
      role="progressbar"
      aria-hidden={!active}
      aria-valuetext={active ? "Loading" : undefined}
    >
      <div
        className={cn(
          "h-full w-1/2 bg-[var(--color-brand-primary,#2563eb)] opacity-90",
          active ? "animate-top-progress" : "opacity-0",
        )}
      />
    </div>
  );
}
