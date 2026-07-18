import type { ProductSellReportView, ReportRunOptions } from "@vonos/types";

export type ReportFilterFieldKey =
  | "search"
  | "customerId"
  | "customerGroupId"
  | "locationCode"
  | "category"
  | "brandId"
  | "paymentMethod"
  | "supplierId";

export type ReportFilterField =
  | { key: "search"; label: string; placeholder?: string; kind: "search" }
  | {
      key: Exclude<ReportFilterFieldKey, "search">;
      label: string;
      kind: "select";
      optionsSource:
        | "customers"
        | "customerGroups"
        | "locations"
        | "categories"
        | "brands"
        | "paymentMethods"
        | "suppliers";
    };

export interface ReportTableUiConfig {
  filters: ReportFilterField[];
  views?: Array<{ id: ProductSellReportView; label: string }>;
}

const LOCATION_FILTER: ReportFilterField = {
  key: "locationCode",
  kind: "select",
  label: "Business Location",
  optionsSource: "locations",
};

const SEARCH_PRODUCT: ReportFilterField = {
  key: "search",
  kind: "search",
  label: "Search Product",
  placeholder: "Product name / SKU",
};

export const REPORT_TABLE_UI: Record<string, ReportTableUiConfig> = {
  "product-sell": {
    filters: [
      SEARCH_PRODUCT,
      { key: "customerId", kind: "select", label: "Customer", optionsSource: "customers" },
      {
        key: "customerGroupId",
        kind: "select",
        label: "Customer Group",
        optionsSource: "customerGroups",
      },
      LOCATION_FILTER,
      { key: "category", kind: "select", label: "Category", optionsSource: "categories" },
      { key: "brandId", kind: "select", label: "Brand", optionsSource: "brands" },
    ],
    views: [
      { id: "detailed", label: "Detailed" },
      { id: "by-category", label: "By Category" },
      { id: "by-brand", label: "By Brand" },
    ],
  },
  "sell-payment": {
    filters: [
      { key: "customerId", kind: "select", label: "Customer", optionsSource: "customers" },
      LOCATION_FILTER,
      {
        key: "paymentMethod",
        kind: "select",
        label: "Payment Method",
        optionsSource: "paymentMethods",
      },
      {
        key: "customerGroupId",
        kind: "select",
        label: "Customer Group",
        optionsSource: "customerGroups",
      },
      {
        key: "search",
        kind: "search",
        label: "Search",
        placeholder: "Reference / customer / sale",
      },
    ],
  },
  "product-purchase": {
    filters: [
      { key: "supplierId", kind: "select", label: "Supplier", optionsSource: "suppliers" },
      LOCATION_FILTER,
      { key: "category", kind: "select", label: "Category", optionsSource: "categories" },
      { key: "brandId", kind: "select", label: "Brand", optionsSource: "brands" },
      {
        key: "search",
        kind: "search",
        label: "Search",
        placeholder: "SKU / product / reference",
      },
    ],
  },
  "purchase-payment": {
    filters: [
      { key: "supplierId", kind: "select", label: "Supplier", optionsSource: "suppliers" },
      LOCATION_FILTER,
      {
        key: "paymentMethod",
        kind: "select",
        label: "Payment Method",
        optionsSource: "paymentMethods",
      },
      {
        key: "search",
        kind: "search",
        label: "Search",
        placeholder: "Reference / supplier",
      },
    ],
  },
  items: {
    filters: [
      { key: "supplierId", kind: "select", label: "Supplier", optionsSource: "suppliers" },
      { key: "customerId", kind: "select", label: "Customer", optionsSource: "customers" },
      LOCATION_FILTER,
      SEARCH_PRODUCT,
    ],
  },
  stock: {
    filters: [
      LOCATION_FILTER,
      { key: "category", kind: "select", label: "Category", optionsSource: "categories" },
      { key: "brandId", kind: "select", label: "Brand", optionsSource: "brands" },
      SEARCH_PRODUCT,
    ],
  },
  trending: {
    filters: [
      LOCATION_FILTER,
      { key: "category", kind: "select", label: "Category", optionsSource: "categories" },
      SEARCH_PRODUCT,
    ],
  },
  expense: {
    filters: [
      LOCATION_FILTER,
      {
        key: "search",
        kind: "search",
        label: "Search",
        placeholder: "Category / description",
      },
    ],
  },
  "customer-groups": {
    filters: [
      {
        key: "customerGroupId",
        kind: "select",
        label: "Customer Group Name",
        optionsSource: "customerGroups",
      },
      LOCATION_FILTER,
    ],
  },
};

export function emptyReportFilters(): ReportRunOptions {
  return {
    search: "",
    customerId: "",
    customerGroupId: "",
    locationCode: "",
    category: "",
    brandId: "",
    paymentMethod: "",
    supplierId: "",
    view: "detailed",
  };
}

/** Default rows-per-page for report tables (server + client). */
export const TABLE_REPORT_PAGE_SIZE = 10;

/** Strip empty filter values before sending to the API. */
export function compactReportFilters(
  filters: ReportRunOptions,
): ReportRunOptions {
  const out: ReportRunOptions = {};
  if (filters.cursor) out.cursor = filters.cursor;
  if (filters.limit != null) out.limit = filters.limit;
  if (filters.search?.trim()) out.search = filters.search.trim();
  if (filters.customerId) out.customerId = filters.customerId;
  if (filters.customerGroupId) out.customerGroupId = filters.customerGroupId;
  if (filters.locationCode) out.locationCode = filters.locationCode;
  if (filters.category) out.category = filters.category;
  if (filters.brandId) out.brandId = filters.brandId;
  if (filters.paymentMethod) out.paymentMethod = filters.paymentMethod;
  if (filters.supplierId) out.supplierId = filters.supplierId;
  if (filters.view && filters.view !== "detailed") out.view = filters.view;
  else if (filters.view === "detailed") out.view = "detailed";
  return out;
}
