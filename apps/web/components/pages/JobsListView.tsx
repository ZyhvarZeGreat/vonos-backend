"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getJobs } from "@/lib/api/jobs";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
import type { Job } from "@vonos/types";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

const JOB_TABS = [
  { id: "all", label: "All Jobs" },
  { id: "active", label: "Active" },
  { id: "qc", label: "Pending QC" },
  { id: "completed", label: "Completed" },
];

const ACTIVE_STATUSES = new Set(["Received", "Quoted", "Approved", "In Progress"]);

export function JobsListView() {
  const { goToDetail } = useRecordNavigation("jobs");
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ["jobs", tenantId],
    queryFn: () => getJobs(tenantId!),
    enabled: Boolean(tenantId),
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
    } else if (activeTab === "qc") {
      rows = rows.filter((j) => j.status === "QC");
    } else if (activeTab === "completed") {
      rows = rows.filter((j) => j.status === "Delivered");
    }
    if (statusFilter) rows = rows.filter((j) => j.status === statusFilter);
    return filterBySearch(rows, search, ["reference", "customerName", "description"]);
  }, [activeTab, bounds, jobs, search, statusFilter]);

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
      <DataTable
        data={filtered}
        columns={columns}
        displayMode="table"
        embedded
        isLoading={isLoading}
        error={error ? "Failed to load jobs" : null}
        onRowClick={(row) => goToDetail(row.id)}
      />
    </ListPageShell>
  );
}
