import type {
  Brand,
  CreateBrandInput,
  CreateProductCategoryInput,
  CreateProductUnitInput,
  CreateSellingPriceGroupInput,
  CreateWarrantyInput,
  ProductCategory,
  ProductUnit,
  SellingPriceGroup,
  Warranty,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

export type CatalogMetaKind = "categories" | "brands" | "units" | "warranties" | "price-groups";

export type CatalogMetaRow =
  | ProductCategory
  | Brand
  | ProductUnit
  | Warranty
  | SellingPriceGroup;

const ENDPOINTS: Record<CatalogMetaKind, string> = {
  categories: "/catalog-meta/categories",
  brands: "/catalog-meta/brands",
  units: "/catalog-meta/units",
  warranties: "/catalog-meta/warranties",
  "price-groups": "/catalog-meta/price-groups",
};

async function fetchCatalogMetaRaw(
  tenantId: string,
  kind: CatalogMetaKind,
  cursor?: string,
  limit?: number,
): Promise<CatalogMetaRow[]> {
  const tenantPath = withTenantQuery(ENDPOINTS[kind], tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${kind}`);
  return response.json();
}

export async function getCatalogMetaPage(
  tenantId: string,
  kind: CatalogMetaKind,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { includeSummary?: boolean },
): Promise<ListPage<CatalogMetaRow>> {
  return fetchTenantListPage(ENDPOINTS[kind], tenantId, cursor, limit, {
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function getCatalogCategoriesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<ProductCategory>> {
  return fetchTenantListPage(ENDPOINTS.categories, tenantId, cursor, limit);
}

export async function getCatalogBrandsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<Brand>> {
  return fetchTenantListPage(ENDPOINTS.brands, tenantId, cursor, limit);
}

export async function getCatalogUnitsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<ProductUnit>> {
  return fetchTenantListPage(ENDPOINTS.units, tenantId, cursor, limit);
}

export async function getCatalogWarrantiesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<Warranty>> {
  return fetchTenantListPage(ENDPOINTS.warranties, tenantId, cursor, limit);
}

export async function getCatalogPriceGroupsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<SellingPriceGroup>> {
  return fetchTenantListPage(ENDPOINTS["price-groups"], tenantId, cursor, limit);
}

/** Full catalog meta list for export — not for table rendering. */
export async function getAllCatalogMeta(
  tenantId: string,
  kind: CatalogMetaKind,
): Promise<CatalogMetaRow[]> {
  return fetchAllPages(
    (cursor, limit) => fetchCatalogMetaRaw(tenantId, kind, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getCatalogMeta(
  tenantId: string,
  kind: CatalogMetaKind,
): Promise<ProductCategory[] | Brand[] | ProductUnit[] | Warranty[] | SellingPriceGroup[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchCatalogMetaRaw(tenantId, kind, cursor, limit),
  ) as Promise<
    ProductCategory[] | Brand[] | ProductUnit[] | Warranty[] | SellingPriceGroup[]
  >;
}

export type CreateCatalogMetaInput =
  | CreateProductCategoryInput
  | CreateBrandInput
  | CreateProductUnitInput
  | CreateWarrantyInput
  | CreateSellingPriceGroupInput;

export async function createCatalogMeta(
  tenantId: string,
  kind: CatalogMetaKind,
  body: CreateCatalogMetaInput,
): Promise<CatalogMetaRow> {
  const response = await apiFetch(withTenantQuery(ENDPOINTS[kind], tenantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(err?.message ?? `Failed to create ${kind}`);
  }
  return response.json();
}

export async function updateCatalogMeta(
  tenantId: string,
  kind: CatalogMetaKind,
  id: string,
  body: Record<string, unknown>,
): Promise<CatalogMetaRow> {
  const response = await apiFetch(
    withTenantQuery(`${ENDPOINTS[kind]}/${id}`, tenantId),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(err?.message ?? `Failed to update ${kind}`);
  }
  return response.json();
}

export async function deleteCatalogMeta(
  tenantId: string,
  kind: CatalogMetaKind,
  id: string,
): Promise<void> {
  const response = await apiFetch(
    withTenantQuery(`${ENDPOINTS[kind]}/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(err?.message ?? `Failed to delete ${kind}`);
  }
}
