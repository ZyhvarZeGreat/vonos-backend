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
import {
  filterByDateField,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import type { Job } from "@vonos/types";
import type { ColumnConfig } from "@/components/organisms/DataTable";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

const JOB_TABS = [
  { id: "all", label: "All Jobs" },
  { id: "active", label: "Active" },
  { id: "qc", label: "Pending QC" },
  { id: "completed", label: "Completed" },
];

const ACTIVE_STATUSES = new Set(["Received", "Quoted", "Approved", "In Progress"]);

function tabStatusFilter(tab: string): string | undefined {
  if (tab === "qc") return "QC";
  if (tab === "completed") return "Delivered";
  return undefined;
}

export function JobsListView() {
  const { goToDetail } = useRecordNavigation("jobs");
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");

  const apiFilters = useMemo(
    () => ({
      status: statusFilter || tabStatusFilter(activeTab),
      search: search.trim() || undefined,
    }),
    [activeTab, search, statusFilter],
  );

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
    error,
  } = useServerListPage({
    queryKey: ["jobs", tenantId],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search,
    fetchPage: (cursor, limit) => getJobsPage(tenantId!, apiFilters, cursor, limit),
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

  const filtered = useMemo(() => {
    let rows = filterByDateField(jobs, bounds, "dueDate");
    if (activeTab === "active") {
      rows = rows.filter((j) => ACTIVE_STATUSES.has(j.status));
    }
    return rows;
  }, [activeTab, bounds, jobs]);

  const statusOptions = useMemo(
    () => uniqueFieldOptions(jobs, "status"),
    [jobs],
  );

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
          options: statusOptions,
        },
      ]}
    >
      <ServerPaginatedTable
        items={filtered}
        columns={columns}
        pageIndex={pageIndex}
        pageSize={pageSize}
        hasMore={hasMore}
        canGoPrev={canGoPrev}
        onNext={goNext}
        onPrev={goPrev}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        error={error ? "Failed to load jobs" : null}
        onRowClick={(row) => goToDetail(row.id)}
      />
    </ListPageShell>
  );
}
