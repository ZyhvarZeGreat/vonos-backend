"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { InlinePriceCell } from "@/components/molecules/InlinePriceCell";
import { ProductItemSearch } from "@/components/molecules/ProductItemSearch";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  isProductMetaSection,
  ProductMetaPanel,
  PRODUCT_SECTION_TABS,
  sectionFromParams,
  type ProductSectionId,
} from "@/components/organisms/ProductMetaPanel";
import { getItems, getItemsPage, getAllItems } from "@/lib/api/items";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListExport } from "@/lib/hooks/useListExport";
import { formatNumber } from "@/lib/utils/formatCurrency";
import type { Item, StockStatus } from "@vonos/types";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useUiStore } from "@/stores/uiStore";
import { ItemLocationCell } from "@/components/molecules/ItemLocationCell";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { itemMatchesLocationFilter, locationFilterOptions } from "@/lib/utils/locationLabels";

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
  const { dateRange, setDateRange, search, setSearch } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const tenantId = useTenantId();
  const { config } = useRouteTenant();

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

  const apiFilters = useMemo(() => {
    const next: {
      status?: StockStatus;
      category?: string;
      locationCode?: string;
      search?: string;
    } = {};
    if (stockFilter === "low_stock") next.status = "low_stock";
    else if (stockFilter === "out_of_stock") next.status = "out_of_stock";
    if (categoryFilter) next.category = categoryFilter;
    if (statusFilter) next.status = statusFilter as StockStatus;
    if (locationFilter) next.locationCode = locationFilter;
    if (search.trim()) next.search = search.trim();
    return next;
  }, [categoryFilter, locationFilter, search, statusFilter, stockFilter]);

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

    isFetching,
    error,
  } = useServerListPage({
    queryKey: ["items", tenantId],
    enabled: Boolean(tenantId) && section === "products",
    filters: apiFilters,
    fetchPage: (cursor, limit) => getItemsPage(tenantId!, apiFilters, cursor, limit),
  });

  const filtered = useMemo(() => {
    if (stockFilter !== "recent") return items;
    return [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [items, stockFilter]);

  const categoryOptions = useMemo(() => {
    const fromConfig = config?.itemCategories ?? [];
    return fromConfig.map((c) => ({ value: c, label: c }));
  }, [config?.itemCategories]);
  const statusOptions = useMemo(
    () => [
      { value: "in_stock", label: "In Stock" },
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
    [],
  );
  const locationOptions = useMemo(
    () => locationFilterOptions(config),
    [config],
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
        render: (row) => (
          <ItemLocationCell item={row} locations={config?.businessLocations} />
        ),
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
    [config?.businessLocations],
  );

  return (
    <div className="space-y-4">
      <ListPageShell
        tabs={PRODUCT_SECTION_TABS}
        activeTab={section}
        onTabChange={(tabId) => setSection(tabId as ProductSectionId)}
        searchPlaceholder={section === "products" ? "Search inventory…" : "Search"}
        searchValue={search}
        onSearchChange={setSearch}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange={false}
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
                {
                  id: "location",
                  label: "Location",
                  value: locationFilter,
                  onChange: setLocationFilter,
                  options: locationOptions,
                },
              ]
            : []
        }
        onExport={
          section === "products" && tenantId
            ? () => {
                void (async () => {
                  const rows = await getAllItems(tenantId, apiFilters);
                  exportList(
                    "inventory",
                    [
                      { key: "sku", header: "SKU" },
                      { key: "name", header: "Name" },
                      { key: "category", header: "Category" },
                      { key: "quantity", header: "Qty" },
                      { key: "status", header: "Status" },
                    ],
                    rows.map((row) => ({
                      sku: row.sku,
                      name: row.name,
                      category: row.category ?? "",
                      quantity: row.quantity,
                      status: row.status,
                    })),
                    "Export Inventory",
                  );
                })();
              }
            : undefined
        }
      >
        {section === "products" ? (
          <div className="space-y-3 p-4 pt-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <ProductItemSearch
                  tenantId={tenantId}
                  businessLocations={config?.businessLocations}
                  onSelect={(item) => {
                    if (item.itemId) goToDetail(item.itemId);
                  }}
                  placeholder="Search by name, SKU, or location / counter"
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
              onRowClick={(row) => goToDetail(row.id)}
              isLoading={isLoading}
              isFetching={isFetching}
              error={error ? "Failed to load inventory" : null}
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
