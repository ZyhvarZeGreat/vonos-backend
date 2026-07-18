"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { KpiCardConfig } from "@vonos/types";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { KpiRow } from "@/components/organisms/KpiRow";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { ContactLedgerModal, useContactLedgerQuery } from "@/components/organisms/ContactLedgerModal";
import { RowActionsMenu } from "@/components/molecules/RowActionsMenu";
import { getSupplierKpis, getSupplierLedger, getSupplierSummary, getSuppliersPage, type SupplierListRow } from "@/lib/api/suppliers";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { uniqueFieldOptions } from "@/lib/utils/listFilters";
import { formatDate } from "@/lib/utils/formatDate";

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

function supplierColumns(
  tenantCode: string,
  onView: (id: string) => void,
  onLedger: (id: string, name: string) => void,
  router: ReturnType<typeof useRouter>,
): ColumnConfig<SupplierListRow>[] {
  return [
    {
      key: "actions",
      header: "Action",
      sortable: false,
      render: (row) => (
        <RowActionsMenu
          actions={[
            { id: "view", label: "View", onClick: () => onView(row.id) },
            {
              id: "pay",
              label: "Pay",
              onClick: () => router.push(`/${tenantCode}/payments?supplierId=${row.id}`),
            },
            {
              id: "ledger",
              label: "Ledger",
              onClick: () => onLedger(row.id, row.businessName ?? row.name),
            },
            { id: "purchases", label: "Purchases", onClick: () => router.push(`/${tenantCode}/inbound`) },
          ]}
        />
      ),
    },
    { key: "contactId", header: "Contact ID", render: (r) => r.contactId ?? "—" },
    { key: "businessName", header: "Business Name", render: (r) => <span className="font-medium">{r.businessName ?? r.name}</span> },
    { key: "contactName", header: "Name", render: (r) => r.contactName ?? "—" },
    { key: "email", header: "Email", render: (r) => r.email ?? "—" },
    { key: "phone", header: "Mobile", render: (r) => r.phone ?? "—" },
    { key: "payTerm", header: "Pay term", render: (r) => r.payTerm ?? "—" },
    {
      key: "openingBalance",
      header: "Opening Balance",
      sortValue: (r) => r.openingBalance ?? 0,
      render: (r) => formatCurrencyCompact(r.openingBalance ?? 0, "NGN"),
    },
    {
      key: "totalPurchase",
      header: "Total Purchase",
      sortValue: (r) => r.totalPurchase ?? 0,
      render: (r) => formatCurrencyCompact(r.totalPurchase ?? 0, "NGN"),
    },
    {
      key: "totalPurchaseDue",
      header: "Purchase Due",
      sortValue: (r) => r.totalPurchaseDue ?? 0,
      render: (r) => formatCurrencyCompact(r.totalPurchaseDue ?? 0, "NGN"),
    },
    {
      key: "totalPurchasePaid",
      header: "Purchase Paid",
      sortValue: (r) => r.totalPurchasePaid ?? 0,
      render: (r) => formatCurrencyCompact(r.totalPurchasePaid ?? 0, "NGN"),
    },
    { key: "createdAt", header: "Added On", sortValue: (r) => new Date(r.createdAt).getTime(), render: (r) => formatDate(r.createdAt) },
  ];
}

export function WarehouseSuppliersView() {
  const { tenantCode } = useRouteTenant();
  const router = useRouter();
  const tenantId = useTenantId();
  const { goToDetail } = useRecordNavigation("suppliers");
  const [activeTab, setActiveTab] = useState("all");
  const { dateRange, setDateRange, search, setSearch } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [ledgerSupplierId, setLedgerSupplierId] = useState<string | null>(null);
  const [ledgerSupplierName, setLedgerSupplierName] = useState("");

  const { summary, ledger, isLoading: ledgerLoading } = useContactLedgerQuery(
    () => getSupplierSummary(tenantId!, ledgerSupplierId!),
    () => getSupplierLedger(tenantId!, ledgerSupplierId!),
    ledgerSupplierId,
    "supplier-ledger",
  );

  const {
    items: suppliers,
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
  } = useServerListPage<SupplierListRow>({
    queryKey: ["suppliers", tenantId],
    enabled: Boolean(tenantId),
    search,
    filters: {
      category: categoryFilter || undefined,
      tab: activeTab,
    },
    fetchPage: (cursor, limit) =>
      getSuppliersPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
        status: activeTab === "active" ? "active" : undefined,
      }),
  });

  const kpisQuery = useQuery({
    queryKey: ["supplierKpis", tenantId],
    queryFn: () => getSupplierKpis(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const kpis = kpisQuery.data;

  const columns = useMemo(
    () =>
      supplierColumns(
        tenantCode ?? "VW",
        goToDetail,
        (id, name) => {
          setLedgerSupplierId(id);
          setLedgerSupplierName(name);
        },
        router,
      ),
    [tenantCode, goToDetail, router],
  );

  const filtered = useMemo(() => {
    let rows = suppliers;
    if (activeTab === "packaging") {
      rows = rows.filter((row) => row.category.toLowerCase() === "packaging");
    } else if (activeTab === "automotive") {
      rows = rows.filter((row) => row.category.toLowerCase() === "automotive");
    }
    if (categoryFilter) rows = rows.filter((row) => row.category === categoryFilter);
    return rows;
  }, [activeTab, categoryFilter, suppliers]);

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
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search suppliers…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterDropdowns={[
          {
            id: "category",
            label: "Category",
            options: [{ value: "", label: "All categories" }, ...categoryOptions],
            value: categoryFilter,
            onChange: setCategoryFilter,
          },
        ]}
      >
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
          onPageSelect={goToPage}
          canSelectPage={canSelectPage}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error ? "Failed to load suppliers" : null}
          onRowClick={(row) => goToDetail(row.id)}
          emptyState={{ message: "No suppliers yet. Add your first supplier to get started." }}
        />
      </ListPageShell>
      <ContactLedgerModal
        open={Boolean(ledgerSupplierId)}
        onClose={() => setLedgerSupplierId(null)}
        title={`${ledgerSupplierName} — Ledger`}
        summary={summary}
        ledger={ledger}
        isLoading={ledgerLoading}
      />
    </div>
  );
}
