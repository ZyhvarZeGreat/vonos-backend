"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { InlinePriceCell } from "@/components/molecules/InlinePriceCell";
import { ProductItemSearch } from "@/components/molecules/ProductItemSearch";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  isProductMetaSection,
  ProductMetaPanel,
  PRODUCT_SECTION_TABS,
  sectionFromParams,
  type ProductSectionId,
} from "@/components/organisms/ProductMetaPanel";
import { getItems } from "@/lib/api/items";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListExport } from "@/lib/hooks/useListExport";
import { formatNumber } from "@/lib/utils/formatCurrency";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import type { Item } from "@vonos/types";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useUiStore } from "@/stores/uiStore";

const STOCK_FILTER_TABS = [
  { id: "all", label: "All Items" },
  { id: "low_stock", label: "Low Stock" },
  { id: "out_of_stock", label: "Out of Stock" },
  { id: "recent", label: "Recently Added" },
];

export function WarehouseInventoryView() {
  const { goToDetail } = useRecordNavigation("inventory");
  const exportList = useListExport();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openAddProductModal = useUiStore((state) => state.openAddProductModal);
  const section = sectionFromParams(searchParams.get("section"));
  const [stockFilter, setStockFilter] = useState("all");
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const tenantId = useTenantId();

  const setSection = useCallback(
    (next: ProductSectionId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "products") params.delete("section");
      else params.set("section", next);
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  const itemsQuery = useQuery({
    queryKey: ["items", tenantId],
    queryFn: () => getItems(tenantId!),
    enabled: Boolean(tenantId) && section === "products",
  });

  const items = itemsQuery.data ?? [];

  const filtered = useMemo(() => {
    let rows = filterByDateField(items, bounds, "createdAt");
    if (stockFilter === "low_stock") {
      rows = rows.filter((item) => item.status === "low_stock");
    } else if (stockFilter === "out_of_stock") {
      rows = rows.filter((item) => item.status === "out_of_stock");
    } else if (stockFilter === "recent") {
      rows = [...rows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    if (categoryFilter) rows = rows.filter((item) => item.category === categoryFilter);
    if (statusFilter) rows = rows.filter((item) => item.status === statusFilter);
    return filterBySearch(rows, search, ["name", "sku", "category"]);
  }, [bounds, categoryFilter, items, search, statusFilter, stockFilter]);

  const categoryOptions = useMemo(
    () => uniqueFieldOptions(items, "category"),
    [items],
  );
  const statusOptions = useMemo(
    () => uniqueFieldOptions(items, "status"),
    [items],
  );

  const columns: ColumnConfig<Item>[] = useMemo(
    () => [
      {
        key: "sku",
        header: "ID SKU",
        render: (row) => <span className="font-medium text-foreground">{row.sku}</span>,
      },
      {
        key: "name",
        header: "Item Name",
        render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
      },
      { key: "category", header: "Category" },
      {
        key: "quantity",
        header: "QTY",
        sortValue: (row) => row.quantity,
        render: (row) => formatNumber(row.quantity),
      },
      {
        key: "reorderPoint",
        header: "Reorder PT",
        sortValue: (row) => row.reorderPoint ?? 0,
        render: (row) => formatNumber(row.reorderPoint ?? 0),
      },
      {
        key: "binLocation",
        header: "Location",
        render: (row) => <span className="font-medium">{row.binLocation}</span>,
      },
      {
        key: "costPrice",
        header: "Unit price",
        sortValue: (row) => row.costPrice,
        render: (row) => <InlinePriceCell item={row} label="Unit price" />,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusPill status={row.status} vocabulary="stockStatus" />,
      },
      {
        key: "actions",
        header: "Actions",
        sortable: false,
        render: () => (
          <div className="text-right">
            <button type="button" className="text-muted hover:text-foreground" aria-label="Row actions">
              <MoreHorizontal className="inline h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <ListPageShell
        tabs={PRODUCT_SECTION_TABS}
        activeTab={section}
        onTabChange={(tabId) => setSection(tabId as ProductSectionId)}
        searchPlaceholder={section === "products" ? "Filter visible rows" : "Search"}
        searchValue={search}
        onSearchChange={setSearch}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange={section === "products"}
        filterDropdowns={
          section === "products"
            ? [
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
              ]
            : []
        }
        onExport={
          section === "products"
            ? () =>
                exportList(
                  "inventory",
                  [
                    { key: "sku", header: "SKU" },
                    { key: "name", header: "Name" },
                    { key: "category", header: "Category" },
                    { key: "quantity", header: "Qty" },
                    { key: "status", header: "Status" },
                  ],
                  filtered.map((row) => ({
                    sku: row.sku,
                    name: row.name,
                    category: row.category ?? "",
                    quantity: row.quantity,
                    status: row.status,
                  })),
                  "Export Inventory",
                )
            : undefined
        }
      >
        {section === "products" ? (
          <div className="space-y-3 p-4 pt-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <ProductItemSearch
                  tenantId={tenantId}
                  onSelect={(item) => goToDetail(item.id)}
                  placeholder="Search database by name or SKU"
                />
              </div>
              <Button size="sm" onClick={() => openAddProductModal("item")}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add product
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto border-b border-[var(--color-border-subtle)] pb-2">
              {STOCK_FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStockFilter(tab.id)}
                  className={
                    stockFilter === tab.id
                      ? "rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
                      : "rounded-full px-3 py-1 text-xs text-muted hover:bg-[var(--color-surface-muted)]"
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <DataTable
              embedded
              data={filtered}
              columns={columns}
              displayMode="table"
              onRowClick={(row) => goToDetail(row.id)}
              isLoading={itemsQuery.isLoading}
              error={itemsQuery.error ? "Failed to load inventory" : null}
            />
          </div>
        ) : isProductMetaSection(section) ? (
          <div className="p-4 pt-0">
            <ProductMetaPanel kind={section} />
          </div>
        ) : null}
      </ListPageShell>
    </div>
  );
}
