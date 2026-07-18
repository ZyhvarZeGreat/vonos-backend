"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LedgerEntry, LedgerEntryType, LedgerListRow } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { DataTableSkeleton } from "@/components/organisms/skeletons";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import {
  getGroupLedgerEntriesPage,
  getLedgerEntriesPage,
  LEDGER_TABLE_PAGE_SIZE,
  type LedgerQueryFilters,
} from "@/lib/api/ledger";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useCursorPage } from "@/lib/hooks/useCursorPage";
import { ledgerListCursor } from "@/lib/utils/pagination";

export interface PaginatedLedgerTableProps<T extends { id: string }> {
  groupMode?: boolean;
  tenantId?: string;
  type?: LedgerEntryType;
  category?: string;
  from?: string;
  to?: string;
  search?: string;
  columns: ColumnConfig<T>[];
  onRowClick?: (row: T) => void;
  emptyState?: { message: string; ctaLabel?: string; onCta?: () => void };
  defaultPageSize?: number;
}

export function PaginatedLedgerTable<T extends LedgerEntry | LedgerListRow>({
  groupMode = false,
  tenantId,
  type,
  category,
  from,
  to,
  search,
  columns,
  onRowClick,
  emptyState,
  defaultPageSize = LEDGER_TABLE_PAGE_SIZE,
}: PaginatedLedgerTableProps<T>) {
  const debouncedSearch = useDebouncedValue(search?.trim() ?? "", 400);
  const { cursor, pageIndex, canGoPrev, goNext, goPrev, reset } = useCursorPage();
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filters = useMemo((): LedgerQueryFilters => {
    const next: LedgerQueryFilters = { limit: pageSize };
    if (type) next.type = type;
    if (category) next.category = category;
    if (from) next.from = from;
    if (to) next.to = to;
    if (search?.trim()) next.search = debouncedSearch;
    return next;
  }, [category, debouncedSearch, from, pageSize, search, to, type]);

  const filterKey = useMemo(
    () => JSON.stringify({ groupMode, tenantId, ...filters }),
    [filters, groupMode, tenantId],
  );

  useEffect(() => {
    reset();
  }, [filterKey, reset]);

  const pageQuery = useQuery({
    queryKey: [
      "ledgerTablePage",
      groupMode ? "group" : tenantId,
      filterKey,
      cursor,
    ],
    queryFn: async () => {
      if (groupMode) {
        return getGroupLedgerEntriesPage(filters, cursor, pageSize);
      }
      if (!tenantId) {
        return { items: [], hasMore: false, pageSize };
      }
      return getLedgerEntriesPage(tenantId, filters, cursor, pageSize);
    },
    enabled: groupMode || Boolean(tenantId),
    placeholderData: (prev) => prev,
  });

  const items = (pageQuery.data?.items ?? []) as T[];
  const hasMore = pageQuery.data?.hasMore ?? false;
  const isLoading = pageQuery.isLoading && items.length === 0;
  const isFetching = pageQuery.isFetching && !isLoading;

  const handleNext = () => {
    const last = items[items.length - 1];
    if (last && hasMore) goNext(ledgerListCursor(last));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    reset();
  };

  const columnHeaders = columns.map((column) => column.header);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
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
      <DataTable
        data={items}
        columns={columns}
        displayMode="table"
        embedded
        virtualized
        disablePagination
        isFetching={isFetching}
        error={pageQuery.error ? "Failed to load ledger entries" : null}
        onRowClick={onRowClick}
        emptyState={emptyState}
      />
      {items.length > 0 || canGoPrev ? (
        <CursorPaginationBar
          pageIndex={pageIndex}
          pageSize={pageSize}
          itemCount={items.length}
          hasMore={hasMore}
          canGoPrev={canGoPrev}
          onPrev={goPrev}
          onNext={handleNext}
          onPageSizeChange={handlePageSizeChange}
          isBusy={isFetching}
        />
      ) : null}
    </div>
  );
}
