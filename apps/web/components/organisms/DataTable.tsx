"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { DataTableSkeleton, KanbanSkeleton, CalendarGridSkeleton } from "@/components/organisms/skeletons";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { PaginationBar } from "@/components/molecules/PaginationBar";
import { TableFetchingOverlay } from "@/components/molecules/TableFetchingOverlay";
import { TableRow } from "@/components/molecules/TableRow";
import { assertDisplayModeImplemented } from "@/lib/registries/displayModes";
import { formatTableCellValue } from "@/lib/utils/formatDisplay";
import { cn } from "@/lib/utils/cn";

export interface ColumnConfig<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /** When false, header is not clickable. Default true except for `actions`. */
  sortable?: boolean;
  /** Custom value for sorting when cell is rendered. */
  sortValue?: (row: T) => string | number | null;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: "text" | "select";
  options?: { label: string; value: string }[];
}

export interface OffsetPaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export type SortDirection = "asc" | "desc";

export interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: ColumnConfig<T>[];
  filters?: FilterConfig[];
  displayMode: "table" | "kanban" | "calendar";
  groupByField?: keyof T;
  selectable?: boolean;
  pagination?: { cursor: string | null; pageSize: number };
  offsetPagination?: OffsetPaginationConfig;
  /** Built-in pagination when offsetPagination is omitted. Default 25. */
  defaultPageSize?: number;
  /** Disable built-in pagination (show all rows after sort/filter). */
  disablePagination?: boolean;
  /** Virtualize tbody rows inside a scroll container (for large single-page lists). */
  virtualized?: boolean;
  virtualRowHeight?: number;
  maxBodyHeight?: number;
  embedded?: boolean;
  onRowClick?: (row: T) => void;
  emptyState?: { message: string; ctaLabel?: string; onCta?: () => void };
  isLoading?: boolean;
  /** Refetch/pagination — keeps visible rows and shows a light overlay. */
  isFetching?: boolean;
  error?: string | null;
  className?: string;
}

function isColumnSortable<T>(column: ColumnConfig<T>): boolean {
  if (column.sortable === false) return false;
  if (String(column.key) === "actions") return false;
  return true;
}

