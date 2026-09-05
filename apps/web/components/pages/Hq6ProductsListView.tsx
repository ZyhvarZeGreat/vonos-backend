"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useServerListPage, withListSort, hq6ListPaginationProps } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { getCatalogPage, getCatalogListSummary, getAllCatalog } from "@/lib/api/catalog";
import {
  deleteItem as deleteItemApi,
  getPeerStockBySkus,
  saveItemOpeningStock,
} from "@/lib/api/items";
import { getAllCatalogMeta } from "@/lib/api/catalogMeta";
import { useListExport } from "@/lib/hooks/useListExport";
import type { Brand, Item, ProductCategory, ProductUnit, StockStatus } from "@vonos/types";
import {
  BUSINESS_LOCATION_PRESETS,
  PRODUCT_STOCK_BUSINESS_LOCATIONS,
  isPriceCatalogOnlyTenant,
  isProductStockTenant,
  productHomeLocationsForTenant,
} from "@vonos/types";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useHq6Permissions } from "@/lib/hooks/useHq6Permissions";
import { ItemLocationCell } from "@/components/molecules/ItemLocationCell";
import { InlinePriceCell } from "@/components/molecules/InlinePriceCell";
import { GroupPeerStockReadout } from "@/components/molecules/GroupPeerStockReadout";
import { ProductThumbnail } from "@/components/atoms/ProductThumbnail";
import { productStockLocationFilterOptions } from "@/lib/utils/locationLabels";
import { toast } from "@/stores/toastStore";
import { cn } from "@/lib/utils/cn";
import { compositeListCursorFrom } from "@/lib/utils/pagination";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import {
  Hq6ViewProductModal,
  Hq6OpeningStockModal,
  Hq6AddLocationModal,
} from "@/components/hq6/Hq6ProductModals";
import { Hq6MoveProductModal } from "@/components/hq6/Hq6MoveProductModal";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6ColumnVisibilityModal } from "@/components/hq6/Hq6ColumnVisibilityModal";
import { Hq6PrintModal } from "@/components/hq6/Hq6PrintModal";
import { UposDataTablesShell } from "@/components/upos/UposDataTablesShell";
import {
  UposGradientActionButton,
  UposTabPaneActions,
  UposNavTabs,
} from "@/components/upos/UposNavTabs";
import { useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import {
  prefetchCatalogDetail,
  prefetchProductForm,
} from "@/lib/query/prefetchListDetails";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import {
  Hq6Breadcrumbs,
  useHq6Breadcrumbs,
} from "@/components/hq6/Hq6Breadcrumbs";
import { tenantBasePath } from "@/lib/utils/tenantMount";

const TAX_RATES_STORAGE_PREFIX = "vonos:hq6-tax-rates:";
const DEFAULT_TAX_FILTER_OPTIONS = [
  { value: "vat", label: "VAT (7.5%)" },
  { value: "wht-vat", label: "WHT/VAT (15.5%)" },
];

function taxFilterOptionsForTenant(tenantId: string | null): {
  value: string;
  label: string;
}[] {
  if (!tenantId || typeof window === "undefined") {
    return DEFAULT_TAX_FILTER_OPTIONS;
  }
  try {
    const raw = window.localStorage.getItem(
      `${TAX_RATES_STORAGE_PREFIX}${tenantId}`,
    );
    if (!raw) return DEFAULT_TAX_FILTER_OPTIONS;
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      name?: string;
      rate?: number;
      forTaxGroupOnly?: boolean;
    }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_TAX_FILTER_OPTIONS;
    }
    return parsed
      .filter((row) => row.id && row.name && !row.forTaxGroupOnly)
      .map((row) => ({
        value: String(row.id),
        label:
          typeof row.rate === "number"
            ? `${row.name} (${row.rate}%)`
            : String(row.name),
      }));
  } catch {
    return DEFAULT_TAX_FILTER_OPTIONS;
  }
}

const PRODUCT_COLUMNS = [
  { key: "image", label: "Product image", always: true },
  { key: "actions", label: "Action", always: true },
  { key: "name", label: "Product" },
  { key: "binLocation", label: "Business Location" },
  { key: "costPrice", label: "Unit Purchase Price" },
  { key: "sellPrice", label: "Selling Price" },
  { key: "quantity", label: "Current stock" },
  { key: "groupStock", label: "Group stock (VW/VISP/VSP)" },
  { key: "productType", label: "Product Type" },
  { key: "category", label: "Category" },
  { key: "brandName", label: "Brand" },
  { key: "tax", label: "Tax" },
  { key: "sku", label: "SKU" },
  { key: "carModel", label: "Car Model" },
] as const;

type ProductColKey = (typeof PRODUCT_COLUMNS)[number]["key"];

/**
 * HQ6 Products list — literal UPOS product/index + product_list markup,
 * wired to Vonos catalog APIs. Used for /{tenant}/catalog (and inventory aliases).
 */
