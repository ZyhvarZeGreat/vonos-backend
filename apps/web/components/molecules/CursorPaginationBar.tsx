"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
import { cn } from "@/lib/utils/cn";

export interface CursorPaginationBarProps {
  pageIndex: number;
  pageSize: number;
  itemCount: number;
  hasMore: boolean;
  canGoPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export function CursorPaginationBar({
  pageIndex,
  pageSize,
  itemCount,
  hasMore,
  canGoPrev,
  onPrev,
  onNext,
  onPageSizeChange,
  className,
}: CursorPaginationBarProps) {
  const start = itemCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + itemCount;
  const totalLabel = hasMore ? `${end}+` : String(end);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] p-4 text-sm text-[var(--color-text-secondary)]",
        className,
      )}
    >
      <div>
        {itemCount === 0
          ? "No entries"
          : `Showing ${start}–${totalLabel}`}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center text-muted hover:text-foreground disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[4rem] text-center text-sm font-medium text-foreground">
          Page {pageIndex + 1}
        </span>
        <button
          type="button"
          disabled={!hasMore}
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center text-muted hover:text-foreground disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">Show</span>
        <DropdownMenu
          value={String(pageSize)}
          options={[
            { value: "25", label: "25" },
            { value: "50", label: "50" },
            { value: "100", label: "100" },
          ]}
          onSelect={(value) => onPageSizeChange(Number(value))}
          trigger={
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-sm hover:bg-[var(--color-surface-muted)]"
            >
              {pageSize}
              <ChevronDown className="h-4 w-4 text-muted" />
            </button>
          }
        />
      </div>
    </div>
  );
}
