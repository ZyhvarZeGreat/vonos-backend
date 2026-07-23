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
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { Hq6SuppliersListView } from "@/components/pages/Hq6SuppliersListView";
import { formatCurrencyCompact, formatNumberCompact } from "@/lib/utils/formatCurrency";
import { uniqueFieldOptions } from "@/lib/utils/listFilters";
import { formatDate } from "@/lib/utils/formatDate";
import { nameListCursor } from "@/lib/utils/pagination";

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
  onPurchases: (id: string) => void,
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
            {
              id: "purchases",
              label: "Purchases",
              onClick: () => onPurchases(row.id),
            },
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
  const isHq6 = useIsVaHq6();
  if (isHq6) return <Hq6SuppliersListView />;
  return <WarehouseSuppliersViewBody />;
}

function WarehouseSuppliersViewBody() {
  const { tenantCode } = useRouteTenant();
  const isHq6 = false;
  const router = useRouter();
  const tenantId = useTenantId();
  const { goToDetail, detailPath } = useRecordNavigation("suppliers");
  const [activeTab, setActiveTab] = useState("all");
  const { dateRange, setDateRange, search, setSearch } = useListPageFilters();
  const [categoryFilter, setCategoryFilter] = useState("");
  const [purchaseDue, setPurchaseDue] = useState(false);
  const [purchaseReturn, setPurchaseReturn] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [ledgerSupplierId, setLedgerSupplierId] = useState<string | null>(null);
  const [ledgerSupplierName, setLedgerSupplierName] = useState("");

  const { summary, ledger, isLoading: ledgerLoading } = useContactLedgerQuery(
    async () => {
      const summary = await getSupplierSummary(tenantId!, ledgerSupplierId!);
      const ledger = await getSupplierLedger(tenantId!, ledgerSupplierId!);
      return { summary, ledger };
    },
    isHq6 ? null : ledgerSupplierId,
    "supplier-ledger",
  );

  const hq6ApiFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      purchaseDue: purchaseDue || undefined,
      purchaseReturn: purchaseReturn || undefined,
      advanceBalance: advanceBalance || undefined,
      openingBalance: openingBalance || undefined,
      status: (statusFilter || (activeTab === "active" ? "active" : undefined)) as
        | "active"
        | "inactive"
        | undefined,
    }),
    [
      activeTab,
      advanceBalance,
      openingBalance,
      purchaseDue,
      purchaseReturn,
      search,
      statusFilter,
    ],
  );

  const {
    items: suppliers,
    hasMore,
    totalCount,
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
    filters: isHq6
      ? hq6ApiFilters
      : {
          category: categoryFilter || undefined,
          tab: activeTab,
        },
    fetchPage: (cursor, limit, _sort, opts) =>
      getSuppliersPage(tenantId!, cursor, limit, {
        ...(isHq6
          ? hq6ApiFilters
          : {
              search: search.trim() || undefined,
              status: activeTab === "active" ? "active" : undefined,
            }),
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
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
          if (isHq6) {
            router.push(`${detailPath(id)}?view=ledger`);
            return;
          }
          setLedgerSupplierId(id);
          setLedgerSupplierName(name);
        },
        (id) => {
          if (isHq6) {
            router.push(`${detailPath(id)}?view=purchases`);
            return;
          }
          router.push(`/${tenantCode}/inbound`);
        },
        router,
      ),
    [detailPath, goToDetail, isHq6, router, tenantCode],
  );

  // Category is not a real DB field yet (API returns "General") — don't
  // client-filter the current page or pagination breaks. Active tab is server-side.
  const filtered = suppliers;

  const categoryOptions = useMemo(
    () => uniqueFieldOptions(suppliers, "category"),
    [suppliers],
  );

  return (
    <div className="space-y-6">
      {!isHq6 ? (
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
      ) : null}
      <ListPageShell
        tabs={isHq6 ? [{ id: "all", label: "All Suppliers" }] : SUPPLIER_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search suppliers…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showDateRange={!isHq6}
        filterCheckboxes={
          isHq6
            ? [
                {
                  id: "purchaseDue",
                  label: "Purchase Due",
                  checked: purchaseDue,
                  onChange: setPurchaseDue,
                },
                {
                  id: "purchaseReturn",
                  label: "Purchase Return",
                  checked: purchaseReturn,
                  onChange: setPurchaseReturn,
                },
                {
                  id: "advanceBalance",
                  label: "Advance Balance",
                  checked: advanceBalance,
                  onChange: setAdvanceBalance,
                },
                {
                  id: "openingBalance",
                  label: "Opening Balance",
                  checked: openingBalance,
                  onChange: setOpeningBalance,
                },
              ]
            : undefined
        }
        filterDropdowns={
          isHq6
            ? [
                {
                  id: "status",
                  label: "Status",
                  options: [
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ],
                  value: statusFilter,
                  onChange: setStatusFilter,
                },
              ]
            : [
                {
                  id: "category",
                  label: "Category",
                  options: [{ value: "", label: "All categories" }, ...categoryOptions],
                  value: categoryFilter,
                  onChange: setCategoryFilter,
                },
              ]
        }
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
          totalCount={totalCount}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error ? "Failed to load suppliers" : null}
          onRowClick={(row) => goToDetail(row.id)}
          emptyState={{ message: "No suppliers yet. Add your first supplier to get started." }}
        />
      </ListPageShell>
      {!isHq6 ? (
        <ContactLedgerModal
          open={Boolean(ledgerSupplierId)}
          onClose={() => setLedgerSupplierId(null)}
          title={`${ledgerSupplierName} — Ledger`}
          summary={summary}
          ledger={ledger}
          isLoading={ledgerLoading}
        />
      ) : null}
    </div>
  );
}
