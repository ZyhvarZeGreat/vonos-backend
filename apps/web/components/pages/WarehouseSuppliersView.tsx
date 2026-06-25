"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Star } from "lucide-react";
import type { KpiCardConfig } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { KpiRow } from "@/components/organisms/KpiRow";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getSupplierKpis, getSuppliers, type SupplierListRow } from "@/lib/api/suppliers";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { filterBySearch, uniqueFieldOptions } from "@/lib/utils/listFilters";

const SUPPLIER_TABS = [
  { id: "all", label: "All Suppliers" },
  { id: "packaging", label: "Packaging" },
  { id: "automotive", label: "Automotive" },
  { id: "active", label: "Active POs" },
];

const supplierKpiCards: KpiCardConfig[] = [
  { label: "Total Suppliers", icon: "package", metricKey: "totalSuppliers", color: "#059669" },
  { label: "On Time Rate", icon: "arrow-up", metricKey: "onTimeRate", color: "#2563eb" },
  { label: "AVG Lead Time", icon: "calculator", metricKey: "avgLeadTime", color: "#9333ea" },
  { label: "Open PO Value", icon: "wallet", metricKey: "openPoValue", color: "#e11d48" },
];

const columns: ColumnConfig<SupplierListRow>[] = [
  {
    key: "name",
    header: "Supplier",
    render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
  },
  { key: "phone", header: "No. Telp" },
  { key: "category", header: "Category" },
  {
    key: "leadTimeDays",
    header: "Lead Time",
    sortValue: (row) => row.leadTimeDays,
    render: (row) => `${row.leadTimeDays} days`,
  },
  { key: "location", header: "Location" },
  {
    key: "rating",
    header: "Rating",
    sortValue: (row) => row.rating,
    render: (row) => (
      <span className="inline-flex items-center gap-1 text-foreground">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        {row.rating.toFixed(1)}
      </span>
    ),
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
];

export function WarehouseSuppliersView() {
  const { goToDetail } = useRecordNavigation("suppliers");
  const [activeTab, setActiveTab] = useState("all");
  const { dateRange, setDateRange, search, setSearch } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");

  const suppliersQuery = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  });
  const kpisQuery = useQuery({
    queryKey: ["supplierKpis"],
    queryFn: getSupplierKpis,
  });
  const kpis = kpisQuery.data;
  const suppliers = suppliersQuery.data ?? [];

  const filtered = useMemo(() => {
    let rows = suppliers;
    if (activeTab === "packaging") {
      rows = rows.filter((row) => row.category.toLowerCase() === "packaging");
    } else if (activeTab === "automotive") {
      rows = rows.filter((row) => row.category.toLowerCase() === "automotive");
    }
    if (categoryFilter) rows = rows.filter((row) => row.category === categoryFilter);
    return filterBySearch(rows, search, ["name", "category", "phone", "location"]);
  }, [activeTab, categoryFilter, search, suppliers]);

  const categoryOptions = useMemo(
    () => uniqueFieldOptions(suppliers, "category"),
    [suppliers],
  );

  return (
    <div className="space-y-6">
      <KpiRow
        cards={supplierKpiCards}
        isLoading={kpisQuery.isLoading && !kpis}
        values={{
          totalSuppliers: kpis ? formatNumberCompact(kpis.totalSuppliers) : "—",
          onTimeRate: kpis ? `${kpis.onTimeRate}%` : "—",
          avgLeadTime: kpis ? `${kpis.avgLeadTimeDays} days` : "—",
          openPoValue: kpis
            ? formatCurrencyCompact(kpis.openPoValue, kpis.currency)
            : "—",
        }}
      />
      <ListPageShell
        tabs={SUPPLIER_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchPlaceholder="Search Suppliers"
        searchValue={search}
        onSearchChange={setSearch}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange={false}
        filterDropdowns={[
          {
            id: "category",
            label: "Category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions,
          },
        ]}
      >
        <DataTable
          embedded
          data={filtered}
          columns={columns}
          displayMode="table"
          onRowClick={(row) => goToDetail(row.id)}
          isLoading={suppliersQuery.isLoading}
          error={suppliersQuery.error ? "Failed to load suppliers" : null}
        />
      </ListPageShell>
    </div>
  );
}
