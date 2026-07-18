"use client";

import { useMemo, useState } from "react";
import { StatusPill } from "@/components/atoms/StatusPill";
import { CursorPaginationBar } from "@/components/molecules/CursorPaginationBar";
import { TableFetchingOverlay } from "@/components/molecules/TableFetchingOverlay";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { KanbanSkeleton } from "@/components/organisms/skeletons";
import { getOrdersPage } from "@/lib/api/orders";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { uniqueFieldOptions } from "@/lib/utils/listFilters";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import type { Order } from "@/lib/types/entityRows";
import { cn } from "@/lib/utils/cn";

const KANBAN_COLUMNS = ["New", "Preparing", "Ready", "Served"] as const;
const KITCHEN_OVERDUE_MINUTES = 12;

function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

function formatElapsed(iso: string): string {
  const mins = minutesSince(iso);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export function KitchenDisplayView() {
  const tenantId = useTenantId();
  const { dateRange, setDateRange, search, setSearch, bounds } = useListPageFilters();
  const [statusFilter, setStatusFilter] = useState("");

  const {
    items: orders,
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
  } = useServerListPage<Order>({
    queryKey: ["kitchen-orders", tenantId],
    enabled: Boolean(tenantId),
    search,
    filters: {
      from: bounds?.from,
      to: bounds?.to,
      status: statusFilter || undefined,
    },
    defaultPageSize: 10,
    refetchInterval: 30_000,
    fetchPage: (cursor, limit) =>
      getOrdersPage(
        tenantId!,
        {
          search: search.trim() || undefined,
          from: bounds?.from,
          to: bounds?.to,
        },
        cursor,
        limit,
      ),
  });

  const filtered = useMemo(() => {
    if (!statusFilter) return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const statusOptions = useMemo(
    () => uniqueFieldOptions(orders, "status"),
    [orders],
  );

  const byStatus = KANBAN_COLUMNS.map((status) => ({
    status,
    orders: filtered.filter((o) => o.status === status),
  }));

  const kitchenTabs = [
    { id: "all", label: "All Orders" },
    ...KANBAN_COLUMNS.map((s) => ({ id: s, label: s })),
  ];

  return (
    <div className="space-y-4">
      <ListPageShell
        tabs={kitchenTabs}
        activeTab={statusFilter || "all"}
        onTabChange={(tab) => setStatusFilter(tab === "all" ? "" : tab)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search orders..."
        showImport={false}
        showExport={false}
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
        {error ? (
          <p className="p-4 text-sm text-error">Failed to load kitchen orders.</p>
        ) : isLoading ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <KanbanSkeleton />
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-card">
            {isFetching ? <TableFetchingOverlay label="Updating orders" /> : null}
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
              {byStatus.map(({ status, orders: columnOrders }) => (
                <div key={status} className="flex flex-col rounded-xl border border-border bg-[var(--color-surface-muted)] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{status}</h3>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted">
                      {columnOrders.length}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3">
                    {columnOrders.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted">No orders</p>
                    ) : (
                      columnOrders.map((order) => {
                        const elapsed = minutesSince(order.createdAt);
                        const overdue =
                          order.status === "Preparing" && elapsed >= KITCHEN_OVERDUE_MINUTES;
                        return (
                        <div
                          key={order.id}
                          className={cn(
                            "rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
                            overdue ? "border-warning ring-1 ring-warning/30" : "border-border",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-lg font-bold text-foreground">{order.reference}</span>
                            <StatusPill status={order.status} vocabulary="orderStatus" />
                          </div>
                          <p className="mt-2 text-sm text-muted">
                            {order.tableNumber ? `Table ${order.tableNumber}` : "Takeaway"} · {order.itemCount} items
                          </p>
                          <p className={cn("mt-1 text-xs", overdue ? "font-medium text-warning" : "text-muted")}>
                            {formatElapsed(order.createdAt)}
                            {overdue ? " · overdue" : ""}
                          </p>
                          <p className="mt-3 text-base font-semibold text-foreground">
                            {formatCurrency(order.total, order.currency)}
                          </p>
                        </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
            {orders.length > 0 || canGoPrev ? (
              <CursorPaginationBar
                pageIndex={pageIndex}
                pageSize={pageSize}
                itemCount={orders.length}
                hasMore={hasMore}
                canGoPrev={canGoPrev}
                onPrev={goPrev}
                onNext={goNext}
                onPageSizeChange={setPageSize}
                onPageSelect={goToPage}
                canSelectPage={canSelectPage}
                isBusy={isFetching}
              />
            ) : null}
          </div>
        )}
      </ListPageShell>
    </div>
  );
}
