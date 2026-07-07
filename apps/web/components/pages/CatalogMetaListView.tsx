"use client";

import { useMemo } from "react";
import type { Brand, ProductCategory, ProductUnit, SellingPriceGroup, Warranty } from "@vonos/types";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getCatalogMetaPage, type CatalogMetaKind } from "@/lib/api/catalogMeta";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useUiStore } from "@/stores/uiStore";

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
  "price-groups": "Selling Price Groups",
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

export function CatalogMetaListView({ kind }: { kind: CatalogMetaKind }) {
  const tenantId = useTenantId();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const label = KIND_LABELS[kind];

  const {
    items: data,
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
    queryKey: ["catalog-meta", tenantId, kind],
    enabled: Boolean(tenantId),
    fetchPage: async (cursor, limit) => {
      const page = await getCatalogMetaPage(tenantId!, kind, cursor, limit);
      return page;
    },
  });

  const rows = useMemo(
    () => toMetaRows(kind, data as ProductCategory[] | Brand[] | ProductUnit[] | Warranty[] | SellingPriceGroup[]),
    [data, kind],
  );

  const columns: ColumnConfig<MetaRow>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "extra", header: "Details", render: (r) => r.extra ?? "—" },
  ];

  return (
    <ListPageShell
      tabs={[{ id: "all", label: label }]}
      activeTab="all"
      onTabChange={() => {}}
      showImport={false}
      showDateRange={false}
      onExport={() =>
        openExportModal({
          title: `Export ${label}`,
          subtitle: "Download list as CSV",
        })
      }
    >
      <ServerPaginatedTable
        items={rows}
        columns={columns}
        pageIndex={pageIndex}
        pageSize={pageSize}
        hasMore={hasMore}
        canGoPrev={canGoPrev}
        onNext={goNext}
        onPrev={goPrev}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        error={error ? `Failed to load ${label.toLowerCase()}` : null}
        emptyState={{ message: `No ${label.toLowerCase()} imported yet.` }}
      />
    </ListPageShell>
  );
}
