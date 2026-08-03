"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Upload } from "lucide-react";
import type { LedgerEntry, LedgerSummary } from "@vonos/types";
import { FinanceActionBar } from "@/components/molecules/FinanceActionBar";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { KpiRow } from "@/components/organisms/KpiRow";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { PaginatedLedgerTable } from "@/components/organisms/PaginatedLedgerTable";
import { StatusPill } from "@/components/atoms/StatusPill";
import {
  getAllLedgerEntries,
  getLedgerCategories,
  getLedgerSummary,
} from "@/lib/api/ledger";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import {
  getVagViewUnit,
  type VagViewUnitId,
} from "@/lib/registries/vagViewUnits";
import { useAdminEntityStore } from "@/stores/adminEntityStore";
import { useReportRecordModals } from "@/lib/hooks/useReportRecordModals";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import {
  buildLedgerReportSections,
  flattenLedgerSectionsForExport,
} from "@/lib/utils/ledgerReportSheet";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useUiStore, type DateRangePreset } from "@/stores/uiStore";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/formatCurrency";
import type { ColumnConfig } from "@/components/organisms/DataTable";
import { tenantOverviewPath } from "@/lib/utils/authRedirect";
import { cn } from "@/lib/utils/cn";

const adminLedgerColumns: ColumnConfig<LedgerEntry>[] = [
  {
    key: "date",
    header: "Date",
    sortValue: (row) => new Date(row.date).getTime(),
  },
  {
    key: "type",
    header: "Type",
    render: (row) => (
      <StatusPill
        status={
          row.type === "revenue"
            ? "In Stock"
            : row.type === "cost"
              ? "Low Stock"
              : "Out of Stock"
        }
        vocabulary="stockStatus"
      />
    ),
  },
  { key: "category", header: "Category" },
  { key: "description", header: "Description" },
  {
    key: "amount",
    header: "Amount",
    sortValue: (row) => row.amount,
    render: (row) => (
      <span className={row.type === "revenue" ? "text-emerald-600" : "text-foreground"}>
        {row.type === "revenue" ? "+" : "−"}
        {formatCurrency(row.amount, row.currency)}
      </span>
    ),
  },
  {
    key: "linkedRecordId",
    header: "Source",
    render: (row) =>
      row.linkedRecordType && row.linkedRecordId ? (
        <span className="text-sm font-medium text-info">View record</span>
      ) : (
        <span className="text-sm text-muted">Manual</span>
      ),
  },
];

const adminFinanceKpiCards = [
  { label: "Revenue", icon: "trending-up" as const, metricKey: "revenue", color: "#059669" },
  { label: "Costs", icon: "trending-down" as const, metricKey: "costs", color: "#2563eb" },
  { label: "Net", icon: "wallet" as const, metricKey: "net", color: "#9333ea" },
  { label: "Outstanding", icon: "clock" as const, metricKey: "outstanding", color: "#e11d48" },
];

const LEDGER_TYPE_FILTERS = [
  { value: "revenue", label: "Revenue" },
  { value: "cost", label: "Cost" },
  { value: "expense", label: "Expense" },
];

function sumSummaries(rows: LedgerSummary[]): LedgerSummary {
  const currency = rows[0]?.currency ?? "NGN";
  return {
    revenue: rows.reduce((a, r) => a + r.revenue, 0),
    costs: rows.reduce((a, r) => a + r.costs, 0),
    net: rows.reduce((a, r) => a + r.net, 0),
    outstanding: rows.reduce((a, r) => a + r.outstanding, 0),
    currency,
  };
}

export interface AdminEntityFinanceSheetProps {
  unitId: VagViewUnitId;
}

/**
 * Entity finance while staying on /admin/finance.
 * Change entity via the Viewing switcher — no trip back to Group required.
 */
