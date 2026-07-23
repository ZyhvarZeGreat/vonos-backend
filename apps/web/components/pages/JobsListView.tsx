"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getJobsPage } from "@/lib/api/jobs";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { Job } from "@vonos/types";
import type { ColumnConfig } from "@/components/organisms/DataTable";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

const JOB_TABS = [
  { id: "all", label: "All Jobs" },
  { id: "active", label: "Active" },
  { id: "qc", label: "Pending QC" },
  { id: "completed", label: "Completed" },
];

const ACTIVE_STATUSES = ["Received", "Quoted", "Approved", "In Progress"];

const JOB_STATUS_OPTIONS = [
  "Received",
  "Quoted",
  "Approved",
  "In Progress",
  "QC",
  "Delivered",
].map((value) => ({ value, label: value }));

function tabStatusFilter(tab: string): string | undefined {
  if (tab === "qc") return "QC";
  if (tab === "completed") return "Delivered";
  return undefined;
}

export function JobsListView() {
  const { goToDetail } = useRecordNavigation("jobs");
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters({
    defaultDateRange: "all_time",
  });
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(() => {
    const next: {
      status?: string;
      statuses?: string[];
      search?: string;
      from?: string;
      to?: string;
    } = {
      search: search.trim() || undefined,
      from: bounds?.from,
      to: bounds?.to,
    };
    if (statusFilter) {
      next.status = statusFilter;
    } else if (activeTab === "active") {
      next.statuses = ACTIVE_STATUSES;
    } else {
      next.status = tabStatusFilter(activeTab);
    }
    return next;
  }, [activeTab, bounds?.from, bounds?.to, search, statusFilter]);

  const {
    items: jobs,
    hasMore,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext,
    goPrev,
    setPageSize,
    isLoading,

    isFetching,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage({
    queryKey: ["jobs", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit, _sort, opts) => getJobsPage(tenantId!, { ...apiFilters, includeSummary: opts?.includeSummary }, cursor, limit),
  });

  const columns: ColumnConfig<Job>[] = [
    { key: "reference", header: "Job #", render: (r) => <span className="font-medium">{r.reference}</span> },
    { key: "description", header: "Description" },
    { key: "customerName", header: "Customer" },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} vocabulary="jobStatus" />,
    },
    {
      key: "quoteAmount",
      header: "Quote",
      sortValue: (r) => r.quoteAmount ?? 0,
      render: (r) => (r.quoteAmount ? formatCurrency(r.quoteAmount, "NGN") : "—"),
    },
    {
      key: "dueDate",
      header: "Due",
      sortValue: (r) => (r.dueDate ? new Date(r.dueDate).getTime() : 0),
    },
  ];

  return (
    <ListPageShell
      tabs={JOB_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search jobs..."
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      filterDropdowns={[
        {
          id: "status",
          label: "Status",
          value: statusFilter,
          onChange: setStatusFilter,
          options: JOB_STATUS_OPTIONS,
        },
      ]}
    >
      <div className="p-4 pt-0">
        <ServerPaginatedTable
          items={jobs}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          hasMore={hasMore}
          canGoPrev={canGoPrev}
          onNext={goNext}
          onPrev={goPrev}
          onPageSizeChange={setPageSize}
          onPageSelect={goToPage}
          canSelectPage={canSelectPage}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error ? "Failed to load jobs" : null}
          onRowClick={(row) => goToDetail(row.id)}
        />
      </div>
    </ListPageShell>
  );
}
