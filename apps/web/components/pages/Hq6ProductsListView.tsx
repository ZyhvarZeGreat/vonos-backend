"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Boxes, Hourglass, ImageIcon } from "lucide-react";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { getCatalogPage } from "@/lib/api/catalog";
import { deleteItem as deleteItemApi, getAllItems } from "@/lib/api/items";
import { useListExport } from "@/lib/hooks/useListExport";
import type { Item, StockStatus } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { ItemLocationCell } from "@/components/molecules/ItemLocationCell";
import { locationFilterOptions } from "@/lib/utils/locationLabels";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import {
  Hq6ViewProductModal,
  Hq6OpeningStockModal,
  Hq6AddLocationModal,
} from "@/components/hq6/Hq6ProductModals";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6FilterCheckbox,
  Hq6FilterCheckboxRow,
  Hq6FilterGrid,
  Hq6FilterSelect,
  Hq6FilterStack,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";

/**
 * HQ6 Products list — rebuilt from ui-audit/08_products/screenshot.png.
 * Route: /VA/catalog
 */
export function Hq6ProductsListView() {
  const { goToDetail } = useRecordNavigation("catalog");
  const tenantId = useTenantId();
  const { config, tenantCode } = useRouteTenant();
  const router = useRouter();
  const queryClient = useQueryClient();
  const exportList = useListExport();
  const { search, setSearch } = useListPageFilters();
  const [listTab, setListTab] = useState<"products" | "stock-report">("products");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [taxFilter, setTaxFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [notForSelling, setNotForSelling] = useState(false);
  const [localSearch, setLocalSearch] = useState(search);
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const [stockItem, setStockItem] = useState<Item | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const chrome = useHq6ListChrome();

  const apiFilters = useMemo(() => {
    const next: {
      status?: StockStatus;
      category?: string;
      locationCode?: string;
      search?: string;
    } = {};
    if (categoryFilter) next.category = categoryFilter;
    if (statusFilter) next.status = statusFilter as StockStatus;
    if (locationFilter) next.locationCode = locationFilter;
    const q = (localSearch || search).trim();
    if (q) next.search = q;
    return next;
  }, [categoryFilter, locationFilter, localSearch, search, statusFilter]);

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
    goToPage,
    canSelectPage,
    totalCount,
  } = useServerListPage({
    queryKey: ["catalog", tenantId, "hq6-v2"],
    enabled: Boolean(tenantId) && listTab === "products",
    filters: apiFilters,
    defaultPageSize: 50,
    fetchPage: (cursor, limit) => getCatalogPage(tenantId!, apiFilters, cursor, limit),
  });

  const categoryOptions = useMemo(
    () => (config?.itemCategories ?? []).map((c) => ({ value: c, label: c })),
    [config?.itemCategories],
  );
  const locationOptions = useMemo(() => locationFilterOptions(config), [config]);
  const brandOptions = useMemo(() => {
    const brands = new Set<string>();
    for (const row of items) {
      if (row.brandName?.trim()) brands.add(row.brandName.trim());
    }
    return [...brands].sort().map((b) => ({ value: b, label: b }));
  }, [items]);
  const unitOptions = useMemo(() => {
    const units = new Set<string>();
    for (const row of items) {
      if (row.unit?.trim()) units.add(row.unit.trim());
    }
    return [...units].sort().map((u) => ({ value: u, label: u }));
  }, [items]);

  const visibleItems = useMemo(() => {
    return items.filter((row) => {
      if (typeFilter === "single" && row.unit && /variable/i.test(row.unit)) {
        return false;
      }
      if (brandFilter && row.brandName !== brandFilter) return false;
      if (unitFilter && row.unit !== unitFilter) return false;
      if (notForSelling && row.availableForRetail) return false;
      return true;
    });
  }, [brandFilter, items, notForSelling, taxFilter, typeFilter, unitFilter]);

  const commitSearch = useCallback(() => {
    setSearch(localSearch);
  }, [localSearch, setSearch]);

  const handleExport = useCallback(() => {
    if (!tenantId) return;
    void (async () => {
      const rows = await getAllItems(tenantId, apiFilters);
      exportList(
        "products",
        [
          { key: "sku", header: "SKU" },
          { key: "name", header: "Product" },
          { key: "category", header: "Category" },
          { key: "brand", header: "Brand" },
          { key: "quantity", header: "Current Stock" },
          { key: "costPrice", header: "Unit Purchase Price" },
          { key: "sellPrice", header: "Selling Price" },
        ],
        rows.map((row) => ({
          sku: row.sku,
          name: row.name,
          category: row.category ?? "",
          brand: row.brandName ?? "",
          quantity: row.quantity,
          costPrice: row.costPrice,
          sellPrice: row.sellPrice ?? row.costPrice,
        })),
        "Export Products",
      );
    })();
  }, [apiFilters, exportList, tenantId]);

  const columns: ColumnConfig<Item>[] = useMemo(
    () => [
      {
        key: "image",
        header: "",
        sortable: false,
        render: () => (
          <div className="flex items-center gap-1">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--hq6-success)] text-[10px] font-bold text-white">
              +
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded border border-[var(--hq6-border)] bg-[#f4f4f4] text-[#999]">
              <ImageIcon className="h-4 w-4" />
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              {
                id: "details",
                label: "Details",
                onClick: () => {
                  /* HQ6 expands inline row details — open view modal as closest match */
                  setViewItem(row);
                },
              },
              {
                id: "labels",
                label: "Labels",
                onClick: () =>
                  router.push(`/${tenantCode}/print-labels?productId=${row.id}`),
              },
              {
                id: "view",
                label: "View",
                onClick: () => setViewItem(row),
              },
              {
                id: "edit",
                label: "Edit",
                onClick: () =>
                  router.push(`/${tenantCode}/add-product?edit=${row.id}`),
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteItem(row),
              },
              {
                id: "opening_stock",
                label: "Add or edit opening stock",
                onClick: () => setStockItem(row),
              },
              {
                id: "stock_history",
                label: "Product stock history",
                onClick: () =>
                  router.push(`/${tenantCode}/catalog/${row.id}?view=stock_history`),
              },
              {
                id: "duplicate",
                label: "Duplicate Product",
                onClick: () => {
                  if (!tenantCode) return;
                  router.push(`/${tenantCode}/add-product?d=${row.id}`);
                },
              },
            ]}
          />
        ),
      },
      {
        key: "name",
        header: "Product",
        render: (row) => (
          <button
            type="button"
            className="hq6-product-link text-left"
            onClick={(e) => {
              e.stopPropagation();
              goToDetail(row.id);
            }}
          >
            {row.name}
          </button>
        ),
      },
      {
        key: "binLocation",
        header: "Business Location",
        render: (row) => (
          <span className="inline-flex items-center gap-1">
            <ItemLocationCell item={row} locations={config?.businessLocations} />
          </span>
        ),
      },
      {
        key: "costPrice",
        header: "Unit Purchase Price",
        sortValue: (row) => row.costPrice,
        render: (row) => formatCurrency(row.costPrice, row.currency),
      },
      {
        key: "sellPrice",
        header: "Selling Price",
        sortValue: (row) => row.sellPrice ?? row.costPrice,
        render: (row) => formatCurrency(row.sellPrice ?? row.costPrice, row.currency),
      },
      {
        key: "quantity",
        header: "Current stock",
        sortValue: (row) => row.quantity,
        render: (row) => (
          <span className={cn(row.quantity < 0 && "hq6-stock-neg")}>
            {Number(row.quantity).toFixed(2)}
            {row.unit ? ` ${row.unit}` : " Single"}
          </span>
        ),
      },
      {
        key: "productType",
        header: "Product Type",
        sortable: false,
        render: () => "Single",
      },
      {
        key: "category",
        header: "Category",
        render: (row) => row.category ?? "",
      },
      {
        key: "brandName",
        header: "Brand",
        render: (row) => row.brandName ?? "",
      },
      {
        key: "tax",
        header: "Tax",
        sortable: false,
        render: () => "",
      },
      {
        key: "sku",
        header: "SKU",
        render: (row) => row.sku,
      },
    ],
    [config?.businessLocations, goToDetail, router, tenantCode],
  );

  const columnOptions = useMemo(
    () =>
      columns
        .filter((c) => c.key !== "image")
        .map((c) => ({ key: c.key, label: String(c.header || c.key) })),
    [columns],
  );

  const effectiveColumns = useMemo(() => {
    if (!chrome.visibleColumnKeys) return columns;
    const allowed = new Set(["image", "actions", ...chrome.visibleColumnKeys]);
    return columns.filter((c) => allowed.has(c.key));
  }, [chrome.visibleColumnKeys, columns]);

  const filters = (
    <Hq6FilterStack>
      <Hq6FilterCheckboxRow>
        <Hq6FilterCheckbox
          label="Not for selling"
          checked={notForSelling}
          onChange={setNotForSelling}
        />
      </Hq6FilterCheckboxRow>
      <Hq6FilterGrid>
        <Hq6FilterSelect
          label="Product Type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "", label: "All" },
            { value: "single", label: "Single" },
            { value: "variable", label: "Variable" },
            { value: "combo", label: "Combo" },
          ]}
        />
        <Hq6FilterSelect
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categoryOptions}
        />
        <Hq6FilterSelect
          label="Unit"
          value={unitFilter}
          onChange={setUnitFilter}
          options={unitOptions}
        />
        <Hq6FilterSelect
          label="Tax"
          value={taxFilter}
          onChange={setTaxFilter}
          options={[
            { value: "", label: "All" },
            { value: "VAT", label: "VAT" },
            { value: "WHT/VAT", label: "WHT/VAT" },
          ]}
        />
        <Hq6FilterSelect
          label="Brand"
          value={brandFilter}
          onChange={setBrandFilter}
          options={brandOptions}
        />
        <Hq6FilterSelect
          label="Business Location"
          value={locationFilter}
          onChange={setLocationFilter}
          options={locationOptions}
        />
        <Hq6FilterSelect
          label="Stock"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "", label: "All" },
            { value: "in_stock", label: "In Stock" },
            { value: "low_stock", label: "Low Stock" },
            { value: "out_of_stock", label: "Out of Stock" },
          ]}
        />
      </Hq6FilterGrid>
    </Hq6FilterStack>
  );

  const bulkActions = listTab === "products" ? (
    <div className="hq6-bulk-row">
      <button type="button" className="hq6-bulk hq6-bulk-danger">
        Delete Selected
      </button>
      <button
        type="button"
        className="hq6-bulk hq6-bulk-teal"
        onClick={() => setLocationModalOpen(true)}
      >
        Add to location
      </button>
      <button
        type="button"
        className="hq6-bulk hq6-bulk-muted"
        onClick={() => setLocationModalOpen(true)}
      >
        Remove from location
      </button>
      <button type="button" className="hq6-bulk hq6-bulk-warn">
        Deactivate Selected
      </button>
    </div>
  ) : null;

  return (
    <Hq6StandardListShell
      slug="catalog"
      tabLabel="All products"
      filters={filters}
      onAdd={() => {
        if (!tenantCode) return;
        router.push(`/${tenantCode}/add-product`);
      }}
      onExport={handleExport}
      columnOptions={columnOptions}
      chrome={chrome}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      searchValue={localSearch}
      onSearchChange={setLocalSearch}
      onSearchCommit={commitSearch}
      tabs={[
        {
          id: "products",
          label: "All products",
          active: listTab === "products",
          icon: <Boxes className="h-4 w-4" />,
          onClick: () => setListTab("products"),
        },
        {
          id: "stock-report",
          label: "Stock report",
          active: listTab === "stock-report",
          icon: <Hourglass className="h-4 w-4" />,
          onClick: () => setListTab("stock-report"),
        },
      ]}
      bulkActions={bulkActions}
      hideToolbar={listTab === "stock-report"}
      pagination={
        listTab === "products"
          ? {
              pageIndex,
              pageSize,
              itemCount: items.length,
              hasMore,
              canGoPrev,
              onPrev: goPrev,
              onNext: goNext,
              onPageSizeChange: setPageSize,
              onPageSelect: goToPage,
              canSelectPage,
              totalItems: totalCount,
              isBusy: isFetching && !isLoading,
            }
          : { show: false }
      }
      modals={
        <>
          <Hq6ViewProductModal
            open={Boolean(viewItem)}
            onClose={() => setViewItem(null)}
            item={viewItem}
          />
          <Hq6OpeningStockModal
            open={Boolean(stockItem)}
            onClose={() => setStockItem(null)}
            item={stockItem}
          />
          <Hq6AddLocationModal
            open={locationModalOpen}
            onClose={() => setLocationModalOpen(false)}
          />
          <Hq6ConfirmModal
            open={Boolean(deleteItem)}
            onClose={() => setDeleteItem(null)}
            title="Are you sure ?"
            message={
              deleteItem ? `Are you sure you want to delete "${deleteItem.name}"?` : ""
            }
            confirmLabel="Delete"
            danger
            onConfirm={() => {
              if (!tenantId || !deleteItem) return;
              void deleteItemApi(tenantId, deleteItem.id)
                .then(async () => {
                  toast.success(`Deleted ${deleteItem.name}`);
                  setDeleteItem(null);
                  await queryClient.invalidateQueries({ queryKey: ["catalog"] });
                  await queryClient.invalidateQueries({ queryKey: ["items"] });
                })
                .catch((err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Failed to delete product",
                  ),
                );
            }}
          />
        </>
      }
    >
      {listTab === "stock-report" ? (
        <div className="p-8 text-sm text-[#777]">
          Stock Report — use Reports → Stock Report for the full HQ6 report layout.
        </div>
      ) : (
        <DataTable
          data={visibleItems}
          columns={effectiveColumns}
          displayMode="table"
          embedded
          selectable
          disablePagination
          isLoading={isLoading}
          isFetching={isFetching && !isLoading}
          error={error ? "Could not load products." : null}
          onRowClick={(row) => goToDetail(row.id)}
          emptyState={{ message: "No products found." }}
        />
      )}
    </Hq6StandardListShell>
  );
}
