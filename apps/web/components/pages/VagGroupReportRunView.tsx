"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { ReportDetailSheet } from "@/components/organisms/ReportDetailSheet";
import { HqReportPageSkeleton } from "@/components/organisms/HqReportPageLayout";
import { Spinner } from "@/components/atoms/Spinner";
import { runGroupReport } from "@/lib/api/reports";
import { reportEntryById } from "@/lib/registries/reportRegistry";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { ledgerChartSubtitle } from "@/lib/utils/ledgerCharts";
import { ROUTE_PREFETCH_STALE_MS } from "@/lib/prefetch/routePrefetchRegistry";

export function VagGroupReportRunView() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;
  const entry = reportEntryById(reportId);
  const { dateRange, setDateRange, customDateRange, setCustomDateRange, bounds } =
    useListPageFilters({
      defaultDateRange: "last_7_days",
      unboundedAllTime: false,
      isolateDateRange: true,
    });
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
    staleTime: ROUTE_PREFETCH_STALE_MS,
    placeholderData: (prev) => prev,
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
    <Hq6PageFrame
      title={entry.label}
      subtitle="Group roll-up · per-entity breakdown for this report"
    >
      <div className="space-y-6">
        <div className="hq6-card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <Link
            href="/admin/reports"
            className="font-medium text-info hover:underline"
          >
            ← Back to group reports
          </Link>
          <div className="flex items-center gap-3">
            {isFetching && data ? <Spinner className="text-muted" /> : null}
            <DateRangeDropdown
              value={dateRange}
              onChange={setDateRange}
              customValue={customDateRange}
              onCustomChange={setCustomDateRange}
            />
          </div>
        </div>

        {error ? (
          <div className="hq6-card p-8 text-center text-sm text-muted">
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
          />
        ) : null}
      </div>
    </Hq6PageFrame>
  );
}
