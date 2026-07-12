import { Skeleton } from "@/components/atoms/Skeleton";
import { cn } from "@/lib/utils/cn";

export function KpiRowSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2",
        count > 4 ? "lg:grid-cols-3" : "lg:grid-cols-4",
        className,
      )}
      aria-busy
      aria-label="Loading metrics"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex h-[var(--space-kpi-height)] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="mt-auto flex items-baseline gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartPanelSkeleton({
  withHeader = true,
  className,
}: {
  withHeader?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-[var(--space-chart-height)] flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
      aria-busy
      aria-label="Loading chart"
    >
      {withHeader ? (
        <div className="mb-8 flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3">
        <div className="flex h-full items-end justify-between gap-2 px-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton
              key={index}
              className="w-full max-w-[48px] rounded-t-md"
              style={{ height: `${35 + (index % 4) * 14}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between px-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CursorPaginationBarSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-subtle)] p-4",
        className,
      )}
      aria-hidden
    >
      <Skeleton className="h-4 w-28" />
      <div className="flex items-center gap-1">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16 rounded-lg" />
    </div>
  );
}

export function DataTableSkeleton({
  rows = 8,
  columns = 5,
  columnHeaders,
  selectable = false,
  withFilters = false,
  withPagination = false,
  embedded = false,
}: {
  rows?: number;
  columns?: number;
  columnHeaders?: string[];
  selectable?: boolean;
  withFilters?: boolean;
  withPagination?: boolean;
  embedded?: boolean;
}) {
  const columnCount = columnHeaders?.length ?? columns;

  return (
    <div
      className={cn(!embedded && "rounded-xl border border-border bg-card shadow-card")}
      aria-busy
      aria-label="Loading table"
    >
      {withFilters ? (
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <Skeleton className="h-10 w-56 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[var(--color-surface-muted)]">
            <tr>
              {selectable ? (
                <th className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-4 rounded" />
                </th>
              ) : null}
              {columnHeaders
                ? columnHeaders.map((header) => (
                    <th key={header} className="px-4 py-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {header}
                      </span>
                    </th>
                  ))
                : Array.from({ length: columnCount }).map((_, index) => (
                    <th key={index} className="px-4 py-3 text-left">
                      <Skeleton className="h-3 w-20" />
                    </th>
                  ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border last:border-0">
                {selectable ? (
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-4 rounded" />
                  </td>
                ) : null}
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <td key={colIndex} className="px-4 py-3">
                    <Skeleton
                      className={cn("h-4", colIndex === 0 ? "w-32" : "w-20")}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {withPagination ? <CursorPaginationBarSkeleton /> : null}
    </div>
  );
}

export function ActivityFeedSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
      aria-busy
      aria-label="Loading activity"
    >
      <div className="mb-8 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton circle className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-[60%] max-w-[220px]" />
              <Skeleton className="h-3 w-full max-w-[320px]" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RankedListSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "flex h-[var(--space-chart-height)] flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
      aria-busy
      aria-label="Loading ranked list"
    >
      <div className="mb-6 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index}>
            <div className="mb-1 flex justify-between gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ZoneCardsSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2" aria-busy aria-label="Loading zones">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-5 shadow-card">
          <Skeleton className="h-5 w-32" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((__, metricIndex) => (
              <div key={metricIndex} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function KanbanSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4"
      aria-busy
      aria-label="Loading board"
    >
      {Array.from({ length: columns }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col rounded-xl border border-border bg-[var(--color-surface-muted)] p-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, cardIndex) => (
              <Skeleton key={cardIndex} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CalendarGridSkeleton({
  columns = 3,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="overflow-x-auto p-4" aria-busy aria-label="Loading calendar">
      <div className="min-w-[640px]">
        <div className="mb-3 flex gap-4 border-b border-border pb-3">
          <Skeleton className="h-4 w-12" />
          {Array.from({ length: columns - 1 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 border-b border-border py-3 last:border-0">
            <Skeleton className="h-4 w-12 shrink-0" />
            {Array.from({ length: columns - 1 }).map((__, colIndex) => (
              <Skeleton key={colIndex} className="h-14 flex-1 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthFormSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-card"
      aria-busy
      aria-label="Loading sign in"
    >
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-8 w-40" />
        <Skeleton className="mx-auto h-4 w-56" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export function TableGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy
      aria-label="Loading tables"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl" />
      ))}
    </div>
  );
}

export function DashboardBodySkeleton({
  kpiCount = 4,
  chartCount = 2,
  financeChartCount = 0,
  withFeed = false,
}: {
  kpiCount?: number;
  chartCount?: number;
  financeChartCount?: number;
  withFeed?: boolean;
}) {
  return (
    <div className="space-y-6">
      <KpiRowSkeleton count={kpiCount} />
      {chartCount > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: chartCount }).map((_, index) => (
            <ChartPanelSkeleton key={index} />
          ))}
        </div>
      ) : null}
      {financeChartCount > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: financeChartCount }).map((_, index) => (
            <ChartPanelSkeleton key={`finance-${index}`} />
          ))}
        </div>
      ) : null}
      {withFeed ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.45fr]">
          <DataTableSkeleton rows={5} columns={4} />
          <ActivityFeedSkeleton />
        </div>
      ) : null}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading record">
      <Skeleton className="h-4 w-28" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-12 w-full max-w-2xl rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <Skeleton className="mb-4 h-5 w-32" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[83%]" />
                <Skeleton className="h-4 w-[66%]" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex justify-between gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-background" aria-busy aria-label="Loading">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card p-4 md:block">
        <Skeleton className="mb-8 h-8 w-36" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton circle className="h-9 w-9" />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto max-w-[var(--space-content-max)]">
            <DashboardBodySkeleton chartCount={2} />
          </div>
        </main>
      </div>
    </div>
  );
}
