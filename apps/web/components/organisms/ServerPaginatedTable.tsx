"use client";

import type { ReactNode } from "react";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import {
  DataTable,
  type ColumnConfig,
  type DataTableBulkAction,
  type FilterConfig,
  type ServerSortConfig,
} from "@/components/organisms/DataTable";
import type { ServerListPaginationProps } from "@/lib/hooks/useServerListPage";
import type { TableDensity } from "@/lib/utils/tableColumnAlign";

type ServerPaginatedTableBaseProps<T extends { id: string }> = {
  items: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  error?: string | null;
  onRowClick?: (row: T) => void;
  onRowPointerEnter?: (row: T) => void;
  emptyState?: { message: string; ctaLabel?: string; onCta?: () => void };
  filters?: FilterConfig[];
  virtualized?: boolean;
  toolbar?: ReactNode;
  serverSort?: ServerSortConfig;
  selectable?: boolean;
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
  enableColumnVisibility?: boolean;
  tableId?: string;
  bulkActions?: DataTableBulkAction[];
  /**
   * Table overlay. From `useServerListPage`, pass `isFetching` (empty-only).
   * Do not pass true on cache-hit page flips.
   */
  isFetching?: boolean;
  /**
   * Pagination-bar busy. From `useServerListPage`, pass `isPaging`.
   * Falls back to `isFetching` when omitted.
   */
  isPaging?: boolean;
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
    isFetching: props.isPaging ?? props.isFetching,
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
    onRowPointerEnter,
    emptyState,
    filters,
    virtualized = false,
    toolbar,
    serverSort,
    selectable = false,
    stickyHeader = false,
    stickyFirstColumn = false,
    density,
    onDensityChange,
    enableColumnVisibility = false,
    tableId,
    bulkActions,
    isFetching: overlayFetching = false,
    isPaging,
  } = props;

  const pagination = resolvePagination(props);
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
    isFetching: paginationFetching = false,
    totalCount,
  } = pagination;

  const showPagination = items.length > 0 || canGoPrev || isLoading;
  // Overlay: only what the caller marked as table-fetch (empty loads).
  const showOverlay = overlayFetching && !isLoading;
  // Bar: prefer explicit isPaging, else pagination.isFetching from helpers.
  const barBusy =
    (isPaging ?? paginationFetching ?? overlayFetching) && !isLoading;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <DataTable
        data={items}
        columns={columns}
        filters={filters}
        displayMode="table"
        embedded
        virtualized={virtualized}
        disablePagination
        selectable={selectable}
        stickyHeader={stickyHeader}
        stickyFirstColumn={stickyFirstColumn}
        density={density}
        onDensityChange={onDensityChange}
        enableColumnVisibility={enableColumnVisibility}
        tableId={tableId}
        toolbar={toolbar}
        bulkActions={bulkActions}
        isLoading={isLoading}
        isFetching={showOverlay}
        error={error}
        onRowClick={onRowClick}
        onRowPointerEnter={onRowPointerEnter}
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
          isBusy={barBusy}
        />
      ) : null}
    </div>
  );
}
