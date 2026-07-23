"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Rows2,
  Rows3,
  Rows4,
} from "lucide-react";
import { EmptyState } from "@/components/atoms/EmptyState";
import { KanbanSkeleton, CalendarGridSkeleton } from "@/components/organisms/skeletons";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { PaginationBar } from "@/components/molecules/PaginationBar";
import { TableFetchingOverlay } from "@/components/molecules/TableFetchingOverlay";
import { TableRow } from "@/components/molecules/TableRow";
import { assertDisplayModeImplemented } from "@/lib/registries/displayModes";
import { formatTableCellValue } from "@/lib/utils/formatDisplay";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/atoms/Skeleton";
import {
  columnCellClassName,
  resolveColumnAlign,
  TABLE_DENSITY_PX,
  type ColumnAlign,
  type TableDensity,
} from "@/lib/utils/tableColumnAlign";
import { useTableViewPrefs } from "@/lib/hooks/useTableViewPrefs";

export interface ColumnConfig<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /** When false, header is not clickable. Default true except for `actions`. */
  sortable?: boolean;
  /** Custom value for sorting when cell is rendered. */
  sortValue?: (row: T) => string | number | null;
  /** Horizontal alignment. Defaults to left; numeric columns default to right. */
  align?: ColumnAlign;
  /** Right-align + tabular figures (money, qty, measures). */
  numeric?: boolean;
  /** When false, column cannot be hidden via column visibility. Default true except actions. */
  hideable?: boolean;
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

export interface ServerSortConfig {
  sortBy: string | null;
  sortDir: SortDirection;
  onSortChange: (sortBy: string, sortDir: SortDirection) => void;
}

export interface DataTableBulkAction {
  id: string;
  label: string;
  onClick: (selectedIds: string[]) => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: ColumnConfig<T>[];
  filters?: FilterConfig[];
  displayMode: "table" | "kanban" | "calendar";
  groupByField?: keyof T;
  selectable?: boolean;
  pagination?: { cursor: string | null; pageSize: number };
  offsetPagination?: OffsetPaginationConfig;
  /** Built-in pagination when offsetPagination is omitted. Default 10. */
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
  /**
   * When set, column header clicks request a server sort instead of
   * reordering only the current page of rows.
   */
  serverSort?: ServerSortConfig;
  /** Sticky table header while scrolling the body. Default true. */
  stickyHeader?: boolean;
  /** Freeze the first data column (after checkbox) on horizontal scroll. */
  stickyFirstColumn?: boolean;
  /** Row density. When `tableId` is set, persists to localStorage. */
  density?: TableDensity;
  onDensityChange?: (density: TableDensity) => void;
  /** Show density switcher in the table chrome. Default true when tableId set. */
  showDensityControl?: boolean;
  /** Enable built-in column visibility menu (+ persist when tableId set). */
  enableColumnVisibility?: boolean;
  /** Persistence key for density / column prefs (e.g. tenant.page). */
  tableId?: string;
  /** Extra toolbar node (left of density/columns controls). */
  toolbar?: ReactNode;
  /** Bulk actions shown when selectable and one+ rows selected. */
  bulkActions?: DataTableBulkAction[];
}

function isColumnSortable<T>(column: ColumnConfig<T>): boolean {
  if (column.sortable === false) return false;
  if (String(column.key) === "actions") return false;
  return true;
}

