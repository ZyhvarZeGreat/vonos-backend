"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { reportEntryBySlug } from "@/lib/registries/reportRegistry";
import { runReport } from "@/lib/api/reports";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { recordDetailPath } from "@/lib/utils/recordDetailPath";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { ReportDetailSheet } from "@/components/organisms/ReportDetailSheet";
import { useUiStore } from "@/stores/uiStore";

interface ReportRunViewProps {
  slug: string;
}

export function ReportRunView({ slug }: ReportRunViewProps) {
  const router = useRouter();
  const { tenantId, tenantCode } = useRouteTenant();
  const openExportModal = useUiStore((state) => state.openExportModal);
  const entry = reportEntryBySlug(slug);
  const { dateRange, setDateRange, bounds } = useListPageFilters();
  const periodLabel = ledgerChartSubtitle(dateRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["report-run", tenantId, entry?.id, bounds?.from ?? "all", bounds?.to ?? "all"],
    queryFn: async () => {
      if (!tenantId || !entry) return null;
      return runReport({
        reportId: entry.id,
        from: bounds?.from,
        to: bounds?.to,
      });
    },
    enabled: Boolean(tenantId && entry),
  });

  const exportPayload = useMemo(() => {
    if (!data?.table || !entry) return null;
    return {
      filename: entry.slug,
      columns: data.table.columns.map((col) => ({ key: col.key, header: col.header })),
      rows: data.table.rows.map((row) => ({ ...row })),
    };
  }, [data?.table, entry]);

  if (!entry) {
    return <p className="p-6 text-sm text-muted-foreground">Unknown report.</p>;
  }

  return (
    <ListPageShell
      tabs={[{ id: "report", label: entry.label }]}
      activeTab="report"
      onTabChange={() => {}}
      showImport={false}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onExport={
        entry.exportable && exportPayload
          ? () =>
              openExportModal(
                {
                  title: `Export ${entry.label}`,
                  subtitle: "Download report data as CSV",
                },
                exportPayload,
              )
          : undefined
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : error ? (
        <p className="text-sm text-red-600">Failed to load report.</p>
      ) : data ? (
        <ReportDetailSheet
          title={entry.label}
          subtitle={periodLabel}
          data={data}
          showCharts
          onRowClick={
            tenantCode
              ? (row) => {
                  const path = recordDetailPath(
                    tenantCode,
                    String(row.recordType ?? ""),
                    String(row.id ?? ""),
                  );
                  if (path) router.push(path);
                }
              : undefined
          }
        />
      ) : null}
    </ListPageShell>
  );
}