function compareValues(
  a: unknown,
  b: unknown,
  direction: SortDirection,
): number {
  const mult = direction === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * mult;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true }) * mult;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  filters = [],
  displayMode,
  groupByField,
  selectable = false,
  pagination,
  offsetPagination,
  defaultPageSize = 25,
  disablePagination = false,
  virtualized = false,
  virtualRowHeight = 48,
  maxBodyHeight = 480,
  embedded = false,
  onRowClick,
  emptyState,
  isLoading = false,
  isFetching = false,
  error = null,
  className,
}: DataTableProps<T>) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);

  assertDisplayModeImplemented(displayMode);

  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    return data.filter((row) =>
      filters.every((filter) => {
        const value = filterValues[filter.key];
        if (!value) return true;
        const rowValue = String((row as Record<string, unknown>)[filter.key] ?? "");
        return rowValue.toLowerCase().includes(value.toLowerCase());
      }),
    );
  }, [data, filterValues, filters]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const column = columns.find((c) => String(c.key) === sortKey);
    return [...filteredData].sort((a, b) => {
      const av = column?.sortValue
        ? column.sortValue(a)
        : (a as Record<string, unknown>)[sortKey];
      const bv = column?.sortValue
        ? column.sortValue(b)
        : (b as Record<string, unknown>)[sortKey];
      return compareValues(av, bv, sortDirection);
    });
  }, [columns, filteredData, sortDirection, sortKey]);

  const useInternalPagination =
    !offsetPagination && !pagination && !disablePagination;

  const activePage = offsetPagination?.page ?? internalPage;
  const activePageSize = offsetPagination?.pageSize ?? internalPageSize;
  const totalRows = offsetPagination?.total ?? sortedData.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / activePageSize));
  const safePage = Math.min(activePage, pageCount);

  const visibleData = useMemo(() => {
    if (offsetPagination) {
      return sortedData.slice(
        (offsetPagination.page - 1) * offsetPagination.pageSize,
        offsetPagination.page * offsetPagination.pageSize,
      );
    }
    if (pagination) {
      return sortedData.slice(0, pagination.pageSize);
    }
    if (useInternalPagination) {
      return sortedData.slice(
        (safePage - 1) * activePageSize,
        safePage * activePageSize,
      );
    }
    return sortedData;
  }, [
    activePageSize,
    offsetPagination,
    pagination,
    safePage,
    sortedData,
    useInternalPagination,
  ]);

  const rowVirtualizer = useVirtualizer({
    count: visibleData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => virtualRowHeight,
    overscan: 8,
    enabled: virtualized && visibleData.length > 0,
  });

  const virtualRows = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  function renderRow(row: T) {
    return (
      <TableRow
        key={row.id}
        selected={selectedIds.has(row.id)}
        onClick={
          onRowClick
            ? () => onRowClick(row)
            : selectable
              ? () => {
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    if (next.has(row.id)) next.delete(row.id);
                    else next.add(row.id);
                    return next;
                  });
                }
              : undefined
        }
        cells={[
          ...(selectable
            ? [
                <input
                  key="select"
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  readOnly
                />,
              ]
            : []),
          ...columns.map((column) =>
            column.render
              ? column.render(row)
              : formatTableCellValue(
                  String(column.key),
                  row as Record<string, unknown>,
                ),
          ),
        ]}
      />
    );
  }

  function handleSort(column: ColumnConfig<T>) {
    if (!isColumnSortable(column)) return;
    const key = String(column.key);
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortKey(null);
      setSortDirection("asc");
    }
    setInternalPage(1);
    offsetPagination?.onPageChange(1);
  }

  if (isLoading || (isFetching && data.length === 0)) {
    const shellClass = cn(
      embedded ? "overflow-hidden" : "overflow-hidden rounded-xl border border-border bg-card shadow-card",
      className,
    );
    if (displayMode === "kanban") {
      return (
        <section className={shellClass}>
          <KanbanSkeleton />
        </section>
      );
    }
    if (displayMode === "calendar") {
      return (
        <section className={shellClass}>
          <CalendarGridSkeleton />
        </section>
      );
    }
    return (
      <section className={shellClass}>
        <DataTableSkeleton
          rows={8}
          columnHeaders={columns.map((column) => column.header)}
          selectable={selectable}
          withFilters={filters.length > 0}
          embedded
        />
      </section>
    );
  }

  if (displayMode !== "table") {
    return (
      <EmptyState
        title={`${displayMode} mode not implemented`}
        message="This display mode will be added in a later phase."
      />
    );
  }

  const showPaginationBar =
    offsetPagination ||
    (useInternalPagination && sortedData.length > 0);

  return (
    <section
      className={cn(
        embedded ? "overflow-hidden" : "overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      {filters.length > 0 ? (
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-3">
          {filters.map((filter) =>
            filter.type === "select" ? (
              <Select
                key={filter.key}
                label={filter.label}
                options={[
                  { label: "All", value: "" },
                  ...(filter.options ?? []),
                ]}
                value={filterValues[filter.key] ?? ""}
                onChange={(event) => {
                  setFilterValues((current) => ({
                    ...current,
                    [filter.key]: event.target.value,
                  }));
                  setInternalPage(1);
                }}
              />
            ) : (
              <Input
                key={filter.key}
                label={filter.label}
                value={filterValues[filter.key] ?? ""}
                onChange={(event) => {
                  setFilterValues((current) => ({
                    ...current,
                    [filter.key]: event.target.value,
                  }));
                  setInternalPage(1);
                }}
              />
            ),
          )}
        </div>
      ) : null}

      {error ? (
        <div className="p-4">
          <EmptyState title="Something went wrong" message={error} />
        </div>
      ) : visibleData.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No records found"
            message={emptyState?.message ?? "Try adjusting your filters."}
            ctaLabel={emptyState?.ctaLabel}
            onCta={emptyState?.onCta}
          />
        </div>
      ) : (
        <div
          ref={virtualized ? scrollRef : undefined}
          className="relative overflow-x-auto"
          style={virtualized ? { maxHeight: maxBodyHeight, overflow: "auto" } : undefined}
        >
          {isFetching ? <TableFetchingOverlay /> : null}
          <table className="min-w-full">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                {selectable ? (
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Select
                  </th>
                ) : null}
                {columns.map((column) => {
                  const key = String(column.key);
                  const sortable = isColumnSortable(column);
                  const isActive = sortKey === key;
                  return (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          {column.header}
                          {isActive ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {virtualized ? (
                <>
                  {paddingTop > 0 ? (
                    <tr>
                      <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ height: paddingTop }} />
                    </tr>
                  ) : null}
                  {virtualRows.map((virtualRow) => {
                    const row = visibleData[virtualRow.index];
                    if (!row) return null;
                    return renderRow(row);
                  })}
                  {paddingBottom > 0 ? (
                    <tr>
                      <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ height: paddingBottom }} />
                    </tr>
                  ) : null}
                </>
              ) : (
                visibleData.map((row) => renderRow(row))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showPaginationBar ? (
        <PaginationBar
          page={offsetPagination?.page ?? safePage}
          pageSize={activePageSize}
          total={totalRows}
          onPageChange={(page) => {
            if (offsetPagination) {
              offsetPagination.onPageChange(page);
            } else {
              setInternalPage(page);
            }
          }}
          onPageSizeChange={(size) => {
            if (offsetPagination) {
              offsetPagination.onPageSizeChange(size);
            } else {
              setInternalPageSize(size);
              setInternalPage(1);
            }
          }}
        />
      ) : null}

      {groupByField ? (
        <p className="border-t border-border px-4 py-2 text-xs text-muted">
          Grouped by {String(groupByField)} (kanban/calendar modes pending)
        </p>
      ) : null}
    </section>
  );
}
