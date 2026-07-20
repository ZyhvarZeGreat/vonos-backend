"use client";

import type { ReactNode } from "react";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { DataTable, type ColumnConfig, type FilterConfig, type ServerSortConfig } from "@/components/organisms/DataTable";
import type { ServerListPaginationProps } from "@/lib/hooks/useServerListPage";

type ServerPaginatedTableBaseProps<T extends { id: string }> = {
  items: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  error?: string | null;
  onRowClick?: (row: T) => void;
  emptyState?: { message: string; ctaLabel?: string; onCta?: () => void };
  filters?: FilterConfig[];
  virtualized?: boolean;
  toolbar?: ReactNode;
  serverSort?: ServerSortConfig;
};

export type ServerPaginatedTableProps<T extends { id: string }> =
  ServerPaginatedTableBaseProps<T> &
    (
      | { pagination: ServerListPaginationProps }
      | (ServerListPaginationProps & { pagination?: undefined })
    );

function resolvePagination<T extends { id: string }>(
  props: ServerPaginatedTableProps<T>,
): ServerListPaginationProps {
  if ("pagination" in props && props.pagination) {
    return props.pagination;
  }
  return {
    pageIndex: props.pageIndex,
    pageSize: props.pageSize,
    hasMore: props.hasMore,
    canGoPrev: props.canGoPrev,
    onNext: props.onNext,
    onPrev: props.onPrev,
    onPageSizeChange: props.onPageSizeChange,
    onPageSelect: props.onPageSelect,
    canSelectPage: props.canSelectPage,
    isFetching: props.isFetching,
    totalCount: props.totalCount,
  };
}

/** Server cursor-paginated table — one API page at a time, numbered page nav when URL-synced. */
export function ServerPaginatedTable<T extends { id: string }>(
  props: ServerPaginatedTableProps<T>,
) {
  const {
    items,
    columns,
    isLoading = false,
    error = null,
    onRowClick,
    emptyState,
    filters,
    virtualized = false,
    toolbar,
    serverSort,
  } = props;

  const {
    pageIndex,
    pageSize,
    hasMore,
    canGoPrev,
    onNext,
    onPrev,
    onPageSizeChange,
    onPageSelect,
    canSelectPage,
    isFetching = false,
    totalCount,
  } = resolvePagination(props);

  const showPagination = items.length > 0 || canGoPrev || isLoading;
  const busy = isFetching && !isLoading;

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
        isLoading={isLoading}
        isFetching={busy}
        error={error}
        onRowClick={onRowClick}
        emptyState={emptyState}
        serverSort={serverSort}
      />
      {showPagination && !isLoading ? (
        <CursorPaginationBar
          pageIndex={pageIndex}
          pageSize={pageSize}
          itemCount={items.length}
          hasMore={hasMore}
          canGoPrev={canGoPrev}
          onPrev={onPrev}
          onNext={onNext}
          onPageSizeChange={onPageSizeChange}
          onPageSelect={onPageSelect}
          canSelectPage={canSelectPage}
          totalItems={totalCount}
          isBusy={busy}
        />
      ) : null}
    </div>
  );
}