function isColumnHideable<T>(column: ColumnConfig<T>): boolean {
  if (column.hideable === false) return false;
  const key = String(column.key);
  if (key === "actions") return false;
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

function headerPad(density: TableDensity): string {
  if (density === "condensed") return "px-4 py-1.5";
  if (density === "relaxed") return "px-4 py-3.5";
  return "px-4 py-2.5";
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
  defaultPageSize = 10,
  disablePagination = false,
  virtualized = false,
  virtualRowHeight,
  maxBodyHeight = 720,
  embedded = false,
  onRowClick,
  emptyState,
  isLoading = false,
  isFetching = false,
  error = null,
  className,
  serverSort,
  stickyHeader = true,
  stickyFirstColumn = false,
  density: densityProp,
  onDensityChange,
  showDensityControl,
  enableColumnVisibility = false,
  tableId,
  toolbar,
  bulkActions,
}: DataTableProps<T>) {
  const prefs = useTableViewPrefs(tableId);
  const density = densityProp ?? prefs.density;
  const setDensity = onDensityChange ?? prefs.setDensity;
  const showDensity = showDensityControl ?? Boolean(tableId || onDensityChange);
  const rowHeight = virtualRowHeight ?? TABLE_DENSITY_PX[density];

  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const columnsMenuId = useId();
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    if (!enableColumnVisibility || !prefs.visibleColumnKeys) return new Set();
    const allowed = new Set(prefs.visibleColumnKeys);
    return new Set(
      columns
        .filter((c) => isColumnHideable(c) && !allowed.has(String(c.key)))
        .map((c) => String(c.key)),
    );
  });

  useEffect(() => {
    if (!enableColumnVisibility || !prefs.visibleColumnKeys) return;
    const allowed = new Set(prefs.visibleColumnKeys);
    setHiddenKeys(
      new Set(
        columns
          .filter((c) => isColumnHideable(c) && !allowed.has(String(c.key)))
          .map((c) => String(c.key)),
      ),
    );
  }, [columns, enableColumnVisibility, prefs.visibleColumnKeys]);

  useEffect(() => {
    if (!columnsMenuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!columnsMenuRef.current?.contains(event.target as Node)) {
        setColumnsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [columnsMenuOpen]);

  assertDisplayModeImplemented(displayMode);

  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSortKey = serverSort ? serverSort.sortBy : sortKey;
  const activeSortDirection = serverSort ? serverSort.sortDir : sortDirection;

  const visibleColumns = useMemo(() => {
    if (!enableColumnVisibility) return columns;
    return columns.filter((c) => !hiddenKeys.has(String(c.key)));
  }, [columns, enableColumnVisibility, hiddenKeys]);

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
    if (serverSort || !sortKey) return filteredData;
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
  }, [columns, filteredData, serverSort, sortDirection, sortKey]);

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
    estimateSize: () => rowHeight,
    overscan: 8,
    enabled: virtualized && visibleData.length > 0,
  });

  const virtualRows = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;

  function freezeDataColClass(isHeader: boolean): string {
    if (!stickyFirstColumn) return "";
    // First non-checkbox column: offset past checkbox when selectable.
    const left = selectable ? "left-10" : "left-0";
    return cn(
      "sticky z-[1]",
      left,
      isHeader
        ? "bg-[var(--color-surface-muted)] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]"
        : "bg-card shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
    );
  }

  function renderRow(row: T) {
    const cells: ReactNode[] = [];
    const cellClassNames: string[] = [];

    if (selectable) {
      cells.push(
        <input
          key="select"
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => {
            setSelectedIds((current) => {
              const next = new Set(current);
              if (next.has(row.id)) next.delete(row.id);
              else next.add(row.id);
              return next;
            });
          }}
        />,
      );
      cellClassNames.push(
        cn(
          "text-left",
          stickyFirstColumn &&
            "sticky left-0 z-[2] bg-card shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
        ),
      );
    }

    visibleColumns.forEach((column, colIndex) => {
      cells.push(
        column.render
          ? column.render(row)
          : formatTableCellValue(
              String(column.key),
              row as Record<string, unknown>,
            ),
      );
      cellClassNames.push(
        cn(
          columnCellClassName(column),
          colIndex === 0 ? freezeDataColClass(false) : null,
        ),
      );
    });

    return (
      <TableRow
        key={row.id}
        density={density}
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
        cells={cells}
        cellClassNames={cellClassNames}
      />
    );
  }

  function handleSort(column: ColumnConfig<T>) {
    if (!isColumnSortable(column)) return;
    const key = String(column.key);
    if (serverSort) {
      if (serverSort.sortBy !== key) {
        serverSort.onSortChange(key, "asc");
      } else if (serverSort.sortDir === "asc") {
        serverSort.onSortChange(key, "desc");
      } else {
        serverSort.onSortChange(key, "asc");
      }
      return;
    }
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

  function persistVisibleKeys(nextHidden: Set<string>) {
    if (!enableColumnVisibility) return;
    const visible = columns
      .filter((c) => !nextHidden.has(String(c.key)))
      .map((c) => String(c.key));
    prefs.setVisibleColumnKeys(visible);
  }

  function toggleColumnKey(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        const remaining = columns.filter(
          (c) => isColumnHideable(c) && !next.has(String(c.key)) && String(c.key) !== key,
        );
        if (remaining.length === 0) return prev;
        next.add(key);
      }
      persistVisibleKeys(next);
      return next;
    });
  }

  function resetColumns() {
    setHiddenKeys(new Set());
    prefs.resetColumnVisibility();
  }

  if (
    (isLoading || (isFetching && data.length === 0)) &&
    displayMode !== "table"
  ) {
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
    return (
      <section className={shellClass}>
        <CalendarGridSkeleton />
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

  const showBodyLoading = isLoading || (isFetching && data.length === 0);
  const showPaginationBar =
    offsetPagination ||
    (useInternalPagination && sortedData.length > 0);

  const thBase = cn(
    headerPad(density),
    "text-xs font-semibold uppercase tracking-wide text-muted",
    stickyHeader &&
      "sticky top-0 z-[2] bg-[var(--color-surface-muted)] shadow-[0_1px_0_0_var(--color-border)]",
  );

  const selectedList = Array.from(selectedIds);
  const showBulkBar = selectable && selectedList.length > 0 && (bulkActions?.length ?? 0) > 0;
  const showChrome = Boolean(toolbar) || showDensity || enableColumnVisibility;

  // Sticky needs a real scrollport. When embedded (HQ6 wrap), the parent scrolls —
  // keep this layer overflow-visible so position:sticky isn't clipped. Otherwise
  // give the body its own max-height scroll container.
  const ownScrollport = virtualized || (stickyHeader && !embedded);
  const scrollMaxHeight = ownScrollport ? maxBodyHeight : undefined;

  return (
    <section
      className={cn(
        embedded
          ? "overflow-visible"
          : "overflow-hidden rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      {showChrome ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          {toolbar}
          <div className="ml-auto flex items-center gap-1.5">
            {showDensity ? (
              <div className="inline-flex items-center rounded-md border border-border p-0.5" role="group" aria-label="Row density">
                {(
                  [
                    ["condensed", Rows4, "Condensed"],
                    ["regular", Rows3, "Regular"],
                    ["relaxed", Rows2, "Relaxed"],
                  ] as const
                ).map(([value, Icon, label]) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    aria-label={label}
                    aria-pressed={density === value}
                    className={cn(
                      "rounded px-1.5 py-1 text-muted hover:bg-[var(--color-surface-muted)] hover:text-foreground",
                      density === value && "bg-[var(--color-surface-muted)] text-foreground",
                    )}
                    onClick={() => setDensity(value)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            ) : null}
            {enableColumnVisibility ? (
              <div className="relative" ref={columnsMenuRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted hover:bg-[var(--color-surface-muted)] hover:text-foreground"
                  aria-haspopup="menu"
                  aria-expanded={columnsMenuOpen}
                  aria-controls={columnsMenuId}
                  onClick={() => setColumnsMenuOpen((v) => !v)}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Columns
                </button>
                {columnsMenuOpen ? (
                  <div
                    id={columnsMenuId}
                    role="menu"
                    className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-md border border-border bg-card py-1 shadow-lg"
                  >
                    {columns.filter(isColumnHideable).map((column) => {
                      const key = String(column.key);
                      const checked = !hiddenKeys.has(key);
                      return (
                        <label
                          key={key}
                          role="menuitemcheckbox"
                          aria-checked={checked}
                          className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-[var(--color-surface-muted)]"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={checked}
                            onChange={() => toggleColumnKey(key)}
                          />
                          {column.header || key}
                        </label>
                      );
                    })}
                    <button
                      type="button"
                      className="mt-1 w-full border-t border-border px-3 py-1.5 text-left text-xs font-medium text-muted hover:bg-[var(--color-surface-muted)] hover:text-foreground"
                      onClick={() => {
                        resetColumns();
                        setColumnsMenuOpen(false);
                      }}
                    >
                      Reset to default
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

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

      {error && !showBodyLoading ? (
        <div className="p-4">
          <EmptyState title="Something went wrong" message={error} />
        </div>
      ) : showBodyLoading ? (
        <div
          className={cn(
            "relative",
            ownScrollport ? "overflow-auto" : "overflow-visible",
          )}
          aria-busy
          aria-label="Loading table"
        >
          <table className="min-w-full">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                {selectable ? (
                  <th className={cn(thBase, "text-left")}>Select</th>
                ) : null}
                {visibleColumns.map((column, colIndex) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      thBase,
                      columnCellClassName(column),
                      colIndex === 0 ? freezeDataColClass(true) : null,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-0">
                  {selectable ? (
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-4 rounded" />
                    </td>
                  ) : null}
                  {visibleColumns.map((column, colIndex) => (
                    <td key={String(column.key)} className="px-4 py-3">
                      <Skeleton
                        className={cn("h-4", colIndex === 0 ? "w-32" : "w-20")}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
          ref={scrollRef}
          className={cn(
            "relative",
            ownScrollport ? "overflow-auto" : "overflow-visible",
          )}
          style={
            scrollMaxHeight
              ? { maxHeight: scrollMaxHeight }
              : undefined
          }
        >
          {isFetching ? <TableFetchingOverlay /> : null}
          <table className="min-w-full">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                {selectable ? (
                  <th
                    className={cn(
                      thBase,
                      "text-left",
                      stickyFirstColumn &&
                        "sticky left-0 z-[3] bg-[var(--color-surface-muted)]",
                    )}
                  >
                    <span className="sr-only">Select</span>
                  </th>
                ) : null}
                {visibleColumns.map((column, colIndex) => {
                  const key = String(column.key);
                  const sortable = isColumnSortable(column);
                  const isActive = activeSortKey === key;
                  const align = resolveColumnAlign(column);
                  return (
                    <th
                      key={key}
                      className={cn(
                        thBase,
                        columnCellClassName(column),
                        colIndex === 0 ? freezeDataColClass(true) : null,
                        stickyFirstColumn && colIndex === 0 && "z-[3]",
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(column)}
                          className={cn(
                            "inline-flex items-center gap-1 hover:text-foreground",
                            align === "right" && "w-full justify-end",
                          )}
                        >
                          {column.header}
                          {isActive ? (
                            activeSortDirection === "asc" ? (
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
                      <td
                        colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                        style={{ height: paddingTop }}
                      />
                    </tr>
                  ) : null}
                  {virtualRows.map((virtualRow) => {
                    const row = visibleData[virtualRow.index];
                    if (!row) return null;
                    return renderRow(row);
                  })}
                  {paddingBottom > 0 ? (
                    <tr>
                      <td
                        colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                        style={{ height: paddingBottom }}
                      />
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

      {showBulkBar ? (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border bg-card px-3 py-2 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.15)]">
          <span className="text-sm font-medium text-foreground">
            {selectedList.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {bulkActions!.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                className={cn(
                  "rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-[var(--color-surface-muted)] disabled:opacity-50",
                  action.danger && "border-red-200 text-red-600 hover:bg-red-50",
                )}
                onClick={() => action.onClick(selectedList)}
              >
                {action.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ml-auto text-xs text-muted hover:text-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </button>
        </div>
      ) : null}

      {showPaginationBar && !showBodyLoading ? (
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
