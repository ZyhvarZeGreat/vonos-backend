"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { ReportDetailSheet } from "@/components/organisms/ReportDetailSheet";
import { HqReportPageSkeleton } from "@/components/organisms/HqReportPageLayout";
import { Spinner } from "@/components/atoms/Spinner";
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

  const { data, isLoading, error, isFetching } = useQuery({
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
          <p className="text-sm text-muted">
            Group roll-up · per-entity breakdown for this report only
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && data ? <Spinner className="text-muted" /> : null}
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
          Failed to load {entry.label}. Try again or change the date range.
        </div>
      ) : isLoading && !data ? (
        <HqReportPageSkeleton reportId={entry.id} />
      ) : data ? (
        <ReportDetailSheet
          title={entry.label}
          subtitle={periodLabel}
          data={data}
          showCharts
          tableFirst={Boolean(data.table && data.charts.length === 0)}
        />
      ) : null}
    </div>
  );
}
