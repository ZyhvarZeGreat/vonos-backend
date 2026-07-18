"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Spinner } from "@/components/atoms/Spinner";
import { DropdownMenu } from "@/components/molecules/DropdownMenu";
import { visiblePageNumbers } from "@/lib/utils/paginationWindow";
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
  /** Known total pages — enables numbered page buttons (up to 5 visible). */
  totalPages?: number;
  /** Full row count when known (e.g. client-paginated tables). */
  totalItems?: number;
  /** Jump to a page by index (0-based). */
  onPageSelect?: (pageIndex: number) => void;
  /** When set, only these page indices are clickable (cursor-paginated lists). */
  canSelectPage?: (pageIndex: number) => boolean;
  maxPageButtons?: number;
  /** Disables navigation while the current page is refetching. */
  isBusy?: boolean;
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
  totalPages,
  totalItems,
  onPageSelect,
  canSelectPage,
  maxPageButtons = 5,
  isBusy = false,
  className,
}: CursorPaginationBarProps) {
  const start = itemCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = pageIndex * pageSize + itemCount;
  const resolvedTotalPages =
    totalPages ??
    (totalItems != null ? Math.max(1, Math.ceil(totalItems / pageSize)) : undefined);

  const showNumberedPages = Boolean(onPageSelect);
  const pageNumbers = showNumberedPages
    ? visiblePageNumbers(pageIndex, {
        totalPages: resolvedTotalPages,
        hasMore: resolvedTotalPages == null ? hasMore : false,
        maxButtons: maxPageButtons,
      })
    : [];

  const rangeLabel =
    itemCount === 0
      ? "No entries"
      : totalItems != null
        ? `Showing ${start} to ${end} of ${totalItems.toLocaleString()} entries`
        : `Showing ${start}–${hasMore ? `${end}+` : String(end)}`;

  const pageButtonClass = (active: boolean, enabled: boolean) =>
    cn(
      "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
      active
        ? "bg-[var(--color-brand-primary)] text-white"
        : enabled
          ? "text-foreground hover:bg-[var(--color-surface-muted)]"
          : "cursor-not-allowed text-muted opacity-50",
    );

  const isPageSelectable = (pageNumber: number) => {
    const index = pageNumber - 1;
    if (canSelectPage) return canSelectPage(index);
    if (resolvedTotalPages != null) return index < resolvedTotalPages;
    return index <= pageIndex;
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] p-4 text-sm text-[var(--color-text-secondary)]",
        isBusy && "opacity-80",
        className,
      )}
      aria-busy={isBusy || undefined}
    >
      <div className="flex items-center gap-2">
        {isBusy ? (
          <Spinner size="sm" className="text-[var(--color-brand-primary)]" />
        ) : null}
        <span>{rangeLabel}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canGoPrev || isBusy}
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-[var(--color-surface-muted)] hover:text-foreground disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {showNumberedPages ? (
          pageNumbers.map((pageNumber) => {
            const index = pageNumber - 1;
            const active = index === pageIndex;
            const enabled = !active && isPageSelectable(pageNumber) && !isBusy;
            return (
              <button
                key={pageNumber}
                type="button"
                disabled={!active && !enabled}
                onClick={() => {
                  if (enabled) onPageSelect?.(index);
                }}
                className={pageButtonClass(active, active || enabled)}
                aria-label={`Page ${pageNumber}`}
                aria-current={active ? "page" : undefined}
              >
                {pageNumber}
              </button>
            );
          })
        ) : (
          <span className="min-w-[4rem] text-center text-sm font-medium text-foreground">
            Page {pageIndex + 1}
          </span>
        )}

        <button
          type="button"
          disabled={!hasMore || isBusy}
          onClick={onNext}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-[var(--color-surface-muted)] hover:text-foreground disabled:opacity-40"
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
            { value: "100", label: "100" },
          ]}
          onSelect={(value) => onPageSizeChange(Number(value))}
          trigger={
            <button
              type="button"
              disabled={isBusy}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-sm hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
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
