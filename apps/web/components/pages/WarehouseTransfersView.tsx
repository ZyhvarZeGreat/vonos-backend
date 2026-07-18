"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getTransferZones, getTransfersPage, type TransferRow } from "@/lib/api/transfers";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { formatNumberCompact } from "@/lib/utils/formatCurrency";
import { ZoneCardsSkeleton } from "@/components/organisms/skeletons";

const TRANSFER_TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_transit", label: "In Transit" },
  { id: "completed", label: "Completed" },
  { id: "rejected", label: "Rejected" },
];

const columns: ColumnConfig<TransferRow>[] = [
  {
    key: "reference",
    header: "ID Transfer",
    render: (row) => <span className="font-medium text-foreground">{row.reference}</span>,
  },
  { key: "fromZone", header: "From" },
  { key: "toZone", header: "To" },
  { key: "itemsSummary", header: "Items" },
  { key: "requestedBy", header: "Request By" },
  {
    key: "createdAt",
    header: "Created",
    sortValue: (row) => new Date(row.createdAt).getTime(),
  },
  {
    key: "displayStatus",
    header: "Status",
    render: (row) => (
      <StatusPill status={row.displayStatus} vocabulary="movementStatus" />
    ),
  },
  {
    key: "actions",
    header: "Actions",
    sortable: false,
    render: () => (
      <div className="text-right">
        <button type="button" className="text-muted hover:text-foreground" aria-label="Row actions">
          <MoreHorizontal className="inline h-4 w-4" />
        </button>
      </div>
    ),
  },
];

function ZoneCard({
  name,
  totalSkus,
  totalUnits,
  pendingTransfers,
  utilizationPercent,
}: {
  name: string;
  totalSkus: number;
  totalUnits: number;
  pendingTransfers: number;
  utilizationPercent: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h3 className="text-base font-semibold text-foreground">{name}</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted">Total SKUs</p>
          <p className="mt-1 font-medium text-foreground">{formatNumberCompact(totalSkus)}</p>
        </div>
        <div>
          <p className="text-muted">Total Units</p>
          <p className="mt-1 font-medium text-foreground">{formatNumberCompact(totalUnits)}</p>
        </div>
        <div>
          <p className="text-muted">Pending Transfers</p>
          <p className="mt-1 font-medium text-foreground">{pendingTransfers}</p>
        </div>
        <div>
          <p className="text-muted">Utilization</p>
          <p className="mt-1 font-medium text-foreground">{utilizationPercent}%</p>
        </div>
      </div>
    </div>
  );
}

export function WarehouseTransfersView() {
  const [activeTab, setActiveTab] = useState("all");
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const zonesQuery = useQuery({
    queryKey: ["transferZones"],
    queryFn: getTransferZones,
    staleTime: 5 * 60_000,
  });

  const {
    items: transfers,
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
  } = useServerListPage<TransferRow>({
    queryKey: ["transfers"],
    search,
    filters: {
      status: statusFilter || (activeTab !== "all" ? activeTab : undefined),
      from: bounds?.from,
      to: bounds?.to,
      tab: activeTab,
    },
    fetchPage: (cursor, limit) =>
      getTransfersPage(cursor, limit, {
        search: search.trim() || undefined,
        from: bounds?.from,
        to: bounds?.to,
        status: statusFilter || (activeTab !== "all" ? activeTab : undefined),
      }),
  });

  const filtered = transfers;

  const statusOptions = useMemo(
    () =>
      (["Pending", "In Transit", "Completed", "Rejected"] as const).map(
        (value) => ({ value, label: value }),
      ),
    [],
  );

  return (
    <div className="space-y-6">
      {zonesQuery.isLoading ? (
        <ZoneCardsSkeleton count={2} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {(zonesQuery.data ?? []).map((zone) => (
            <ZoneCard key={zone.id} {...zone} />
          ))}
        </div>
      )}
      <ListPageShell
        tabs={TRANSFER_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchPlaceholder="Search Transfers"
        searchValue={search}
        onSearchChange={setSearch}
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
          isFetching={isFetching}
          error={error ? "Failed to load transfers" : null}
        />
      </ListPageShell>
    </div>
  );
}