export function AdminEntityFinanceSheet({ unitId }: AdminEntityFinanceSheetProps) {
  const unit = getVagViewUnit(unitId);
  const setViewingCode = useAdminEntityStore((s) => s.setViewingCode);
  const openExportModal = useUiStore((state) => state.openExportModal);
  const {
    dateRange,
    setDateRange,
    bounds,
  } = useListPageFilters({
    defaultDateRange: "last_7_days",
    isolateDateRange: true,
    unboundedAllTime: false,
  });
  const {
    openReportRecord,
    modals: recordModals,
  } = useReportRecordModals({
    onBeforeOpen: () => setViewingCode(unitId),
  });

  const [ledgerCode, setLedgerCode] = useState<TenantCode>(unit.enterCode);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const periodLabel = ledgerChartSubtitle(dateRange);

  useEffect(() => {
    setLedgerCode(unit.enterCode);
    setSearch("");
    setTypeFilter("");
    setCategoryFilter("");
  }, [unit.id, unit.enterCode]);

  const tenantIds = useMemo(() => {
    const ids: string[] = [];
    for (const code of unit.tenantCodes) {
      const id = getTenantByCode(code)?.tenantId;
      if (id) ids.push(id);
    }
    return ids;
  }, [unit.tenantCodes]);

  const summaryQuery = useQuery({
    queryKey: ["adminFinanceSummary", unitId, ...tenantIds, bounds?.from, bounds?.to],
    queryFn: async () => {
      const rows = await Promise.all(
        tenantIds.map((id) => getLedgerSummary(id, bounds?.from, bounds?.to)),
      );
      return sumSummaries(rows);
    },
    enabled: tenantIds.length > 0,
    staleTime: ADMIN_ENTITY_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const summary = summaryQuery.data;
  const ledgerTenant = getTenantByCode(ledgerCode);
  const ledgerTenantId = ledgerTenant?.tenantId;

  const categoriesQuery = useQuery({
    queryKey: [
      "adminFinanceCategories",
      ledgerTenantId,
      bounds?.from,
      bounds?.to,
    ],
    queryFn: () =>
      getLedgerCategories(ledgerTenantId!, bounds?.from, bounds?.to),
    enabled: Boolean(ledgerTenantId),
    staleTime: ADMIN_ENTITY_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const categoryOptions = useMemo(
    () => (categoriesQuery.data ?? []).map((c) => ({ value: c, label: c })),
    [categoriesQuery.data],
  );

  const ledgerFilters = [
    {
      id: "type",
      label: "Type",
      value: typeFilter,
      onChange: setTypeFilter,
      options: LEDGER_TYPE_FILTERS,
    },
    {
      id: "category",
      label: "Category",
      value: categoryFilter,
      onChange: setCategoryFilter,
      options: categoryOptions,
    },
  ];

  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRange(preset);
  };

  const handleExport = async () => {
    if (!summary || tenantIds.length === 0) return;
    const entryLists = await Promise.all(
      tenantIds.map((id) =>
        getAllLedgerEntries(id, {
          from: bounds?.from,
          to: bounds?.to,
          type: typeFilter
            ? (typeFilter as LedgerEntry["type"])
            : undefined,
          category: categoryFilter || undefined,
        }),
      ),
    );
    const entries = entryLists.flat();
    const sections = buildLedgerReportSections(entries);
    openExportModal(
      {
        title: `Export P&L — ${unit.name}`,
        subtitle: periodLabel,
      },
      {
        filename: `finance-${unitId.toLowerCase()}`,
        columns: [
          { key: "section", header: "Section" },
          { key: "category", header: "Category" },
          { key: "date", header: "Date" },
          { key: "description", header: "Description" },
          { key: "type", header: "Type" },
          { key: "amount", header: "Amount" },
          { key: "currency", header: "Currency" },
        ],
        rows: flattenLedgerSectionsForExport(sections, summary.currency),
      },
    );
  };

  const handleLineClick = (entry: LedgerEntry) => {
    if (!entry.linkedRecordType || !entry.linkedRecordId) return;
    setViewingCode(unitId);
    const recordType = entry.linkedRecordType;
    const recordId = entry.linkedRecordId;
    openReportRecord({
      id: recordId,
      recordType,
      ...(recordType === "sale" ? { saleId: recordId } : {}),
      ...(recordType === "item" ? { itemId: recordId } : {}),
      ...(recordType === "customer" ? { customerId: recordId } : {}),
    });
  };

  const financeCopy = hq6CopyForSlug("finance");

  return (
    <Hq6PageFrame
      title={`${financeCopy.title} — ${unit.name}`}
      subtitle={financeCopy.subtitle}
    >
      <div className="space-y-4">
        <div className="hq6-card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-[#111827]">
              Viewing: {unit.name} ({unit.badge}) · as Admin
            </p>
            <p className="mt-0.5 text-[#6b7280]">
              {unit.description
                ? `${unit.description}. KPIs are combined.`
                : "Scoped to this entity. Use Switch entity above to change — stay on Finance."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewingCode(null)}
              className="hq6-btn hq6-btn-outline"
            >
              All entities
            </button>
            {unit.tenantCodes.map((code) => (
              <a
                key={code}
                href={tenantOverviewPath(code)}
                className="hq6-btn hq6-btn-outline"
              >
                Open {code}
              </a>
            ))}
          </div>
        </div>

        <FinanceActionBar fixedTenantCode={unit.enterCode} />

        <div className="flex flex-wrap justify-end gap-2 print:hidden">
          <button
            type="button"
            className="hq6-btn hq6-btn-outline"
            onClick={() => void handleExport()}
            disabled={!summary}
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            className="hq6-btn hq6-btn-outline"
            onClick={() => window.print()}
          >
            <Printer className="mr-2 h-3.5 w-3.5" />
            Print
          </button>
        </div>

        <div data-print-root className="space-y-4">
          <div className="hq6-card px-4 py-3 print:border-0 print:shadow-none">
            <h2 className="text-base font-semibold text-[#111827]">
              Profit & Loss — {unit.name}
            </h2>
            <p className="mt-0.5 text-sm text-[#6b7280]">{periodLabel}</p>
          </div>

          <KpiRow
            cards={adminFinanceKpiCards}
            isLoading={summaryQuery.isLoading && !summary}
            loadingDisplay="zero-spinner"
            values={{
              revenue: summary
                ? formatCurrencyCompact(summary.revenue, summary.currency)
                : "0",
              costs: summary
                ? formatCurrencyCompact(summary.costs, summary.currency)
                : "0",
              net: summary
                ? formatCurrencyCompact(summary.net, summary.currency)
                : "0",
              outstanding: summary
                ? formatCurrencyCompact(summary.outstanding, summary.currency)
                : "0",
            }}
          />

          {unit.tenantCodes.length > 1 ? (
            <div className="hq6-tab-row">
              {unit.tenantCodes.map((code) => {
                const t = getTenantByCode(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLedgerCode(code);
                      setCategoryFilter("");
                    }}
                    className={cn(
                      "hq6-tab",
                      ledgerCode === code && "hq6-tab-active",
                    )}
                  >
                    {t?.name ?? code} ledger
                  </button>
                );
              })}
            </div>
          ) : null}

          {summaryQuery.error ? (
            <p className="text-sm text-error">Failed to load finance summary.</p>
          ) : (
            <ListPageShell
              tabs={[{ id: "all", label: "Ledger entries" }]}
              activeTab="all"
              onTabChange={() => {}}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search description, category…"
              showImport={false}
              showExport={false}
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              filterDropdowns={ledgerFilters}
              hq6PageChrome={false}
            >
              <PaginatedLedgerTable
                tenantId={ledgerTenantId}
                type={
                  typeFilter
                    ? (typeFilter as LedgerEntry["type"])
                    : undefined
                }
                category={categoryFilter || undefined}
                from={bounds?.from}
                to={bounds?.to}
                search={search}
                columns={adminLedgerColumns}
                onRowClick={handleLineClick}
                emptyState={{
                  message:
                    "No ledger entries for this period. Entries appear when sales, jobs, or manual expenses are recorded.",
                }}
              />
            </ListPageShell>
          )}
        </div>
      </div>
      {recordModals}
    </Hq6PageFrame>
  );
}
