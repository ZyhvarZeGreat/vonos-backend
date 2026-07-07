"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer, Upload } from "lucide-react";
import type { LedgerEntry } from "@vonos/types";
import { AdminEntityBanner } from "@/components/molecules/AdminEntityBanner";
import { FinanceActionBar } from "@/components/molecules/FinanceActionBar";
import { Button } from "@/components/atoms/Button";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { KpiRow } from "@/components/organisms/KpiRow";
import { PaginatedLedgerTable } from "@/components/organisms/PaginatedLedgerTable";
import { StatusPill } from "@/components/atoms/StatusPill";
import { getAllLedgerEntries, getLedgerSummary } from "@/lib/api/ledger";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import {
  buildLedgerReportSections,
  flattenLedgerSectionsForExport,
} from "@/lib/utils/ledgerReportSheet";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import { useUiStore } from "@/stores/uiStore";
import { dateRangePresetToBounds } from "@/lib/utils/dateRange";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/formatCurrency";
import type { ColumnConfig } from "@/components/organisms/DataTable";

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

export interface AdminEntityFinanceSheetProps {
  tenantCode: TenantCode;
}

export function AdminEntityFinanceSheet({ tenantCode }: AdminEntityFinanceSheetProps) {
  const router = useRouter();
  const tenant = getTenantByCode(tenantCode);
  const tenantId = tenant?.tenantId;
  const dateRange = useUiStore((state) => state.dateRange);
  const setDateRange = useUiStore((state) => state.setDateRange);
  const openExportModal = useUiStore((state) => state.openExportModal);

  const bounds = useMemo(() => dateRangePresetToBounds(dateRange), [dateRange]);
  const periodLabel = ledgerChartSubtitle(dateRange);

  const summaryQuery = useQuery({
    queryKey: ["adminFinanceSummary", tenantId, bounds?.from, bounds?.to],
    queryFn: () => getLedgerSummary(tenantId!, bounds?.from, bounds?.to),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  if (!tenant) {
    return (
      <p className="text-sm text-muted">Unknown entity code &quot;{tenantCode}&quot;.</p>
    );
  }

  const summary = summaryQuery.data;

  const handleExport = async () => {
    if (!summary || !tenantId) return;
    const entries = await getAllLedgerEntries(tenantId, {
      from: bounds?.from,
      to: bounds?.to,
    });
    const sections = buildLedgerReportSections(entries);
    openExportModal(
      {
        title: `Export P&L — ${tenant.name}`,
        subtitle: periodLabel,
      },
      {
        filename: `finance-${tenantCode.toLowerCase()}`,
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
    const path = recordDetailPath(tenantCode, entry.linkedRecordType, entry.linkedRecordId);
    if (path) router.push(path);
  };

  return (
    <div className="space-y-6">
      <AdminEntityBanner
        tenantCode={tenantCode}
        tenantName={tenant.name}
        backHref="/admin/finance"
        backLabel="Back to group finance"
      />

      <FinanceActionBar fixedTenantCode={tenantCode} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void handleExport()} disabled={!summary}>
            <Upload className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div data-print-root className="space-y-6">
        <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-card print:border-0 print:shadow-none">
          <h2 className="text-lg font-semibold text-foreground">
            Profit & Loss — {tenant.name}
          </h2>
          <p className="mt-1 text-sm text-muted">{periodLabel}</p>
        </div>

        <KpiRow
          cards={adminFinanceKpiCards}
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

        {summaryQuery.error ? (
          <p className="text-sm text-error">Failed to load finance summary.</p>
        ) : (
          <PaginatedLedgerTable
            tenantId={tenantId}
            from={bounds?.from}
            to={bounds?.to}
            columns={adminLedgerColumns}
            onRowClick={handleLineClick}
            emptyState={{
              message: "No ledger entries for this period. Entries appear when sales, jobs, or manual expenses are recorded.",
            }}
          />
        )}
      </div>
    </div>
  );
}
