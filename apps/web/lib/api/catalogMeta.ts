import type { Brand, ProductCategory, ProductUnit, SellingPriceGroup, Warranty } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";

export type CatalogMetaKind = "categories" | "brands" | "units" | "warranties" | "price-groups";

const ENDPOINTS: Record<CatalogMetaKind, string> = {
  categories: "/catalog-meta/categories",
  brands: "/catalog-meta/brands",
  units: "/catalog-meta/units",
  warranties: "/catalog-meta/warranties",
  "price-groups": "/catalog-meta/price-groups",
};

export async function getCatalogMeta(
  tenantId: string,
  kind: CatalogMetaKind,
): Promise<ProductCategory[] | Brand[] | ProductUnit[] | Warranty[] | SellingPriceGroup[]> {
  const path = withTenantQuery(ENDPOINTS[kind], tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error(`Failed to fetch ${kind}`);
  return response.json();
}
