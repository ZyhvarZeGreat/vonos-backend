"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
import {
  formatListEntriesLabel,
  listEntryRange,
  totalPagesFromEntries,
  visiblePageNumbers,
} from "@/lib/utils/paginationWindow";
import { cn } from "@/lib/utils/cn";

export interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationBarProps) {
  const pageIndex = Math.max(0, page - 1);
  const totalPages = totalPagesFromEntries(total, pageSize) ?? 1;
  const { from: start, to: end } = listEntryRange({
    pageIndex,
    pageSize,
    itemCount: Math.min(pageSize, Math.max(0, total - pageIndex * pageSize)),
    totalCount: total,
  });
  const pages = visiblePageNumbers(pageIndex, {
    totalPages,
    maxButtons: 7,
  });

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] p-4 text-sm text-[var(--color-text-secondary)]",
        className,
      )}
    >
      <div>{formatListEntriesLabel({ from: start, to: end, total })}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center text-muted hover:text-foreground disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md",
                p === page ? "font-medium text-foreground" : "hover:text-foreground",
              )}
            >
              {p}
            </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
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
            { value: "10", label: "10" },
            { value: "25", label: "25" },
            { value: "50", label: "50" },
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
