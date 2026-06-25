"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import type { KpiCardConfig, LedgerEntry, LedgerEntitySummary, LedgerListRow } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { FinanceActionBar } from "@/components/molecules/FinanceActionBar";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { PaginatedLedgerTable } from "@/components/organisms/PaginatedLedgerTable";
import { KpiRow } from "@/components/organisms/KpiRow";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  getAllLedgerEntries,
  getAllGroupLedgerEntries,
  getGroupLedgerByEntity,
  getGroupLedgerCategories,
  getGroupLedgerSummary,
  getLedgerCategories,
  getLedgerSummary,
} from "@/lib/api/ledger";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/formatCurrency";
import {
  ledgerCategoryBreakdown,
  ledgerChartSubtitle,
  ledgerPlTrend,
} from "@/lib/utils/ledgerCharts";
import { dateRangePresetToBounds, isWithinDateRange } from "@/lib/utils/dateRange";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import { useUiStore, type DateRangePreset } from "@/stores/uiStore";
import type { CsvExportPayload } from "@/lib/utils/exportCsv";

const FINANCE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "ledger", label: "Ledger" },
  { id: "analysis", label: "P&L Analysis" },
  { id: "expenses", label: "Expenses" },
];

const financeKpiCards: KpiCardConfig[] = [
  { label: "Revenue", icon: "trending-up", metricKey: "revenue", color: "#059669" },
  { label: "Costs", icon: "trending-down", metricKey: "costs", color: "#2563eb" },
  { label: "Net", icon: "wallet", metricKey: "net", color: "#9333ea" },
  { label: "Outstanding", icon: "clock", metricKey: "outstanding", color: "#e11d48" },
];

