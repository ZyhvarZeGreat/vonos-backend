"use client";

import type { LedgerEntry, LedgerEntryType, LedgerListRow } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import {
  getGroupLedgerEntriesPage,
  getLedgerEntriesPage,
  LEDGER_TABLE_PAGE_SIZE,
  type LedgerQueryFilters,
} from "@/lib/api/ledger";
import {
  hq6ListPaginationProps,
  useServerListPage,
} from "@/lib/hooks/useServerListPage";
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
  const page = useServerListPage<T>({
    queryKey: ["ledgerTablePage", groupMode ? "group" : tenantId ?? "none"],
    enabled: groupMode || Boolean(tenantId),
    defaultPageSize,
    filters: {
      type: type ?? null,
      category: category ?? null,
      from: from ?? null,
      to: to ?? null,
    },
    search: search ?? "",
    searchMode: "hybrid",
    prefetchPagesAhead: 5,
    deferSummary: false,
    fetchPage: async (cursor, limit, _sort, opts) => {
      const filters: LedgerQueryFilters = {
        limit,
        search: opts?.search,
      };
      if (type) filters.type = type;
      if (category) filters.category = category;
      if (from) filters.from = from;
      if (to) filters.to = to;
      if (groupMode) {
        const result = await getGroupLedgerEntriesPage(filters, cursor, limit);
        return result as { items: T[]; hasMore: boolean; pageSize: number };
      }
      if (!tenantId) {
        return { items: [], hasMore: false, pageSize: limit };
      }
      const result = await getLedgerEntriesPage(tenantId, filters, cursor, limit);
      return result as { items: T[]; hasMore: boolean; pageSize: number };
    },
    getCursor: (row) => ledgerListCursor(row),
  });

  const pagination = hq6ListPaginationProps(page);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <DataTable
        data={page.items}
        columns={columns}
        displayMode="table"
        embedded
        virtualized
        disablePagination
        isLoading={page.isLoading}
        isFetching={page.isFetching}
        error={page.error ? "Failed to load ledger entries" : null}
        onRowClick={onRowClick}
        emptyState={emptyState}
      />
      {!page.isLoading && (page.items.length > 0 || page.canGoPrev) ? (
        <CursorPaginationBar
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          itemCount={pagination.itemCount}
          hasMore={pagination.hasMore}
          canGoPrev={pagination.canGoPrev}
          onPrev={pagination.onPrev}
          onNext={pagination.onNext}
          onPageSizeChange={pagination.onPageSizeChange}
          onPageSelect={pagination.onPageSelect}
          canSelectPage={pagination.canSelectPage}
          totalItems={pagination.totalItems}
          isBusy={pagination.isBusy}
        />
      ) : null}
    </div>
  );
}
