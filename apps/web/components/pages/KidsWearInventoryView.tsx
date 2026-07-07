"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getItems, getItemsPage } from "@/lib/api/items";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";
import {
  filterByDateField,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import type { Item, StockStatus } from "@vonos/types";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

const COLLECTION_TABS = [
  { id: "all", label: "All Items" },
  { id: "summer", label: "Summer 2026" },
  { id: "spring", label: "Spring 2026" },
  { id: "low_stock", label: "Low Stock" },
];

const columns: ColumnConfig<Item>[] = [
  { key: "sku", header: "SKU", render: (r) => <span className="font-medium">{r.sku}</span> },
  { key: "name", header: "Item Name", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "category", header: "Category" },
  {
    key: "quantity",
    header: "Total QTY",
    sortValue: (r) => r.quantity,
    render: (r) => formatNumber(r.quantity),
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusPill status={r.status} vocabulary="stockStatus" />,
  },
  {
    key: "costPrice",
    header: "Unit Cost",
    sortValue: (r) => r.costPrice,
    render: (r) => formatCurrency(r.costPrice, r.currency),
  },
];

export function KidsWearInventoryView() {
  const { goToDetail } = useRecordNavigation("inventory");
  const tenantId = useTenantId();
  const [activeTab, setActiveTab] = useState("all");
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(() => {
    const next: { status?: StockStatus; category?: string; search?: string } = {};
    if (activeTab === "low_stock") next.status = "low_stock";
    if (categoryFilter) next.category = categoryFilter;
    if (statusFilter) next.status = statusFilter as StockStatus;
    if (search.trim()) next.search = search.trim();
    return next;
  }, [activeTab, categoryFilter, search, statusFilter]);

  const {
    items,
    hasMore,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext,
    goPrev,
    setPageSize,
    isLoading,
    error,
  } = useServerListPage({
    queryKey: ["items", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    fetchPage: (cursor, limit) => getItemsPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = useMemo(() => {
    let rows = filterByDateField(items, bounds, "createdAt");
    if (activeTab === "summer" || activeTab === "spring") {
      const tag = activeTab === "summer" ? "summer" : "spring";
      rows = rows.filter((item) =>
        (item.category ?? "").toLowerCase().includes(tag),
      );
    }
    return rows;
  }, [activeTab, bounds, items]);

  const categoryOptions = useMemo(
    () => uniqueFieldOptions(items, "category"),
    [items],
  );
  const statusOptions = useMemo(
    () => uniqueFieldOptions(items, "status"),
    [items],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-[var(--color-brand-primary)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-muted">
        <strong className="text-foreground">Variant matrix</strong> — Item detail includes size × color stock grid. Use collection filters below for seasonal grouping.
      </div>
      <ListPageShell
        tabs={COLLECTION_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search variants..."
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterDropdowns={[
          {
            id: "category",
            label: "Category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions,
          },
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: statusOptions,
          },
        ]}
      >
        <ServerPaginatedTable
          items={filtered}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          hasMore={hasMore}
          canGoPrev={canGoPrev}
          onNext={goNext}
          onPrev={goPrev}
          onPageSizeChange={setPageSize}
          isLoading={isLoading}
          error={error ? "Failed to load inventory" : null}
          onRowClick={(row) => goToDetail(row.id)}
        />
      </ListPageShell>
    </div>
  );
}