const ledgerColumns: ColumnConfig<LedgerEntry>[] = [
  {
    key: "date",
    header: "Date",
    sortValue: (row) => new Date(row.date).getTime(),
  },
  {
    key: "type",
    header: "Type",
    sortValue: (row) => row.type,
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

const groupLedgerColumns: ColumnConfig<LedgerListRow>[] = [
  {
    key: "tenantCode",
    header: "Entity",
    sortValue: (row) => row.tenantCode ?? "",
    render: (row) => (
      <span className="font-medium text-foreground">{row.tenantCode ?? "—"}</span>
    ),
  },
  ...ledgerColumns,
];

const entityFinanceColumns: ColumnConfig<LedgerEntitySummary & { id: string }>[] = [
  {
    key: "tenantCode",
    header: "Entity",
    sortValue: (row) => row.tenantCode,
    render: (row) => (
      <span className="font-medium text-foreground">{row.tenantCode}</span>
    ),
  },
  {
    key: "tenantName",
    header: "Department",
    sortValue: (row) => row.tenantName,
  },
  {
    key: "revenue",
    header: "Revenue",
    sortValue: (row) => row.revenue,
    render: (row) => formatCurrency(row.revenue, row.currency),
  },
  {
    key: "costs",
    header: "Costs",
    sortValue: (row) => row.costs,
    render: (row) => formatCurrency(row.costs, row.currency),
  },
  {
    key: "net",
    header: "Net",
    sortValue: (row) => row.net,
    render: (row) => (
      <span className={row.net >= 0 ? "text-emerald-600" : "text-error"}>
        {formatCurrency(row.net, row.currency)}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    render: (row) => (
      <span className="text-sm font-medium text-info">View finance →</span>
    ),
  },
];

export interface FinanceViewProps {
  /** VAG group roll-up across all entities (no tenant route segment). */
  groupMode?: boolean;
}

export function FinanceView({ groupMode = false }: FinanceViewProps) {
  const router = useRouter();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const openAddExpenseModal = useUiStore((state) => state.openAddExpenseModal);
  const dateRange = useUiStore((state) => state.dateRange);
  const setDateRange = useUiStore((state) => state.setDateRange);
  const { tenantId, tenantName, tenantCode } = useRouteTenant();
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const bounds = useMemo(() => dateRangePresetToBounds(dateRange), [dateRange]);

  const summaryQuery = useQuery({
    queryKey: ["ledgerSummary", groupMode ? "group" : tenantId, bounds?.from, bounds?.to],
    queryFn: () =>
      groupMode
        ? getGroupLedgerSummary(bounds?.from, bounds?.to)
        : getLedgerSummary(tenantId!, bounds?.from, bounds?.to),
    enabled: groupMode || Boolean(tenantId),
  });

  const chartsEnabled =
    (groupMode || Boolean(tenantId)) &&
    (activeTab === "overview" || activeTab === "analysis");

  const chartEntriesQuery = useQuery({
    queryKey: ["ledgerChartEntries", groupMode ? "group" : tenantId, bounds?.from, bounds?.to],
    queryFn: () =>
      groupMode
        ? getAllGroupLedgerEntries(bounds ? { from: bounds.from, to: bounds.to } : undefined)
        : getAllLedgerEntries(
            tenantId!,
            bounds ? { from: bounds.from, to: bounds.to } : undefined,
          ),
    enabled: chartsEnabled,
  });

  const categoriesQuery = useQuery({
    queryKey: ["ledgerCategories", groupMode ? "group" : tenantId, bounds?.from, bounds?.to],
    queryFn: () =>
      groupMode
        ? getGroupLedgerCategories(bounds?.from, bounds?.to)
        : getLedgerCategories(tenantId!, bounds?.from, bounds?.to),
    enabled: groupMode || Boolean(tenantId),
  });

  const entitySummaryQuery = useQuery({
    queryKey: ["ledgerByEntity", bounds?.from, bounds?.to],
    queryFn: () => getGroupLedgerByEntity(bounds?.from, bounds?.to),
    enabled: groupMode,
  });

  const entityRows = useMemo(
    (): Array<LedgerEntitySummary & { id: string }> =>
      (entitySummaryQuery.data ?? []).map((row) => ({
        ...row,
        id: row.tenantId,
      })),
    [entitySummaryQuery.data],
  );

  const summary = groupMode || tenantId ? summaryQuery.data : undefined;
  const chartEntries = chartEntriesQuery.data ?? [];

  const categories = useMemo(() => {
    return (categoriesQuery.data ?? []).map((c) => ({ value: c, label: c }));
  }, [categoriesQuery.data]);

  const chartScopedEntries = useMemo(
    () => chartEntries.filter((e) => isWithinDateRange(e.date, bounds)),
    [bounds, chartEntries],
  );

  const plTrend = useMemo(
    () => ledgerPlTrend(chartScopedEntries, { preset: dateRange, bounds }),
    [bounds, chartScopedEntries, dateRange],
  );
  const categoryBreakdown = useMemo(
    () => ledgerCategoryBreakdown(chartScopedEntries),
    [chartScopedEntries],
  );
  const chartSubtitle = ledgerChartSubtitle(dateRange);
  const formatChartValue = (value: number) =>
    formatCurrencyCompact(value, summary?.currency ?? "NGN");

  const chartsLoading = chartEntriesQuery.isLoading;
  const chartsError = chartEntriesQuery.error ? "Failed to load ledger data for charts." : null;

  const handleExport = async () => {
    let payload: CsvExportPayload;
    if (activeTab === "expenses") {
      const expenseRows = groupMode
        ? await getAllGroupLedgerEntries({
            type: "expense",
            from: bounds?.from,
            to: bounds?.to,
            search: search.trim() || undefined,
            category: categoryFilter || undefined,
          })
        : await getAllLedgerEntries(tenantId!, {
            type: "expense",
            from: bounds?.from,
            to: bounds?.to,
            search: search.trim() || undefined,
            category: categoryFilter || undefined,
          });
      payload = {
        filename: "expenses",
        columns: [
          { key: "date", header: "Date" },
          { key: "category", header: "Category" },
          { key: "description", header: "Description" },
          { key: "amount", header: "Amount" },
        ],
        rows: expenseRows.map((e) => ({
          date: e.date,
          category: e.category,
          description: e.description,
          amount: e.amount,
        })),
      };
    } else if (groupMode && activeTab === "overview") {
      payload = {
        filename: "finance-by-entity",
        columns: [
          { key: "tenantCode", header: "Entity" },
          { key: "revenue", header: "Revenue" },
          { key: "costs", header: "Costs" },
          { key: "net", header: "Net" },
        ],
        rows: entityRows.map((row) => ({
          tenantCode: row.tenantCode,
          revenue: row.revenue,
          costs: row.costs,
          net: row.net,
        })),
      };
    } else {
      const ledgerRows = groupMode
        ? await getAllGroupLedgerEntries({
            type: (typeFilter as LedgerEntry["type"]) || undefined,
            category: categoryFilter || undefined,
            from: bounds?.from,
            to: bounds?.to,
            search: search.trim() || undefined,
          })
        : await getAllLedgerEntries(tenantId!, {
            type: (typeFilter as LedgerEntry["type"]) || undefined,
            category: categoryFilter || undefined,
            from: bounds?.from,
            to: bounds?.to,
            search: search.trim() || undefined,
          });
      payload = {
        filename: `ledger-${activeTab}`,
        columns: [
          { key: "date", header: "Date" },
          { key: "type", header: "Type" },
          { key: "category", header: "Category" },
          { key: "description", header: "Description" },
          { key: "amount", header: "Amount" },
        ],
        rows: ledgerRows.map((e) => ({
          date: e.date,
          type: e.type,
          category: e.category,
          description: e.description,
          amount: e.amount,
        })),
      };
    }
    openExportModal(
      {
        title: "Export Finance Data",
        subtitle: `Export ${FINANCE_TABS.find((t) => t.id === activeTab)?.label ?? activeTab} as CSV`,
      },
      payload,
    );
  };

  const handleDateRangeChange = (preset: DateRangePreset) => {
    setDateRange(preset);
  };

  const handleLedgerRowClick = (row: LedgerEntry | LedgerListRow) => {
    const code =
      "tenantCode" in row && row.tenantCode ? row.tenantCode : tenantCode;
    if (!code) return;
    const path = recordDetailPath(code, row.linkedRecordType, row.linkedRecordId);
    if (path) router.push(path);
  };

  const handleEntityFinanceClick = (row: LedgerEntitySummary & { id: string }) => {
    if (groupMode) {
      router.push(`/admin/finance/${row.tenantCode}`);
      return;
    }
    router.push(`/${row.tenantCode}/finance`);
  };

  const ledgerFilters = [
    {
      id: "type",
      label: "Type",
      value: typeFilter,
      onChange: setTypeFilter,
      options: [
        { value: "revenue", label: "Revenue" },
        { value: "cost", label: "Cost" },
        { value: "expense", label: "Expense" },
      ],
    },
    {
      id: "category",
      label: "Category",
      value: categoryFilter,
      onChange: setCategoryFilter,
      options: categories,
    },
  ];

  return (
    <div className="space-y-6">
      {groupMode ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">Group roll-up</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
            Ledger totals and entries are summed across all entities. Internal transfer
            elimination between entities is not yet applied.
          </p>
        </div>
      ) : tenantName ? (
        <p className="text-sm text-muted">
          Finance for <span className="font-medium text-foreground">{tenantName}</span>
          {tenantCode ? ` (${tenantCode})` : null}
          {" · "}
          scoped to this entity only
        </p>
      ) : null}
      <FinanceActionBar groupMode={groupMode} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
          {FINANCE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Upload className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <DateRangeDropdown value={dateRange} onChange={handleDateRangeChange} />
          <KpiRow
            cards={financeKpiCards}
            isLoading={summaryQuery.isLoading && !summary}
            values={{
              revenue: summary
                ? formatCurrencyCompact(summary.revenue, summary.currency)
                : "—",
              costs: summary
                ? formatCurrencyCompact(summary.costs, summary.currency)
                : "—",
              net: summary ? formatCurrencyCompact(summary.net, summary.currency) : "—",
              outstanding: summary
                ? formatCurrencyCompact(summary.outstanding, summary.currency)
                : "—",
            }}
          />
          <ChartPanel
            title="Revenue vs Costs"
            subtitle={chartSubtitle}
            type="line"
            data={plTrend}
            hidePeriodControl
            isLoading={chartsLoading}
            error={chartsError}
            formatTooltipValue={(value) => formatChartValue(Number(value))}
            formatLegendValue={formatChartValue}
            series={[
              { name: "Revenue", dataKey: "revenue", color: "#059669" },
              { name: "Costs", dataKey: "costs", color: "#e11d48" },
            ]}
          />
          {groupMode ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-medium text-foreground">
                  By department
                </h3>
                <p className="text-sm text-muted">
                  Revenue, costs, and net for each entity. Click a row to open
                  that department&apos;s finance page.
                </p>
              </div>
              <DataTable
                data={entityRows}
                columns={entityFinanceColumns}
                displayMode="table"
                embedded
                isLoading={entitySummaryQuery.isLoading}
                error={
                  entitySummaryQuery.error
                    ? "Could not load department breakdown."
                    : null
                }
                onRowClick={handleEntityFinanceClick}
              />
            </div>
          ) : null}
        </div>
      )}

      {activeTab === "ledger" && (
        <ListPageShell
          tabs={[{ id: "all", label: "All Entries" }]}
          activeTab="all"
          onTabChange={() => {}}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search ledger..."
          showImport={false}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          filterDropdowns={ledgerFilters}
        >
          {groupMode ? (
            <PaginatedLedgerTable
              groupMode
              type={typeFilter ? (typeFilter as LedgerEntry["type"]) : undefined}
              category={categoryFilter || undefined}
              from={bounds?.from}
              to={bounds?.to}
              search={search}
              columns={groupLedgerColumns}
              onRowClick={handleLedgerRowClick}
            />
          ) : (
            <PaginatedLedgerTable
              tenantId={tenantId ?? undefined}
              type={typeFilter ? (typeFilter as LedgerEntry["type"]) : undefined}
              category={categoryFilter || undefined}
              from={bounds?.from}
              to={bounds?.to}
              search={search}
              columns={ledgerColumns}
              onRowClick={handleLedgerRowClick}
            />
          )}
        </ListPageShell>
      )}

      {activeTab === "analysis" && (
        <div className="space-y-6">
          <DateRangeDropdown value={dateRange} onChange={handleDateRangeChange} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartPanel
              title="Revenue vs Cost Over Time"
              subtitle={chartSubtitle}
              type="bar"
              data={plTrend}
              hidePeriodControl
              isLoading={chartsLoading}
              error={chartsError}
              formatTooltipValue={(value) => formatChartValue(Number(value))}
              formatLegendValue={formatChartValue}
              series={[
                { name: "Revenue", dataKey: "revenue", color: "#059669" },
                { name: "Costs", dataKey: "costs", color: "#93c5fd" },
              ]}
            />
            <ChartPanel
              title="Category Breakdown"
              subtitle={
                groupMode
                  ? "Revenue by category (all entities)"
                  : "Revenue by category (this entity)"
              }
              type="pie"
              data={categoryBreakdown}
              hidePeriodControl
              isLoading={chartsLoading}
              error={chartsError}
              formatTooltipValue={(value) => formatChartValue(Number(value))}
              formatLegendValue={formatChartValue}
              series={[{ name: "Revenue", dataKey: "value", color: "#9333ea" }]}
            />
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="space-y-4">
          {!groupMode ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => openAddExpenseModal()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          ) : null}
          <ListPageShell
            tabs={[{ id: "all", label: "All Expenses" }]}
            activeTab="all"
            onTabChange={() => {}}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search expenses..."
            showImport={false}
            showExport={false}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            filterDropdowns={[
              {
                id: "category",
                label: "Category",
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: categories,
              },
            ]}
          >
            {groupMode ? (
              <PaginatedLedgerTable
                groupMode
                type="expense"
                category={categoryFilter || undefined}
                from={bounds?.from}
                to={bounds?.to}
                search={search}
                columns={groupLedgerColumns}
                onRowClick={handleLedgerRowClick}
                emptyState={{
                  message: "No expenses recorded across entities for this period.",
                }}
              />
            ) : (
              <PaginatedLedgerTable
                tenantId={tenantId ?? undefined}
                type="expense"
                category={categoryFilter || undefined}
                from={bounds?.from}
                to={bounds?.to}
                search={search}
                columns={ledgerColumns}
                onRowClick={handleLedgerRowClick}
                emptyState={{
                  message: "No manual expenses recorded yet.",
                  ctaLabel: "Add Expense",
                  onCta: openAddExpenseModal,
                }}
              />
            )}
          </ListPageShell>
        </div>
      )}
    </div>
  );
}
