"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatusPill } from "@/components/atoms/StatusPill";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getItems } from "@/lib/api/items";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import type { Item } from "@vonos/types";
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

  const itemsQuery = useQuery({
    queryKey: ["items", tenantId],
    queryFn: () => getItems(tenantId!),
    enabled: Boolean(tenantId),
  });

  const items = itemsQuery.data ?? [];

  const filtered = useMemo(() => {
    let rows = filterByDateField(items, bounds, "createdAt");
    if (activeTab === "low_stock") {
      rows = rows.filter((item) => item.status === "low_stock");
    } else if (activeTab === "summer" || activeTab === "spring") {
      const tag = activeTab === "summer" ? "summer" : "spring";
      rows = rows.filter((item) =>
        (item.category ?? "").toLowerCase().includes(tag),
      );
    }
    if (categoryFilter) rows = rows.filter((item) => item.category === categoryFilter);
    if (statusFilter) rows = rows.filter((item) => item.status === statusFilter);
    return filterBySearch(rows, search, ["name", "sku", "category"]);
  }, [activeTab, bounds, categoryFilter, items, search, statusFilter]);

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
        <DataTable
          data={filtered}
          columns={columns}
          displayMode="table"
          embedded
          isLoading={itemsQuery.isLoading}
          error={itemsQuery.error ? "Failed to load inventory" : null}
          onRowClick={(row) => goToDetail(row.id)}
        />
      </ListPageShell>
    </div>
  );
}
