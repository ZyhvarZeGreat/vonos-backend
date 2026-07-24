"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Package,
  Receipt,
  RotateCcw,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { MenuSelect } from "@/components/molecules/MenuSelect";
import { Spinner } from "@/components/atoms/Spinner";
import {
  getVaHq6Home,
  getPurchasePaymentDuesPanel,
  getSalesPaymentDuesPanel,
  getStockAlertPanel,
} from "@/lib/api/overview";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useAuthStore } from "@/stores/authStore";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { formatCurrencyCompact } from "@/lib/utils/formatCurrency";
import type { OverviewPanel, ReportsKpi } from "@vonos/types";

const STAT_ICONS: Record<string, typeof Wallet> = {
  revenue: Wallet,
  totalSale: Wallet,
  net: Banknote,
  invoiceDue: AlertTriangle,
  sellReturn: RotateCcw,
  purchase: ShoppingCart,
  purchaseDue: ArrowDownCircle,
  purchaseReturn: Package,
  expense: Receipt,
  costs: ArrowUpCircle,
};

function statIcon(metricKey: string) {
  return STAT_ICONS[metricKey] ?? Wallet;
}

function Hq6StatCard({
  kpi,
  isLoading = false,
}: {
  kpi: ReportsKpi;
  isLoading?: boolean;
}) {
  const Icon = statIcon(kpi.metricKey);
  return (
    <div className="hq6-stat-card" aria-busy={isLoading || undefined}>
      <div
        className="hq6-stat-icon"
        style={{
          background: `${kpi.color ?? "#3b82f6"}18`,
          color: kpi.color ?? "#3b82f6",
        }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="hq6-stat-label">{kpi.label}</p>
        {isLoading ? (
          <div className="mt-1 flex items-baseline gap-2">
            <p className="hq6-stat-value">0</p>
            <Spinner size="sm" className="text-muted" />
          </div>
        ) : (
          <p className="hq6-stat-value">
            {kpi.currency
              ? formatHq6Currency(kpi.value, kpi.currency)
              : String(kpi.value)}
          </p>
        )}
      </div>
    </div>
  );
}

const HQ6_PLACEHOLDER_KPIS: ReportsKpi[] = [
  {
    label: "Total Sales",
    icon: "wallet",
    metricKey: "totalSale",
    color: "#3b82f6",
    value: 0,
    currency: "NGN",
  },
  {
    label: "Net",
    icon: "wallet",
    metricKey: "net",
    color: "#9333ea",
    value: 0,
    currency: "NGN",
  },
  {
    label: "Invoice due",
    icon: "alert",
    metricKey: "invoiceDue",
    color: "#f39c12",
    value: 0,
    currency: "NGN",
  },
  {
    label: "Total Sell Return",
    icon: "rotate",
    metricKey: "sellReturn",
    color: "#dd4b39",
    value: 0,
    currency: "NGN",
  },
  {
    label: "Total purchase",
    icon: "cart",
    metricKey: "purchase",
    color: "#00a65a",
    value: 0,
    currency: "NGN",
  },
  {
    label: "Purchase due",
    icon: "alert",
    metricKey: "purchaseDue",
    color: "#f39c12",
    value: 0,
    currency: "NGN",
  },
  {
    label: "Total Purchase Return",
    icon: "package",
    metricKey: "purchaseReturn",
    color: "#605ca8",
    value: 0,
    currency: "NGN",
  },
  {
    label: "Expense",
    icon: "receipt",
    metricKey: "expense",
    color: "#2563eb",
    value: 0,
    currency: "NGN",
  },
];

function Hq6ChartLoadingCard({ title }: { title: string }) {
  return (
    <div
      className="hq6-card flex min-h-[240px] flex-col items-center justify-center gap-2 p-6"
      aria-busy
    >
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <p className="text-2xl font-semibold tabular-nums">0</p>
      <Spinner size="md" className="text-muted" />
      <p className="text-xs text-muted">Loading…</p>
    </div>
  );
}

function Hq6OverviewPanelTable({ panel }: { panel: OverviewPanel }) {
  return (
    <div className="hq6-panel-card">
      <div className="hq6-panel-head">
        <h3>{panel.title}</h3>
      </div>
      <div className="hq6-dt-toolbar">
        <div className="hq6-search">
          <label className="hq6-search-field">
            <span className="sr-only">Search</span>
            <input placeholder="Search by product, date, amount…" />
          </label>
          <button type="button" className="hq6-search-btn" aria-label="Search">
            Search
          </button>
        </div>
        <label className="hq6-show-entries">
          Show{" "}
          <select defaultValue={10}>
            <option value={10}>10</option>
          </select>{" "}
          entries
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button type="button" className="hq6-btn hq6-btn-outline">
            Export CSV
          </button>
          <button type="button" className="hq6-btn hq6-btn-outline">
            Export Excel
          </button>
          <button type="button" className="hq6-btn hq6-btn-outline">
            Print
          </button>
          <button type="button" className="hq6-btn hq6-btn-outline">
            Column visibility
          </button>
          <button type="button" className="hq6-btn hq6-btn-outline">
            Export PDF
          </button>
        </div>
      </div>
      <div className="hq6-table-wrap overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {panel.columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {panel.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={panel.columns.length}
                  className="px-3 py-6 text-center text-[#777]"
                >
                  No data available in table
                </td>
              </tr>
            ) : (
              panel.rows.map((row, index) => (
                <tr key={String(row.id ?? index)}>
                  {panel.columns.map((col) => (
                    <td key={col.key} className="px-3 py-2">
                      {String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** HQ6 Home dashboard — ui-audit/00_home/screenshot.png */
export function Hq6OverviewView() {
  const { tenantId, config } = useRouteTenant();
  const userName = useAuthStore((s) => s.name ?? s.email ?? "Admin");
  const { dateRange, setDateRange, bounds } = useListPageFilters({ unboundedAllTime: false });
  const [locationCode, setLocationCode] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["vaHq6Home", tenantId, bounds?.from, bounds?.to],
    queryFn: () =>
      getVaHq6Home({
        from: bounds?.from,
        to: bounds?.to,
      }),
    enabled: Boolean(tenantId),
  });

  // Defer panels until HQ6 home settles so we don't stack finance + 3 panel bursts.
  const panelsDeferred = Boolean(tenantId) && overviewQuery.isFetched;

  const stockAlertQuery = useQuery({
    queryKey: ["overviewPanel", "stock-alert", tenantId],
    queryFn: getStockAlertPanel,
    enabled: panelsDeferred,
  });
  const salesDueQuery = useQuery({
    queryKey: ["overviewPanel", "sales-dues", tenantId],
    queryFn: getSalesPaymentDuesPanel,
    enabled: panelsDeferred,
  });
  const purchaseDueQuery = useQuery({
    queryKey: ["overviewPanel", "purchase-dues", tenantId],
    queryFn: getPurchasePaymentDuesPanel,
    enabled: panelsDeferred,
  });

  const financeKpis =
    overviewQuery.data?.financeKpis ??
    (overviewQuery.isLoading ? HQ6_PLACEHOLDER_KPIS : []);
  const overviewLoading = overviewQuery.isLoading && !overviewQuery.data;
  const statRows = useMemo(() => {
    const rows: ReportsKpi[][] = [];
    for (let i = 0; i < financeKpis.length; i += 4) {
      rows.push(financeKpis.slice(i, i + 4));
    }
    return rows.length > 0 ? rows : [financeKpis.slice(0, 4)];
  }, [financeKpis]);

  const charts = overviewQuery.data?.charts ?? [];
  const panels = [
    salesDueQuery.data,
    purchaseDueQuery.data,
    stockAlertQuery.data,
  ].filter(Boolean) as OverviewPanel[];

  return (
    <div className="hq6-page">
      <div className="hq6-welcome-banner">
        <h2>Welcome {userName}, 👋</h2>
        <div className="hq6-welcome-controls">
          <div className="min-w-[12rem]">
            <MenuSelect
              value={locationCode}
              placeholder="Select location"
              onChange={setLocationCode}
              options={[
                { value: "", label: "All locations" },
                ...(config?.businessLocations ?? []).map((loc) => ({
                  value: loc.code,
                  label: loc.name,
                })),
              ]}
            />
          </div>
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div
        className="space-y-[var(--hq6-section-gap)]"
        aria-busy={overviewLoading || undefined}
        aria-label={overviewLoading ? "Loading dashboard" : undefined}
      >
        {statRows.map((row, index) => (
          <div key={index} className="hq6-stat-grid">
            {row.map((kpi) => (
              <Hq6StatCard
                key={kpi.metricKey}
                kpi={kpi}
                isLoading={overviewLoading}
              />
            ))}
          </div>
        ))}

        {overviewLoading ? (
          <div className="grid gap-[var(--hq6-section-gap)] lg:grid-cols-2">
            <Hq6ChartLoadingCard title="Sales Last 30 Days" />
            <Hq6ChartLoadingCard title="Purchase Last 30 Days" />
          </div>
        ) : charts.length > 0 ? (
          <div className="grid gap-[var(--hq6-section-gap)] lg:grid-cols-2">
            {charts.slice(0, 2).map((chart) => (
              <div key={chart.id} className="hq6-card p-4">
                <ChartPanel
                  title={chart.title}
                  subtitle={chart.subtitle}
                  type={
                    chart.type === "pie"
                      ? "pie"
                      : chart.type === "line"
                        ? "line"
                        : "bar"
                  }
                  series={chart.series}
                  data={chart.data}
                  hidePeriodControl
                  formatTooltipValue={(value) =>
                    formatCurrencyCompact(Number(value), "NGN")
                  }
                />
              </div>
            ))}
          </div>
        ) : null}

        {overviewLoading ? null : (
          <>
            <div className="grid gap-[var(--hq6-section-gap)] lg:grid-cols-2">
              {panels.slice(0, 2).map((panel) => (
                <Hq6OverviewPanelTable key={panel.id} panel={panel} />
              ))}
            </div>
            {panels.length > 2 ? (
              <div className="space-y-[var(--hq6-section-gap)]">
                {panels.slice(2).map((panel) => (
                  <Hq6OverviewPanelTable key={panel.id} panel={panel} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()} All
        rights reserved.
      </p>
    </div>
  );
}
