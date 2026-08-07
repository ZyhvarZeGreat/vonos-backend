"use client";

import type { ReactNode } from "react";
import { useInViewport } from "@/lib/hooks/useInViewport";
import { cn } from "@/lib/utils/cn";

export interface ViewportDeferProps {
  children: ReactNode;
  /** Shown until the region is near the viewport. */
  fallback?: ReactNode;
  className?: string;
  /** Keep layout stable while deferred (e.g. chart card height). */
  minHeight?: number | string;
  rootMargin?: string;
}

/**
 * Mount children only after the wrapper is near the viewport.
 * Prefer gating React Query `enabled` with `useInViewport` when the goal is
 * to skip network; use this to skip heavy chart mounts.
 */
export function ViewportDefer({
  children,
  fallback = null,
  className,
  minHeight,
  rootMargin,
}: ViewportDeferProps) {
  const { ref, inView } = useInViewport({ rootMargin });

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={minHeight != null ? { minHeight } : undefined}
    >
      {inView ? children : fallback}
    </div>
  );
}
