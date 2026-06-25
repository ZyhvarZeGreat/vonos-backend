"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Brand, ProductCategory, ProductUnit, SellingPriceGroup, Warranty } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { getCatalogMeta, type CatalogMetaKind } from "@/lib/api/catalogMeta";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

interface MetaRow {
  id: string;
  name: string;
  extra?: string;
}

const KIND_LABELS: Record<CatalogMetaKind, string> = {
  categories: "Categories",
  brands: "Brands",
  units: "Units",
  warranties: "Warranties",
  "price-groups": "Selling price groups",
};

function toMetaRows(
  kind: CatalogMetaKind,
  data: ProductCategory[] | Brand[] | ProductUnit[] | Warranty[] | SellingPriceGroup[],
): MetaRow[] {
  switch (kind) {
    case "categories":
      return (data as ProductCategory[]).map((row) => ({
        id: row.id,
        name: row.name,
        extra: row.shortCode ?? row.categoryType ?? row.description ?? undefined,
      }));
    case "brands":
      return (data as Brand[]).map((row) => ({
        id: row.id,
        name: row.name,
        extra: row.description ?? undefined,
      }));
    case "units":
      return (data as ProductUnit[]).map((row) => ({
        id: row.id,
        name: row.name,
        extra: row.shortName,
      }));
    case "warranties":
      return (data as Warranty[]).map((row) => ({
        id: row.id,
        name: row.name,
        extra: `${row.duration} ${row.durationType}`,
      }));
    case "price-groups":
      return (data as SellingPriceGroup[]).map((row) => ({
        id: row.id,
        name: row.name,
        extra: row.isActive ? "Active" : "Inactive",
      }));
    default:
      return [];
  }
}

const metaColumns: ColumnConfig<MetaRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
  },
  {
    key: "extra",
    header: "Details",
    render: (row) => row.extra ?? "—",
  },
];

export function ProductMetaPanel({ kind }: { kind: CatalogMetaKind }) {
  const tenantId = useTenantId();

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["catalog-meta", tenantId, kind],
    queryFn: async () => {
      if (!tenantId) return [];
      return getCatalogMeta(tenantId, kind);
    },
    enabled: Boolean(tenantId),
  });

  const rows = useMemo(() => toMetaRows(kind, data), [data, kind]);

  return (
    <div className="space-y-2">
      <p className="px-1 text-sm text-muted">
        {KIND_LABELS[kind]} from your migrated catalog — manage on this page instead of a separate route.
      </p>
      <DataTable
        embedded
        data={rows}
        columns={metaColumns}
        displayMode="table"
        isLoading={isLoading}
        error={error ? `Failed to load ${KIND_LABELS[kind].toLowerCase()}` : null}
        emptyState={{ message: `No ${KIND_LABELS[kind].toLowerCase()} yet.` }}
      />
    </div>
  );
}

export type ProductSectionId =
  | "products"
  | "categories"
  | "brands"
  | "units"
  | "warranties"
  | "price-groups";

export const PRODUCT_SECTION_TABS: { id: ProductSectionId; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "categories", label: "Categories" },
  { id: "brands", label: "Brands" },
  { id: "units", label: "Units" },
  { id: "warranties", label: "Warranties" },
  { id: "price-groups", label: "Price groups" },
];

export function sectionFromParams(value: string | null): ProductSectionId {
  if (value && PRODUCT_SECTION_TABS.some((tab) => tab.id === value)) {
    return value as ProductSectionId;
  }
  return "products";
}

export function isProductMetaSection(id: string): id is Exclude<ProductSectionId, "products"> {
  return id === "categories" || id === "brands" || id === "units" || id === "warranties" || id === "price-groups";
}