export function Hq6ProductsListView({
  listSlug = "catalog",
}: {
  listSlug?: "catalog" | "inventory" | "menu-items";
} = {}) {
  const { goToDetail, prefetchDetail } = useRecordNavigation(listSlug);
  const tenantId = useTenantId();
  const { config, tenantCode } = useRouteTenant();
  const priceCatalogOnly = isPriceCatalogOnlyTenant(
    tenantCode,
    config?.archetype,
  );
  const showGroupPeerStock = isProductStockTenant(tenantCode);
  const router = useRouter();
  const queryClient = useQueryClient();
  const exportList = useListExport();
  const { requireCan } = useHq6Permissions();
  const { search, setSearch } = useListPageFilters();
  const copy = hq6CopyForSlug(listSlug === "menu-items" ? "catalog" : listSlug);
  const crumbs = useHq6Breadcrumbs({ leafLabel: copy.title });
  const [listTab, setListTab] = useState<"products" | "stock-report">("products");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [taxFilter, setTaxFilter] = useState("");
  const [notForSelling, setNotForSelling] = useState(false);
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const [stockItem, setStockItem] = useState<Item | null>(null);
  const [moveItem, setMoveItem] = useState<Item | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [bulkDeactivateIds, setBulkDeactivateIds] = useState<string[] | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const chrome = useHq6ListChrome("products");
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Moves: product homes (VW/VISP/VSP) + VA/VP as move destinations only.
  // `Hq6MoveProductModal` already blocks negative stock via `qty > available at source`.
  const moveLocations = useMemo(() => {
    const presets = [
      ...PRODUCT_STOCK_BUSINESS_LOCATIONS,
      ...(BUSINESS_LOCATION_PRESETS.VA ?? []),
      ...(BUSINESS_LOCATION_PRESETS.VP ?? []),
    ];

    const map = new Map<string, string>();
    for (const loc of presets) {
      if (!loc.code || loc.code === "ALL") continue;
      map.set(loc.code, loc.name);
    }

    return Array.from(map.entries()).map(([code, name]) => ({
      code,
      name,
    }));
  }, []);

  const apiFilters = useMemo(() => {
    const next: {
      status?: StockStatus;
      category?: string;
      locationCode?: string;
      unit?: string;
      brandName?: string;
      availableForRetail?: boolean;
    } = {};
    if (categoryFilter) next.category = categoryFilter;
    if (statusFilter) next.status = statusFilter as StockStatus;
    if (locationFilter) next.locationCode = locationFilter;
    if (unitFilter) next.unit = unitFilter;
    if (brandFilter) next.brandName = brandFilter;
    if (notForSelling) next.availableForRetail = false;
    return next;
  }, [
    brandFilter,
    categoryFilter,
    locationFilter,
    notForSelling,
    statusFilter,
    unitFilter,
  ]);

  const categoriesQuery = useQuery({
    queryKey: ["catalog-meta", "categories", tenantId, "product-filter-all"],
    queryFn: () =>
      getAllCatalogMeta(tenantId!, "categories") as Promise<ProductCategory[]>,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  // Debounced API search across the full catalog — avoids downloading ~4k
  // rows on mount (which fought the sliding-window page warm on Neon).
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
    isPaging,
    isSearchWarming,
    isSearching,
    error,
    goToPage,
    canSelectPage,
    totalCount,
    sort,
    setSort,
    reset,
  } = useServerListPage({
    queryKey: ["catalog", tenantId, "hq6-upos"],
    enabled: Boolean(tenantId) && listTab === "products",
    filters: apiFilters,
    search,
    searchMode: "hybrid",
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    defaultSort: { sortBy: "updatedAt", sortDir: "desc" },
    fetchPage: (cursor, limit, listSort, opts) =>
      getCatalogPage(
        tenantId!,
        withListSort(
          {
            ...apiFilters,
            search: opts?.search,
            includeSummary: opts?.includeSummary,
          },
          listSort,
        ),
        cursor,
        limit,
      ),
    fetchSummary: (opts) =>
      getCatalogListSummary(tenantId!, {
        ...apiFilters,
        search: opts?.search,
      }),
    getCursor: (row, listSort) => {
      const sortBy = listSort?.sortBy ?? "updatedAt";
      const type =
        sortBy === "quantity" || sortBy === "costPrice" || sortBy === "sellPrice"
          ? "number"
          : sortBy === "createdAt" || sortBy === "updatedAt"
            ? "date"
            : "string";
      return compositeListCursorFrom(row, sortBy, type);
    },
  });
  const brandsQuery = useQuery({
    queryKey: ["catalog-meta", "brands", tenantId, "product-filter-all"],
    queryFn: () =>
      getAllCatalogMeta(tenantId!, "brands") as Promise<Brand[]>,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const unitsQuery = useQuery({
    queryKey: ["catalog-meta", "units", tenantId, "product-filter-all"],
    queryFn: () =>
      getAllCatalogMeta(tenantId!, "units") as Promise<ProductUnit[]>,
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const locationOptions = useMemo(
    () => productStockLocationFilterOptions(tenantCode),
    [tenantCode],
  );
  const productLocations = useMemo(() => {
    const home = productHomeLocationsForTenant(tenantCode);
    return home.length > 0 ? home : PRODUCT_STOCK_BUSINESS_LOCATIONS;
  }, [tenantCode]);

  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of categoriesQuery.data ?? []) {
      const name = row.name?.trim();
      if (name) names.add(name);
    }
    for (const name of config?.itemCategories ?? []) {
      const trimmed = name.trim();
      if (trimmed) names.add(trimmed);
    }
    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [categoriesQuery.data, config?.itemCategories]);

  const brandOptions = useMemo(
    () =>
      // De-dupe by name — legacy data can carry duplicate brands, which would
      // otherwise render duplicate <option> keys.
      [
        ...new Set(
          (brandsQuery.data ?? [])
            .map((b) => b.name?.trim())
            .filter((name): name is string => Boolean(name)),
        ),
      ]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [brandsQuery.data],
  );
  const unitOptions = useMemo(() => {
    // De-dupe by filter value — legacy units often share shortName (e.g. "u").
    const byValue = new Map<string, { value: string; label: string }>();
    for (const unit of unitsQuery.data ?? []) {
      const value = (unit.shortName || unit.name).trim();
      if (!value || byValue.has(value)) continue;
      byValue.set(value, {
        value,
        label: unit.shortName ? `${unit.name} (${unit.shortName})` : unit.name,
      });
    }
    return [...byValue.values()].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [unitsQuery.data]);
  const taxOptions = useMemo(
    () => taxFilterOptionsForTenant(tenantId ?? null),
    [tenantId],
  );

  const visibleItems = useMemo(() => {
    if (!typeFilter) return items;
    return items.filter((row) => {
      const hay = `${row.unit ?? ""} ${row.name}`.toLowerCase();
      if (typeFilter === "variable") return /variable|variation/.test(hay);
      if (typeFilter === "combo") return /combo/.test(hay);
      if (typeFilter === "single") return !/variable|variation|combo/.test(hay);
      return true;
    });
  }, [items, typeFilter]);

  const peerSkuKey = useMemo(
    () =>
      showGroupPeerStock
        ? visibleItems
            .map((r) => r.sku.trim())
            .filter(Boolean)
            .join("|")
        : "",
    [showGroupPeerStock, visibleItems],
  );

  const peerStockQuery = useQuery({
    queryKey: ["peer-stock-page", tenantId, peerSkuKey],
    enabled: Boolean(showGroupPeerStock && peerSkuKey),
    queryFn: () =>
      getPeerStockBySkus(visibleItems.map((r) => r.sku).filter(Boolean)),
    staleTime: 60_000,
  });

  const peerStockBySku = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof peerStockQuery.data>["rows"][number]["entities"]
    >();
    for (const row of peerStockQuery.data?.rows ?? []) {
      map.set(row.sku.trim().toUpperCase(), row.entities);
    }
    return map;
  }, [peerStockQuery.data]);

  const handleExport = useCallback(
    (format: "csv" | "excel" | "pdf" | "print") => {
    if (!tenantId) return;
    void (async () => {
        const rows = await getAllCatalog(tenantId, apiFilters);
      exportList(
          format === "print" ? "products-print" : `products-${format}`,
        [
          { key: "sku", header: "SKU" },
          { key: "name", header: "Product" },
          { key: "category", header: "Category" },
          { key: "brand", header: "Brand" },
            ...(priceCatalogOnly
              ? []
              : [{ key: "quantity", header: "Current Stock" }]),
          { key: "costPrice", header: "Unit Purchase Price" },
          { key: "sellPrice", header: "Selling Price" },
        ],
        rows.map((row) => ({
          sku: row.sku,
          name: row.name,
          category: row.category ?? "",
          brand: row.brandName ?? "",
            ...(priceCatalogOnly ? {} : { quantity: row.quantity }),
          costPrice: row.costPrice,
            sellPrice: row.sellPrice ?? 0,
        })),
        "Export Products",
      );
    })();
    },
    [apiFilters, exportList, priceCatalogOnly, tenantId],
  );

  const columnOptions = useMemo(
    () =>
      PRODUCT_COLUMNS.filter((c) => {
        if ("always" in c && c.always) return false;
        if (priceCatalogOnly && (c.key === "quantity" || c.key === "groupStock"))
          return false;
        if (!showGroupPeerStock && c.key === "groupStock") return false;
        return true;
      }).map((c) => ({
        key: c.key,
        label: c.label,
      })),
    [priceCatalogOnly, showGroupPeerStock],
  );

  const isColVisible = useCallback(
    (key: ProductColKey) => {
      if (priceCatalogOnly && (key === "quantity" || key === "groupStock"))
        return false;
      if (!showGroupPeerStock && key === "groupStock") return false;
      const def = PRODUCT_COLUMNS.find((c) => c.key === key);
      if (def && "always" in def && def.always) return true;
      if (!chrome.visibleColumnKeys) return true;
      if (key === "groupStock" && showGroupPeerStock) {
        // New column: default on when Current stock is shown, until user toggles it.
        if (chrome.visibleColumnKeys.includes("groupStock")) return true;
        return chrome.visibleColumnKeys.includes("quantity");
      }
      return chrome.visibleColumnKeys.includes(key);
    },
    [chrome.visibleColumnKeys, priceCatalogOnly, showGroupPeerStock],
  );

  const allSelected =
    visibleItems.length > 0 && visibleItems.every((r) => selectedIds.has(r.id));

  const toggleSort = (sortBy: string) => {
    if (sort?.sortBy === sortBy) {
      setSort(sortBy, sort.sortDir === "asc" ? "desc" : "asc");
    } else {
      setSort(sortBy, "asc");
    }
  };

  const sortClass = (sortBy: string) => {
    if (sort?.sortBy !== sortBy) return "sorting";
    return sort.sortDir === "asc" ? "sorting_asc" : "sorting_desc";
  };

  const pagination = hq6ListPaginationProps({
    items: visibleItems,
    pageIndex,
    pageSize,
    hasMore,
    canGoPrev,
    goPrev,
    goNext,
    setPageSize,
    goToPage,
    canSelectPage,
    totalCount,
    isFetching,
    isPaging,
    isSearching,
    isLoading,
  });

  const showTableLoading =
    (isLoading || isSearchWarming || isSearching) && visibleItems.length === 0;

  return (
    <div className="hq6-page hq6-products-page">
      {/* Content Header — product/index.blade.php */}
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          {copy.title}
          <small className="tw-text-sm md:tw-text-base tw-text-gray-700 tw-font-semibold">
            {copy.subtitle}
          </small>
        </h1>
        <Hq6Breadcrumbs items={crumbs} />
      </section>

      <section className="content">
        <div className="row">
          <div className="col-md-12">
            {/* components/filters.blade.php — collapsed by default */}
            <div className="tw-transition-all tw-mb-4 lg:tw-col-span-1 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
              <div
                className="box-header with-border"
                style={{ cursor: "pointer" }}
                onClick={() => setFiltersOpen((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFiltersOpen((v) => !v);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={filtersOpen}
              >
                <h3 className="box-title tw-pt-2 tw-pb-2 tw-pl-2">
                  <a href="#collapseFilter" onClick={(e) => e.preventDefault()}>
                    <i className="fa fa-filter" aria-hidden /> Filters
                  </a>
                </h3>
          </div>
              <div
                id="collapseFilter"
                className="upos-filters-body tw-pt-4 tw-pb-4"
                aria-expanded={filtersOpen}
                hidden={!filtersOpen}
                style={{ display: filtersOpen ? "block" : "none" }}
              >
                <div className="box-body">
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="product_list_filter_type">
                        Product Type:
                      </label>
                      <select
                        className="form-control select2"
                        style={{ width: "100%" }}
                        id="product_list_filter_type"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="single">Single</option>
                        <option value="variable">Variable</option>
                        <option value="combo">Combo</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="product_list_filter_category_id">
                        Category:
                      </label>
                      <select
                        className="form-control select2"
                        style={{ width: "100%" }}
                        id="product_list_filter_category_id"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        {categoryOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="product_list_filter_unit_id">Unit:</label>
                      <select
                        className="form-control select2"
                        style={{ width: "100%" }}
                        id="product_list_filter_unit_id"
                        value={unitFilter}
                        onChange={(e) => setUnitFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        {unitOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="product_list_filter_tax_id">Tax:</label>
                      <select
                        className="form-control select2"
                        style={{ width: "100%" }}
                        id="product_list_filter_tax_id"
                        value={taxFilter}
                        onChange={(e) => setTaxFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        {taxOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label htmlFor="product_list_filter_brand_id">
                        Brand:
                      </label>
                      <select
                        className="form-control select2"
                        style={{ width: "100%" }}
                        id="product_list_filter_brand_id"
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        {brandOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3" id="location_filter">
                    <div className="form-group">
                      <label htmlFor="location_id">Business Location:</label>
                      <select
                        className="form-control select2"
                        style={{ width: "100%" }}
                        id="location_id"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        {locationOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <br />
                    <div className="form-group">
                      <select
                        className="form-control select2"
                        style={{ width: "100%" }}
                        id="active_state"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="in_stock">Active</option>
                        <option value="out_of_stock">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <br />
                      <label>
                        <input
                          type="checkbox"
                          className="input-icheck"
                          id="not_for_selling"
                          checked={notForSelling}
                          onChange={(e) => setNotForSelling(e.target.checked)}
                        />{" "}
                        <strong>Not for selling</strong>
                      </label>
                    </div>
                  </div>
                  <div className="clearfix" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-12">
            <UposNavTabs
              tabs={[
                {
                  id: "product_list_tab",
                  label: "All Products",
                  iconClass: "fa fa-cubes",
                  active: listTab === "products",
                  onClick: () => setListTab("products"),
                },
                ...(!priceCatalogOnly
                  ? [
                      {
                        id: "product_stock_report",
                        label: "Stock Report",
                        iconClass: "fa fa-hourglass-half",
                        active: listTab === "stock-report",
                        onClick: () => setListTab("stock-report" as const),
                      },
                    ]
                  : []),
              ]}
            >
              {listTab === "products" ? (
                <div className="tab-pane active" id="product_list_tab">
                  <UposTabPaneActions>
                    <UposGradientActionButton
                      label="Add"
                      icon="plus"
                      onClick={() => {
                        if (!requireCan("product.create")) return;
                        if (!tenantCode) return;
                        router.push(`${tenantBasePath(tenantCode)}/add-product`);
                      }}
                    />
                    <UposGradientActionButton
                      label="Download Excel"
                      icon="download"
                      onClick={() => {
                        if (!requireCan("view_export_buttons")) return;
                        handleExport("excel");
                      }}
                    />
                  </UposTabPaneActions>

                  {error ? (
                    <div className="alert alert-danger">Could not load products.</div>
                  ) : null}

                  <UposDataTablesShell
                    tableId="product_table"
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    searchValue={search}
                    onSearchChange={setSearch}
                    
                    onExportCsv={() => handleExport("csv")}
                    onExportExcel={() => handleExport("excel")}
                    onPrint={() => chrome.setPrintOpen(true)}
                    onColumnVisibility={() => chrome.setColumnsOpen(true)}
                    onExportPdf={() => handleExport("pdf")}
                    pageIndex={pagination.pageIndex ?? 0}
                    itemCount={visibleItems.length}
                    totalItems={pagination.totalItems}
                    hasMore={pagination.hasMore}
                    canGoPrev={pagination.canGoPrev}
                    onPrev={pagination.onPrev}
                    onNext={pagination.onNext}
                    onPageSelect={pagination.onPageSelect}
                    canSelectPage={pagination.canSelectPage}
                    isBusy={pagination.isBusy}
                    isSearching={isSearching}
                    bulkActions={
                      <div style={{ display: "flex", width: "100%", gap: 8, flexWrap: "wrap", padding: "8px 0" }}>
                        <button
                          type="button"
                          className="tw-dw-btn tw-dw-btn-outline tw-dw-btn-xs tw-dw-btn-error"
                          id="delete-selected"
                          disabled={selectedIds.size === 0}
                          onClick={() => {
                            if (!requireCan("product.delete")) return;
                            setBulkDeleteIds([...selectedIds]);
                          }}
                        >
                          Delete Selected
                        </button>
                        <button
                          type="button"
                          className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-accent update_product_location"
                          data-type="add"
                          disabled={selectedIds.size === 0}
                          onClick={() => setLocationModalOpen(true)}
                        >
                          Add to location
                        </button>
                        <button
                          type="button"
                          className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-neutral update_product_location"
                          data-type="remove"
                          disabled={selectedIds.size === 0}
                          onClick={() => setLocationModalOpen(true)}
                        >
                          Remove from location
                        </button>
                        <button
                          type="button"
                          className="tw-dw-btn tw-dw-btn-xs tw-dw-btn-outline tw-dw-btn-warning"
                          id="deactivate-selected"
                          disabled={selectedIds.size === 0}
                          onClick={() => setBulkDeactivateIds([...selectedIds])}
                        >
                          Deactivate Selected
                        </button>
                      </div>
                    }
                  >
                    <table
                      className="table table-bordered table-striped ajax_view hide-footer dataTable"
                      id="product_table"
                      role="grid"
                      aria-describedby="product_table_info"
                      style={{ width: "100%" }}
                    >
                      <thead>
                        <tr role="row">
                          <th className="not-export sorting_disabled">
                            <input
                              type="checkbox"
                              id="select-all-row"
                              data-table-id="product_table"
                              checked={allSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(new Set(visibleItems.map((r) => r.id)));
                                } else {
                                  setSelectedIds(new Set());
                                }
                              }}
                            />
                          </th>
                          {isColVisible("image") ? (
                            <th className="tw-w-full not-export sorting_disabled">
                              Product image{" "}
                            </th>
                          ) : null}
                          {isColVisible("actions") ? (
                            <th className="not-export sorting_disabled">Action</th>
                          ) : null}
                          {isColVisible("name") ? (
                            <th
                              className={sortClass("name")}
                              onClick={() => toggleSort("name")}
                              style={{ cursor: "pointer" }}
                            >
                              Product
                            </th>
                          ) : null}
                          {isColVisible("binLocation") ? (
                            <th className="sorting_disabled">
                              Business Location{" "}
                              <i
                                className="fa fa-info-circle text-info hover-q no-print"
                                aria-hidden
                                title="Products available at these locations"
                              />
                            </th>
                          ) : null}
                          {isColVisible("costPrice") ? (
                            <th
                              className={sortClass("costPrice")}
                              onClick={() => toggleSort("costPrice")}
                              style={{ cursor: "pointer" }}
                            >
                              Unit Purchase Price
                            </th>
                          ) : null}
                          {isColVisible("sellPrice") ? (
                            <th
                              className={sortClass("sellPrice")}
                              onClick={() => toggleSort("sellPrice")}
                              style={{ cursor: "pointer" }}
                            >
                              Selling Price
                            </th>
                          ) : null}
                          {isColVisible("quantity") ? (
                            <th
                              className={sortClass("quantity")}
                              onClick={() => toggleSort("quantity")}
                              style={{ cursor: "pointer" }}
                            >
                              Current stock
                            </th>
                          ) : null}
                          {isColVisible("groupStock") ? (
                            <th className="sorting_disabled">
                              Group stock
                              <i
                                className="fa fa-info-circle text-info hover-q no-print"
                                aria-hidden
                                title="VW / VISP / VSP on-hand — view only; edit only your entity"
                                style={{ marginLeft: 4 }}
                              />
                            </th>
                          ) : null}
                          {isColVisible("productType") ? (
                            <th className="sorting_disabled">Product Type</th>
                          ) : null}
                          {isColVisible("category") ? (
                            <th
                              className={sortClass("category")}
                              onClick={() => toggleSort("category")}
                              style={{ cursor: "pointer" }}
                            >
                              Category
                            </th>
                          ) : null}
                          {isColVisible("brandName") ? (
                            <th className="sorting_disabled">Brand</th>
                          ) : null}
                          {isColVisible("tax") ? (
                            <th className="sorting_disabled">Tax</th>
                          ) : null}
                          {isColVisible("sku") ? (
                            <th
                              className={sortClass("sku")}
                              onClick={() => toggleSort("sku")}
                              style={{ cursor: "pointer" }}
                            >
                              SKU
                            </th>
                          ) : null}
                          {isColVisible("carModel") ? (
                            <th className="sorting_disabled">Car Model</th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {showTableLoading ? (
                          Array.from({ length: 8 }).map((_, rowIdx) => (
                            <tr key={`sk-${rowIdx}`} className={rowIdx % 2 === 0 ? "odd" : "even"}>
                              {Array.from({ length: 8 }).map((__, colIdx) => (
                                <td key={colIdx}>
                                  <span
                                    className="tw-inline-block tw-h-3.5 tw-animate-pulse tw-rounded tw-bg-gray-200"
                                    style={{
                                      width: `${48 + ((rowIdx + colIdx) % 4) * 12}%`,
                                    }}
                                    aria-hidden
                                  />
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : visibleItems.length === 0 ? (
                          <tr className="odd">
                            <td colSpan={14} className="dataTables_empty text-center">
                              No products found.
                            </td>
                          </tr>
                        ) : (
                          visibleItems.map((row, index) => (
                            <tr
                              key={row.id}
                              role="row"
                              className={index % 2 === 0 ? "odd" : "even"}
                              data-href={`${tenantBasePath(tenantCode)}/${listSlug}/${row.id}`}
                              onMouseEnter={() => {
                                prefetchDetail(row.id);
                                if (tenantId) {
                                  prefetchCatalogDetail(
                                    queryClient,
                                    tenantId,
                                    row.id,
                                    row,
                                  );
                                  prefetchProductForm(
                                    queryClient,
                                    tenantId,
                                    row.id,
                                    "edit",
                                    row,
                                  );
                                }
                              }}
                              onDoubleClick={() => {
                                if (tenantId) {
                                  prefetchCatalogDetail(
                                    queryClient,
                                    tenantId,
                                    row.id,
                                    row,
                                  );
                                }
                                goToDetail(row.id);
                              }}
                            >
                              <td className="selectable_td">
                                <input
                                  type="checkbox"
                                  className="row-select"
                                  value={row.id}
                                  checked={selectedIds.has(row.id)}
                                  onChange={(e) => {
                                    setSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(row.id);
                                      else next.delete(row.id);
                                      return next;
                                    });
                                  }}
                                />
                              </td>
                              {isColVisible("image") ? (
                                <td>
                                  <div style={{ display: "flex" }}>
                                    <i
                                      style={{ margin: "auto" }}
                                      className="fa fa-plus-circle text-success cursor-pointer no-print rack-details"
                                      title="Details"
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewItem(row);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") setViewItem(row);
                                      }}
                                    />
                                    &nbsp;&nbsp;
                                    <ProductThumbnail
                                      src={row.imageUrl}
                                      alt={row.name}
                                    />
                                  </div>
                                </td>
                              ) : null}
                              {isColVisible("actions") ? (
                                <td onClick={(e) => e.stopPropagation()}>
                                  <div className="btn-group">
          <Hq6ActionsMenu
            items={[
              {
                id: "labels",
                label: "Labels",
                onClick: () =>
                                            router.push(
                                              `${tenantBasePath(tenantCode)}/print-labels?productId=${row.id}`,
                                            ),
              },
              {
                id: "view",
                label: "View",
                onClick: () => setViewItem(row),
              },
              {
                id: "edit",
                label: "Edit",
                                          onClick: () => {
                                            if (!requireCan("product.update"))
                                              return;
                                            if (tenantId) {
                                              prefetchProductForm(
                                                queryClient,
                                                tenantId,
                                                row.id,
                                                "edit",
                                                row,
                                              );
                                            }
                                            const href = `${tenantBasePath(tenantCode)}/add-product?edit=${row.id}`;
                                            router.prefetch(href);
                                            router.push(href);
                                          },
              },
              {
                id: "delete",
                label: "Delete",
                                          danger: true as const,
                                          onClick: () => {
                                            if (!requireCan("product.delete"))
                                              return;
                                            setDeleteItem(row);
                                          },
                                        },
                                        ...(!priceCatalogOnly
                                          ? [
              {
                id: "opening_stock",
                                                label:
                                                  "Add or edit opening stock",
                                                dividerBefore: true as const,
                                                onClick: () => {
                                                  if (
                                                    !requireCan(
                                                      "product.opening_stock",
                                                    )
                                                  )
                                                    return;
                                                  setStockItem(row);
                                                },
                                              },
                                              {
                                                id: "move_product",
                                                label: "Move product",
                                                onClick: () => setMoveItem(row),
              },
              {
                id: "stock_history",
                label: "Product stock history",
                onClick: () =>
                                                  router.push(
                                                    `${tenantBasePath(tenantCode)}/${listSlug}/${row.id}?view=stock_history`,
                                                  ),
              },
                                            ]
                                          : []),
              {
                id: "duplicate",
                label: "Duplicate Product",
                onClick: () => {
                                            if (!requireCan("product.create"))
                                              return;
                  if (!tenantCode) return;
                                            if (tenantId) {
                                              prefetchProductForm(
                                                queryClient,
                                                tenantId,
                                                row.id,
                                                "duplicate",
                                                row,
                                              );
                                            }
                                            const href = `${tenantBasePath(tenantCode)}/add-product?d=${row.id}`;
                                            router.prefetch(href);
                                            router.push(href);
                },
              },
            ]}
          />
                                  </div>
                                </td>
                              ) : null}
                              {isColVisible("name") ? (
                                <td className={sort?.sortBy === "name" ? "sorting_1" : undefined}>
                                  <a
                                    href={`${tenantBasePath(tenantCode)}/${listSlug}/${row.id}`}
            onClick={(e) => {
                                      e.preventDefault();
                                      setViewItem(row);
            }}
          >
            {row.name}
                                  </a>
                                  {row.sku?.trim() &&
                                  row.sku.trim().toLowerCase() !==
                                    row.name.trim().toLowerCase() ? (
                                    <div
                                      title={row.sku}
                                      style={{
                                        marginTop: 2,
                                        maxWidth: 260,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        color: "#6b7280",
                                        fontSize: 12,
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {row.sku}
                                    </div>
                                  ) : null}
                                </td>
                              ) : null}
                              {isColVisible("binLocation") ? (
                                <td>
                                  <ItemLocationCell
                                    item={row}
                                    locations={productLocations}
                                    productStockMode
                                    fallbackLocationCode={tenantCode}
                                  />
                                </td>
                              ) : null}
                              {isColVisible("costPrice") ? (
                                <td>
                                  <div style={{ whiteSpace: "nowrap" }}>
                                    <InlinePriceCell
                                      item={row}
                                      label="Unit purchase price"
                                      field="costPrice"
                                    />
                                  </div>
                                </td>
                              ) : null}
                              {isColVisible("sellPrice") ? (
                                <td>
                                  <div style={{ whiteSpace: "nowrap" }}>
                                    <InlinePriceCell
                                      item={row}
                                      label="Selling price"
                                      field="sellPrice"
                                    />
                                  </div>
                                </td>
                              ) : null}
                              {isColVisible("quantity") ? (
                                <td
                                  className={cn(
                                    row.quantity < 0 && "text-danger",
                                  )}
                                >
                                  {Number(row.quantity).toFixed(2)}{" "}
                                  {row.unit?.trim() || "Single"}
                                </td>
                              ) : null}
                              {isColVisible("groupStock") ? (
                                <td>
                                  <GroupPeerStockReadout
                                    entities={peerStockBySku.get(
                                      row.sku.trim().toUpperCase(),
                                    )}
                                    highlightCode={tenantCode}
                                  />
                                </td>
                              ) : null}
                              {isColVisible("productType") ? <td>Single</td> : null}
                              {isColVisible("category") ? (
                                <td>{row.category ?? ""} </td>
                              ) : null}
                              {isColVisible("brandName") ? (
                                <td>{row.brandName ?? ""}</td>
                              ) : null}
                              {isColVisible("tax") ? <td /> : null}
                              {isColVisible("sku") ? <td>{row.sku}</td> : null}
                              {isColVisible("carModel") ? <td /> : null}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </UposDataTablesShell>
                </div>
              ) : (
                <div className="tab-pane active" id="product_stock_report">
                  <p className="text-muted" style={{ padding: 16 }}>
                    Stock Report — open Reports → Stock Report for the full HQ6 layout.
                  </p>
                </div>
              )}
            </UposNavTabs>
          </div>
        </div>
      </section>

      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()} All
        rights reserved.
      </p>

          <Hq6ViewProductModal
            open={Boolean(viewItem)}
            onClose={() => setViewItem(null)}
            item={viewItem}
          />
          <Hq6OpeningStockModal
            open={Boolean(stockItem)}
            onClose={() => setStockItem(null)}
            item={stockItem}
        onSave={async (rows, locationCode, unitCost) => {
          if (!tenantId || !stockItem) return;
          const loc = locationCode.trim();
          if (!loc) throw new Error("Select a location");

          await saveItemOpeningStock(
            stockItem.id,
            {
              locationCode: loc,
              costPrice: unitCost,
              rows,
            },
            tenantId,
            stockItem,
          );

          void queryClient.invalidateQueries({ queryKey: ["catalog"] });
          void queryClient.invalidateQueries({ queryKey: ["items"] });
          void queryClient.invalidateQueries({
            queryKey: ["item-stock-history"],
          });
          void queryClient.invalidateQueries({
            queryKey: ["item-opening-stock"],
          });
        }}
      />
      <Hq6MoveProductModal
        open={Boolean(moveItem)}
        onClose={() => setMoveItem(null)}
        tenantId={tenantId}
        item={moveItem}
        locations={moveLocations}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["catalog"] });
        }}
          />
          <Hq6AddLocationModal
            open={locationModalOpen}
            onClose={() => setLocationModalOpen(false)}
          />
      <Hq6ColumnVisibilityModal
        open={chrome.columnsOpen}
        onClose={() => chrome.setColumnsOpen(false)}
        columns={columnOptions}
        visibleKeys={
          chrome.visibleColumnKeys ?? columnOptions.map((c) => c.key)
        }
        onChange={chrome.setVisibleColumnKeys}
        onReset={() => {
          chrome.resetColumnVisibility();
          chrome.setColumnsOpen(false);
        }}
      />
      <Hq6PrintModal
        open={chrome.printOpen}
        onClose={() => chrome.setPrintOpen(false)}
        title="Print products"
        onPrint={() => handleExport("print")}
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
              void queryClient.invalidateQueries({ queryKey: ["catalog"] });
              void queryClient.invalidateQueries({ queryKey: ["items"] });
              reset();
                })
                .catch((err) =>
                  toast.error(
                    err instanceof Error ? err.message : "Failed to delete product",
                  ),
                );
            }}
          />
          <Hq6ConfirmModal
            open={Boolean(bulkDeleteIds?.length)}
            onClose={() => setBulkDeleteIds(null)}
            title="Delete selected products?"
            message={
              bulkDeleteIds
                ? `Delete ${bulkDeleteIds.length} selected product${
                    bulkDeleteIds.length === 1 ? "" : "s"
                  }? This cannot be undone.`
                : ""
            }
            confirmLabel="Delete"
            danger
            onConfirm={() => {
              if (!tenantId || !bulkDeleteIds?.length) return;
              const ids = bulkDeleteIds;
              void (async () => {
                try {
                  for (const id of ids) {
                    await deleteItemApi(tenantId, id);
                  }
                  toast.success(
                    `Deleted ${ids.length} product${ids.length === 1 ? "" : "s"}`,
                  );
                  setBulkDeleteIds(null);
              setSelectedIds(new Set());
              void queryClient.invalidateQueries({ queryKey: ["catalog"] });
              void queryClient.invalidateQueries({ queryKey: ["items"] });
              reset();
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to delete selected products",
                  );
                }
              })();
            }}
          />
      <Hq6ConfirmModal
        open={Boolean(bulkDeactivateIds?.length)}
        onClose={() => setBulkDeactivateIds(null)}
        title="Deactivate selected products?"
        message={
          bulkDeactivateIds
            ? `Deactivate ${bulkDeactivateIds.length} selected product${
                bulkDeactivateIds.length === 1 ? "" : "s"
              }? They will be removed from the active catalog.`
            : ""
        }
        confirmLabel="Deactivate"
        danger
        onConfirm={() => {
          if (!tenantId || !bulkDeactivateIds?.length) return;
          const ids = bulkDeactivateIds;
          void (async () => {
            try {
              for (const id of ids) {
                await deleteItemApi(tenantId, id);
              }
              toast.success(
                `Deactivated ${ids.length} product${ids.length === 1 ? "" : "s"}`,
              );
              setBulkDeactivateIds(null);
              setSelectedIds(new Set());
              void queryClient.invalidateQueries({ queryKey: ["catalog"] });
              void queryClient.invalidateQueries({ queryKey: ["items"] });
              reset();
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : "Failed to deactivate selected products",
              );
            }
          })();
        }}
      />
    </div>
  );
}
