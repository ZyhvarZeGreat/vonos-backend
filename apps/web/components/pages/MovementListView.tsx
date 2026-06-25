"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { MovementSource, MovementStatus } from "@vonos/types";
import { StatusPill } from "@/components/atoms/StatusPill";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { getStockMovements, type StockMovementListRow } from "@/lib/api/stockMovements";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useListExport } from "@/lib/hooks/useListExport";
import {
  filterByDateField,
  filterBySearch,
  uniqueFieldOptions,
} from "@/lib/utils/listFilters";

interface MovementListViewProps {
  type: "inbound" | "outbound";
  title?: string;
  defaultStatus?: MovementStatus;
  source?: MovementSource;
}

export function MovementListView({
  type,
  title,
  defaultStatus,
  source,
}: MovementListViewProps) {
  const { goToDetail } = useRecordNavigation(type);
  const tenantId = useTenantId();
  const exportList = useListExport();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [activeTab, setActiveTab] = useState(defaultStatus === "Pending" ? "pending" : "all");
  const [statusFilter, setStatusFilter] = useState("");

  const { data = [], isLoading, error } = useQuery<StockMovementListRow[]>({
    queryKey: ["stock-movements", tenantId, type, source, defaultStatus],
    queryFn: async () => {
      if (!tenantId) return [];
      return getStockMovements(tenantId, {
        type,
        ...(defaultStatus ? { status: defaultStatus } : {}),
        ...(source ? { source } : {}),
      });
    },
    enabled: Boolean(tenantId),
  });

  const columns: ColumnConfig<StockMovementListRow>[] = [
    { key: "reference", header: "Reference", render: (r) => <span className="font-medium">{r.reference}</span> },
    { key: "supplierOrDest", header: type === "inbound" ? "Supplier" : "Destination" },
    { key: "itemCount", header: "Items", sortValue: (r) => r.itemCount },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusPill status={r.status} vocabulary="movementStatus" />,
    },
    { key: "date", header: "Date", sortValue: (r) => new Date(r.date).getTime() },
  ];

  const statusOptions = useMemo(
    () => uniqueFieldOptions(data, "status"),
    [data],
  );

  const filtered = useMemo(() => {
    let rows = filterByDateField(data, bounds, "date");
    if (activeTab === "pending") {
      rows = rows.filter((r) => r.status === "Pending");
    } else if (activeTab === "completed") {
      rows = rows.filter((r) =>
        ["Received", "Shipped", "Delivered", "Approved"].includes(r.status),
      );
    }
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    return filterBySearch(rows, search, ["reference", "supplierOrDest"]);
  }, [activeTab, bounds, data, search, statusFilter]);

  return (
    <ListPageShell
      tabs={[
        { id: "all", label: "All" },
        { id: "pending", label: "Pending" },
        { id: "completed", label: "Completed" },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={`Search ${title ?? type}...`}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      filterDropdowns={[
        {
          id: "status",
          label: "Status",
          options: [{ value: "", label: "All statuses" }, ...statusOptions],
          value: statusFilter,
          onChange: setStatusFilter,
        },
      ]}
      onExport={() =>
        exportList(
          `${title ?? type}.csv`,
          [
            { key: "reference", header: "Reference" },
            { key: "supplierOrDest", header: "Party" },
            { key: "itemCount", header: "Items" },
            { key: "status", header: "Status" },
            { key: "date", header: "Date" },
          ],
          filtered.map((row) => ({
            reference: row.reference,
            supplierOrDest: row.supplierOrDest,
            itemCount: row.itemCount,
            status: row.status,
            date: row.date,
          })),
        )
      }
    >
      <DataTable<StockMovementListRow>
        data={filtered}
        columns={columns}
        displayMode="table"
        isLoading={isLoading}
        error={error ? "Failed to load movements" : null}
        onRowClick={(row) => goToDetail(row.id)}
        emptyState={{ message: `No ${title?.toLowerCase() ?? type} records yet.` }}
      />
    </ListPageShell>
  );
}

export function PurchaseOrdersView() {
  return <MovementListView type="inbound" title="Purchase Orders" />;
}

export function PurchaseReturnsView() {
  return (
    <MovementListView type="outbound" title="Purchase Returns" source="purchase_return" />
  );
}
