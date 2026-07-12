"use client";

import type { ReactNode } from "react";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { DataTableSkeleton } from "@/components/organisms/skeletons";
import { DataTable, type ColumnConfig, type FilterConfig } from "@/components/organisms/DataTable";

export interface ServerPaginatedTableProps<T extends { id: string }> {
  items: T[];
  columns: ColumnConfig<T>[];
  pageIndex: number;
  pageSize: number;
  hasMore: boolean;
  canGoPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRowClick?: (row: T) => void;
  emptyState?: { message: string; ctaLabel?: string; onCta?: () => void };
  filters?: FilterConfig[];
  virtualized?: boolean;
  toolbar?: ReactNode;
}

/** Server cursor-paginated table — one API page at a time, prev/next at the footer. */
export function ServerPaginatedTable<T extends { id: string }>({
  items,
  columns,
  pageIndex,
  pageSize,
  hasMore,
  canGoPrev,
  onNext,
  onPrev,
  onPageSizeChange,
  isLoading = false,
  isFetching = false,
  error = null,
  onRowClick,
  emptyState,
  filters,
  virtualized = false,
  toolbar,
}: ServerPaginatedTableProps<T>) {
  const columnHeaders = columns.map((column) => column.header);
  const showPagination = items.length > 0 || canGoPrev || isLoading;
  const busy = isFetching && !isLoading;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {toolbar}
        <DataTableSkeleton
          rows={8}
          columnHeaders={columnHeaders}
          withPagination
          embedded
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {toolbar}
      <DataTable
        data={items}
        columns={columns}
        filters={filters}
        displayMode="table"
        embedded
        virtualized={virtualized}
        disablePagination
        isFetching={busy}
        error={error}
        onRowClick={onRowClick}
        emptyState={emptyState}
      />
      {showPagination ? (
        <CursorPaginationBar
          pageIndex={pageIndex}
          pageSize={pageSize}
          itemCount={items.length}
          hasMore={hasMore}
          canGoPrev={canGoPrev}
          onPrev={onPrev}
          onNext={onNext}
          onPageSizeChange={onPageSizeChange}
          isBusy={busy}
        />
      ) : null}
    </div>
  );
}
