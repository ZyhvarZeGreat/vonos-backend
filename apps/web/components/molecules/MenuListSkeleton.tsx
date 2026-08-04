"use client";

import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils/cn";

/** Pulse rows for searchable menus — fills the panel instantly while options load. */
export function MenuListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("tw-flex tw-flex-col tw-gap-1 tw-px-3 tw-py-2", className)}
      role="status"
      aria-label="Loading options"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="tw-flex tw-items-center tw-justify-between tw-gap-3 tw-py-1.5"
        >
          <Skeleton
            className="tw-h-3.5 tw-rounded"
            style={{ width: `${58 - (i % 3) * 10}%` }}
          />
          <Skeleton className="tw-h-3 tw-w-10 tw-shrink-0 tw-rounded" />
        </div>
      ))}
    </div>
  );
}
