"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { ReportsDashboardBody } from "@/components/pages/ReportsView";
import { HqReportPageLayout } from "@/components/organisms/HqReportPageLayout";
import { runGroupReport } from "@/lib/api/reports";
import { reportEntryById } from "@/lib/registries/reportRegistry";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";

export function VagGroupReportRunView() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;
  const entry = reportEntryById(reportId);
  const { dateRange, setDateRange, bounds } = useListPageFilters();
  const periodLabel = ledgerChartSubtitle(dateRange);

  const { data, isLoading, error } = useQuery({
    queryKey: ["groupReportRun", reportId, bounds?.from ?? "all", bounds?.to ?? "all"],
    queryFn: () =>
      runGroupReport({
        reportId,
        from: bounds?.from,
        to: bounds?.to,
      }),
    enabled: Boolean(entry?.groupRollup),
    staleTime: 5 * 60_000,
  });

  if (!entry) {
    return (
      <p className="text-sm text-muted">Unknown group report &quot;{reportId}&quot;.</p>
    );
  }

  if (!entry.groupRollup) {
    return (
      <p className="text-sm text-muted">
        Report &quot;{entry.label}&quot; does not support a group roll-up.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/reports"
            className="text-sm font-medium text-info hover:underline"
          >
            ← Back to group reports
          </Link>
          <h2 className="mt-2 text-lg font-semibold text-foreground">{entry.label}</h2>
          <p className="text-sm text-muted">Group roll-up across all entities</p>
        </div>
        <DateRangeDropdown value={dateRange} onChange={setDateRange} />
      </div>

      {entry.id === "profit-loss" && data?.profitLoss ? (
        <HqReportPageLayout
          reportId={entry.id}
          title={entry.label}
          subtitle={periodLabel}
          data={data}
        />
      ) : (
        <ReportsDashboardBody
          dashboard={data}
          isLoading={isLoading}
          error={error}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      )}
    </div>
  );
}
