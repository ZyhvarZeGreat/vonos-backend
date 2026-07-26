"use client";

/**
 * Literally lifted from Ultimate POS home/index.blade.php +
 * hq6.vonosautomarket.com/ui-audit/00_home/ (page.html / screenshot.png).
 */
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import { DateRangeDropdown, getDateRangeLabel } from "@/components/molecules/DateRangeDropdown";
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
import type { CustomDateRange, DateRangePreset } from "@/stores/uiStore";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { formatCurrencyCompact } from "@/lib/utils/formatCurrency";
import { downloadCsv } from "@/lib/utils/exportCsv";
import type { OverviewPanel, ReportsKpi } from "@vonos/types";
import {
  Hq6IconAlertCircle,
  Hq6IconAlertTriangle,
  Hq6IconShoppingCart,
  hq6KpiIcon,
  hq6KpiIconWrapClass,
} from "@/components/hq6/hq6HomeIcons";

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
    color: "#16a34a",
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
    color: "#0ea5e9",
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
    color: "#dd4b39",
    value: 0,
    currency: "NGN",
  },
  {
    label: "Expense",
    icon: "receipt",
    metricKey: "expense",
    color: "#dd4b39",
    value: 0,
    currency: "NGN",
  },
];

function Hq6HomeKpiCard({
  kpi,
  isLoading = false,
}: {
  kpi: ReportsKpi;
  isLoading?: boolean;
}) {
  const Icon = hq6KpiIcon(kpi.metricKey);
  const label =
    kpi.metricKey === "totalSale" || /total.?sell/i.test(kpi.label)
      ? "Total Sales"
      : kpi.metricKey === "net"
        ? "Net"
        : kpi.metricKey === "invoiceDue" || /invoice.?due/i.test(kpi.label)
          ? "Invoice due"
          : kpi.metricKey === "sellReturn"
            ? "Total Sell Return"
            : kpi.metricKey === "purchase"
              ? "Total purchase"
              : kpi.metricKey === "purchaseDue"
                ? "Purchase due"
                : kpi.metricKey === "purchaseReturn"
                  ? "Total Purchase Return"
                  : kpi.metricKey === "expense"
                    ? "Expense"
                    : kpi.label;
  return (
    <div className="tw-transition-all tw-duration-200 tw-bg-white tw-shadow-sm hover:tw-shadow-md tw-rounded-xl hover:tw--translate-y-0.5 tw-ring-1 tw-ring-gray-200">
      <div className="tw-p-4 sm:tw-p-5">
        <div className="tw-flex tw-items-center tw-gap-4">
          <div
            className={`tw-inline-flex tw-items-center tw-justify-center tw-w-10 tw-h-10 tw-rounded-full sm:tw-w-12 sm:tw-h-12 tw-shrink-0 ${hq6KpiIconWrapClass(kpi.metricKey)}`}
          >
            <Icon className="tw-w-6 tw-h-6" />
          </div>
          <div className="tw-flex-1 tw-min-w-0">
            <p className="tw-text-sm tw-font-medium tw-text-gray-500 tw-truncate tw-whitespace-nowrap">
              {label}
            </p>
            {isLoading ? (
              <div className="tw-mt-0.5 tw-flex tw-items-center tw-gap-2">
                <p className="tw-text-gray-900 tw-text-xl tw-truncate tw-font-semibold tw-tracking-tight tw-font-mono">
                  ₦ 0.00
                </p>
                <Spinner size="sm" className="text-muted" />
              </div>
            ) : (
              <p className="tw-mt-0.5 tw-text-gray-900 tw-text-xl tw-truncate tw-font-semibold tw-tracking-tight tw-font-mono">
                {kpi.currency
                  ? formatHq6Currency(kpi.value, kpi.currency)
                  : String(kpi.value)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hq6FilterByDateButton({
  value,
  onChange,
  customValue,
  onCustomChange,
}: {
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
  customValue: CustomDateRange | null;
  onCustomChange: (range: CustomDateRange | null) => void;
}) {
  const label = getDateRangeLabel(value, customValue);

  return (
    <div className="tw-mt-2 sm:tw-w-1/3 md:tw-w-1/4 tw-text-right tw-relative">
      <DateRangeDropdown
        value={value}
        onChange={onChange}
        customValue={customValue}
        onCustomChange={onCustomChange}
        triggerLabel={`Filter by date · ${label}`}
        align="end"
        className="hq6-home-date-filter"
      />
    </div>
  );
}

function Hq6HomeChartCard({
  title,
  children,
  loading,
}: {
  title: string;
  children?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="tw-transition-all lg:tw-col-span-2 xl:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md hover:tw--translate-y-0.5 tw-ring-gray-200">
      <div className="tw-p-4 sm:tw-p-5">
        <div className="tw-flex tw-items-center tw-gap-2.5">
          <div className="tw-border-2 tw-flex tw-items-center tw-justify-center tw-rounded-full tw-w-10 tw-h-10">
            <Hq6IconShoppingCart className="tw-size-5 tw-text-sky-500 tw-shrink-0" />
          </div>
          <h3 className="tw-font-bold tw-text-base lg:tw-text-xl">{title}</h3>
        </div>
        <div className="tw-mt-5">
          <div className="tw-grid tw-w-full tw-h-100 tw-border tw-border-gray-200 tw-border-dashed tw-rounded-xl tw-bg-gray-50">
            {loading ? (
              <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-2 tw-min-h-[240px]">
                <p className="tw-text-2xl tw-font-semibold tw-tabular-nums">0</p>
                <Spinner size="md" className="text-muted" />
                <p className="tw-text-sm tw-italic tw-font-normal tw-text-gray-400">
                  Loading…
                </p>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function panelIcon(panelId: string) {
  if (panelId.includes("stock")) {
    return <Hq6IconAlertCircle className="tw-text-yellow-500 tw-size-5 tw-shrink-0" />;
  }
  return <Hq6IconAlertTriangle className="tw-text-yellow-500 tw-size-5 tw-shrink-0" />;
}

function panelSpanClass(panelId: string) {
  // home/index.blade.php: sales dues + purchase dues = col-span-1; stock alert = col-span-2
  if (panelId.includes("stock")) return "lg:tw-col-span-2";
  return "lg:tw-col-span-1";
}

function panelBladeTitle(panel: OverviewPanel): string {
  if (panel.id.includes("sales") || /sales.?payment/i.test(panel.title)) {
    return "Sales Payment Due";
  }
  if (panel.id.includes("purchase") || /purchase.?payment/i.test(panel.title)) {
    return "Purchase Payment Due";
  }
  if (panel.id.includes("stock")) return "Product Stock Alert";
  return panel.title;
}

function Hq6HomePanelCard({
  panel,
  locations,
  locationCode,
  onLocationChange,
}: {
  panel: OverviewPanel;
  locations: { code: string; name: string }[];
  locationCode: string;
  onLocationChange: (code: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const tableRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => {
    const q = committedSearch.trim().toLowerCase();
    if (!q) return panel.rows;
    return panel.rows.filter((row) =>
      panel.columns.some((col) =>
        String(row[col.key] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [committedSearch, panel.columns, panel.rows]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, pageSize),
    [filteredRows, pageSize],
  );

  const exportRows = useCallback(() => {
    downloadCsv({
      filename: `${panel.title.replace(/\s+/g, "-").toLowerCase() || "overview"}`,
      columns: panel.columns.map((col) => ({
        key: col.key,
        header: col.header,
      })),
      rows: filteredRows.map((row) => {
        const out: Record<string, string | number | null | undefined> = {};
        for (const col of panel.columns) {
          out[col.key] = row[col.key] as string | number | null | undefined;
        }
        return out;
      }),
    });
  }, [filteredRows, panel.columns, panel.title]);

  const handlePrint = useCallback(() => {
    if (!tableRef.current) {
      window.print();
      return;
    }
    const markup = tableRef.current.innerHTML;
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) {
      window.print();
      return;
    }
    win.document.write(
      `<!doctype html><html><head><title>${panel.title}</title>` +
        `<style>body{font-family:system-ui,sans-serif;padding:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:12px}th{background:#f3f4f6}</style>` +
        `</head><body><h1>${panel.title}</h1>${markup}</body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }, [panel.title]);

  return (
    <div
      className={`tw-transition-all ${panelSpanClass(panel.id)} tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md hover:tw--translate-y-0.5 tw-ring-gray-200`}
    >
      <div className="tw-p-4 sm:tw-p-5">
        <div className="tw-flex tw-items-center tw-gap-2.5">
          <div className="tw-border-2 tw-flex tw-items-center tw-justify-center tw-rounded-full tw-w-10 tw-h-10">
            {panelIcon(panel.id)}
          </div>
          <div className="tw-flex tw-items-center tw-flex-1 tw-min-w-0 tw-gap-1">
            <div className="tw-w-full sm:tw-w-1/2 md:tw-w-1/2">
              <h3 className="tw-font-bold tw-text-base lg:tw-text-xl">
                {panelBladeTitle(panel)}
              </h3>
            </div>
            {locations.length > 0 ? (
              <div className="tw-w-full sm:tw-w-1/2 md:tw-w-1/2">
                <select
                  className="form-control"
                  value={locationCode}
                  onChange={(e) => onLocationChange(e.target.value)}
                  aria-label={`${panel.title} location`}
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>

        <div className="tw-flow-root tw-mt-5 tw-border-gray-200">
          <div className="hq6-dt-toolbar">
            <div className="hq6-search">
              <label className="hq6-search-field">
                <span className="sr-only">Search</span>
                <input
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setCommittedSearch(search);
                    }
                  }}
                />
              </label>
              <button
                type="button"
                className="hq6-search-btn"
                aria-label="Search"
                onClick={() => setCommittedSearch(search)}
              >
                Search
              </button>
            </div>
            <label className="hq6-show-entries">
              Show{" "}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 10)}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>{" "}
              entries
            </label>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={exportRows}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={exportRows}
              >
                Export Excel
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={handlePrint}
              >
                Print
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-outline"
                onClick={handlePrint}
              >
                Export PDF
              </button>
            </div>
          </div>

          <div className="tw--mx-4 tw--my-2 tw-overflow-x-auto sm:tw--mx-5">
            <div
              className="tw-inline-block tw-min-w-full tw-py-2 tw-align-middle sm:tw-px-5"
              ref={tableRef}
            >
              <table
                className="table table-bordered table-striped"
                style={{ width: "100%" }}
              >
                <thead>
                  <tr>
                    {panel.columns.map((col) => (
                      <th key={col.key}>{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={panel.columns.length}
                        className="tw-text-center tw-text-gray-500"
                      >
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((row, index) => (
                      <tr key={String(row.id ?? index)}>
                        {panel.columns.map((col) => (
                          <td key={col.key}>{String(row[col.key] ?? "—")}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {filteredRows.length > pageSize ? (
            <p className="tw-px-3 tw-py-2 tw-text-xs tw-text-gray-500">
              Showing {visibleRows.length} of {filteredRows.length} rows
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** HQ6 Home — JSX lift of resources/views/home/index.blade.php (Ultimate POS). */
export function Hq6OverviewView() {
  const { tenantId, config } = useRouteTenant();
  const userName = useAuthStore((s) => s.name ?? s.email ?? "Admin");
  const { dateRange, setDateRange, customDateRange, setCustomDateRange, bounds } =
    useListPageFilters({
      unboundedAllTime: false,
      isolateDateRange: true,
      defaultDateRange: "last_30_days",
    });
  const [locationCode, setLocationCode] = useState("");
  const [panelLocationCode, setPanelLocationCode] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["vaHq6Home", tenantId, bounds?.from, bounds?.to],
    queryFn: () =>
      getVaHq6Home({
        from: bounds?.from,
        to: bounds?.to,
      }),
    enabled: Boolean(tenantId),
  });

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

  const topKpis = financeKpis.slice(0, 4);
  const bottomKpis = financeKpis.slice(4, 8);

  const charts = overviewQuery.data?.charts ?? [];
  const rangeLabel = getDateRangeLabel(dateRange, customDateRange);
  const chartTitles = [
    charts[0]?.title ? `${charts[0].title} · ${rangeLabel}` : `Sales · ${rangeLabel}`,
    charts[1]?.title
      ? `${charts[1].title} · ${rangeLabel}`
      : `Purchases · ${rangeLabel}`,
  ] as const;
  const panels = [
    salesDueQuery.data,
    purchaseDueQuery.data,
    stockAlertQuery.data,
  ].filter(Boolean) as OverviewPanel[];

  const locations = config?.businessLocations ?? [];
  // Blade: Session::get('user.first_name')
  const firstName = userName.split(/\s+/)[0] || userName;

  return (
    <div className="hq6-page hq6-home">
      {/* Blade: tw-pb-6 tw-bg-gradient-to-r tw-from-*-800 tw-to-*-900 xl:tw-pb-0 */}
      <div className="tw-pb-6 theme-header-bg xl:tw-pb-0">
        <div className="tw-px-5 tw-pt-3">
          <div className="sm:tw-flex sm:tw-items-center sm:tw-justify-between sm:tw-gap-12">
            <div className="tw-mt-2 sm:tw-w-1/2 md:tw-w-1/2">
              <h1 className="tw-text-2xl md:tw-text-4xl tw-tracking-tight tw-text-primary-800 tw-font-semibold text-white tw-mb-10 md:tw-mb-0">
                Welcome {firstName}, 👋
              </h1>
            </div>

            <div className="tw-mt-2 sm:tw-w-1/3 md:tw-w-1/4">
              <select
                id="dashboard_location"
                className="form-control select2"
                value={locationCode}
                onChange={(e) => setLocationCode(e.target.value)}
                aria-label="Select location"
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <Hq6FilterByDateButton
              value={dateRange}
              onChange={setDateRange}
              customValue={customDateRange}
              onCustomChange={setCustomDateRange}
            />
          </div>

          {/* Row 1 KPIs — Total Sales / Net / Invoice due / Total Sell Return */}
          <div
            className="tw-grid tw-grid-cols-1 tw-gap-4 tw-mt-6 sm:tw-grid-cols-2 xl:tw-grid-cols-4 sm:tw-gap-5"
            aria-busy={overviewLoading || undefined}
          >
            {(topKpis.length > 0 ? topKpis : HQ6_PLACEHOLDER_KPIS.slice(0, 4)).map(
              (kpi) => (
                <Hq6HomeKpiCard
                  key={kpi.metricKey}
                  kpi={kpi}
                  isLoading={overviewLoading}
                />
              ),
            )}
          </div>
        </div>

        {/* Row 2 KPIs sit on split green→gray background (Blade tw-relative + absolute grid) */}
        <div className="tw-relative">
          <div className="tw-absolute tw-inset-0 tw-grid" aria-hidden="true">
            <div className="theme-header-bg" />
            <div className="theme-header-bg hq6-home-header-fade xl:tw-bg-gray-100" />
          </div>
          <div className="tw-px-5 tw-isolate">
            <div className="tw-grid tw-grid-cols-1 tw-gap-4 tw-mt-4 sm:tw-mt-6 sm:tw-grid-cols-2 xl:tw-grid-cols-4 sm:tw-gap-5">
              {(
                bottomKpis.length > 0
                  ? bottomKpis
                  : HQ6_PLACEHOLDER_KPIS.slice(4, 8)
              ).map((kpi) => (
                <Hq6HomeKpiCard
                  key={kpi.metricKey}
                  kpi={kpi}
                  isLoading={overviewLoading}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Blade: tw-px-5 tw-py-6 → charts + dues + stock alert */}
      <div className="tw-px-5 tw-py-6">
        <div className="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-gap-5 lg:tw-grid-cols-2">
          {overviewLoading ? (
            <>
              <Hq6HomeChartCard title={chartTitles[0]} loading />
              <Hq6HomeChartCard title={chartTitles[1]} loading />
            </>
          ) : (
            chartTitles.map((title, index) => {
              const chart = charts[index] ?? charts[0];
              if (!chart) {
                return <Hq6HomeChartCard key={title} title={title} loading />;
              }
              return (
                <Hq6HomeChartCard key={title} title={title}>
                  <ChartPanel
                    title={title}
                    subtitle={chart.subtitle}
                    type={
                      chart.type === "pie"
                        ? "pie"
                        : chart.type === "line"
                          ? "line"
                          : "bar"
                    }
                    series={chart.series.map((s) => ({
                      ...s,
                      color: "#16a34a",
                    }))}
                    data={chart.data}
                    hidePeriodControl
                    hideHeader
                    className="hq6-home-chart-panel"
                    formatTooltipValue={(value) =>
                      formatCurrencyCompact(Number(value), "NGN")
                    }
                  />
                </Hq6HomeChartCard>
              );
            })
          )}

          {!overviewLoading
            ? panels.map((panel) => (
                <Hq6HomePanelCard
                  key={panel.id}
                  panel={panel}
                  locations={locations}
                  locationCode={panelLocationCode}
                  onLocationChange={setPanelLocationCode}
                />
              ))
            : null}
        </div>
      </div>

      <p className="hq6-footer">
        Vonos Autos Head Office - V6.8 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>
    </div>
  );
}
