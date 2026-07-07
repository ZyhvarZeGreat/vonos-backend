"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Printer, Upload } from "lucide-react";
import { AdminEntityBanner } from "@/components/molecules/AdminEntityBanner";
import { Button } from "@/components/atoms/Button";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { HqReportPageLayout } from "@/components/organisms/HqReportPageLayout";
import { runReport } from "@/lib/api/reports";
import { reportEntryBySlug } from "@/lib/registries/reportRegistry";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import type { ReportsTableRow } from "@vonos/types";
import { useUiStore } from "@/stores/uiStore";

export interface AdminEntityReportSheetProps {
  tenantCode: TenantCode;
  reportSlug: string;
}

export function AdminEntityReportSheet({
  tenantCode,
  reportSlug,
}: AdminEntityReportSheetProps) {
  const router = useRouter();
  const tenant = getTenantByCode(tenantCode);
  const entry = reportEntryBySlug(reportSlug);
  const { dateRange, setDateRange, bounds } = useListPageFilters();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const periodLabel = ledgerChartSubtitle(dateRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["adminReportRun", tenant?.tenantId, entry?.id, bounds?.from ?? "all", bounds?.to ?? "all"],
    queryFn: () =>
      runReport({
        reportId: entry!.id,
        from: bounds?.from,
        to: bounds?.to,
        tenantId: tenant!.tenantId,
      }),
    enabled: Boolean(tenant && entry),
  });

  if (!tenant) {
    return (
      <p className="text-sm text-muted">Unknown entity code &quot;{tenantCode}&quot;.</p>
    );
  }

  if (!entry) {
    return <p className="text-sm text-muted">Unknown report &quot;{reportSlug}&quot;.</p>;
  }

  const handleExport = () => {
    if (!data?.table) return;
    openExportModal(
      {
        title: `Export ${entry.label} — ${tenant.name}`,
        subtitle: periodLabel,
      },
      {
        filename: `${entry.slug}-${tenantCode.toLowerCase()}`,
        columns: data.table.columns.map((col) => ({
          key: col.key,
          header: col.header,
        })),
        rows: data.table.rows.map((row) => {
          const out: Record<string, string | number | null | undefined> = {};
          for (const [key, value] of Object.entries(row)) {
            if (key === "actions" || Array.isArray(value)) continue;
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              value == null
            ) {
              out[key] = value;
            }
          }
          return out;
        }),
      },
    );
  };

  const handleRowClick = (row: ReportsTableRow & { id: string }) => {
    const path = recordDetailPath(
      tenantCode,
      String(row.recordType ?? ""),
      String(row.id ?? ""),
    );
    if (path) router.push(path);
  };

  return (
    <div className="space-y-6">
      <AdminEntityBanner
        tenantCode={tenantCode}
        tenantName={tenant.name}
        backHref={`/admin/reports/${tenantCode}`}
        backLabel="Back to entity reports"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={!data?.table?.rows.length}
          >
            <Upload className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <p className="text-sm text-muted">Loading report…</p>
      ) : error ? (
        <p className="text-sm text-error">Failed to load report.</p>
      ) : data ? (
        <HqReportPageLayout
          reportId={entry.id}
          title={entry.label}
          subtitle={periodLabel}
          data={data}
          onRowClick={handleRowClick}
        />
      ) : null}
    </div>
  );
}
