"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getTransferZones, getTransfers, type TransferRow } from "@/lib/api/transfers";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { formatNumberCompact } from "@/lib/utils/formatCurrency";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";
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
  });
  const transfersQuery = useQuery({
    queryKey: ["transfers"],
    queryFn: getTransfers,
  });

  const transfers = useMemo(() => transfersQuery.data ?? [], [transfersQuery.data]);

  const filtered = useMemo(() => {
    let rows = filterByDateField(transfers, bounds, "createdAt");
    if (activeTab !== "all") {
      const statusMap: Record<string, TransferRow["displayStatus"]> = {
        pending: "Pending",
        in_transit: "In Transit",
        completed: "Completed",
        rejected: "Rejected",
      };
      const status = statusMap[activeTab];
      if (status) rows = rows.filter((row) => row.displayStatus === status);
    }
    if (statusFilter) rows = rows.filter((row) => row.displayStatus === statusFilter);
    return filterBySearch(rows, search, ["reference", "requestedBy", "itemsSummary"]);
  }, [activeTab, bounds, search, statusFilter, transfers]);

  const statusOptions = useMemo(
    () => uniqueFieldOptions(transfers, "displayStatus"),
    [transfers],
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
        <DataTable
          embedded
          data={filtered}
          columns={columns}
          displayMode="table"
          isLoading={transfersQuery.isLoading}
          error={transfersQuery.error ? "Failed to load transfers" : null}
        />
      </ListPageShell>
    </div>
  );
}
