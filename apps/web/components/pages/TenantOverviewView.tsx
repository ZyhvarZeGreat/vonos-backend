"use client";

import { useQuery } from "@tanstack/react-query";
import { PendingOrdersPanel } from "@/components/organisms/PendingOrdersPanel";
import { FloatingActionButton } from "@/components/atoms/FloatingActionButton";
import { ActivityFeedPanel } from "@/components/organisms/ActivityFeedPanel";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import { getOverviewDashboard } from "@/lib/api/overview";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { useRecentActivityFeed } from "@/lib/hooks/useRecentActivityFeed";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { OverviewLiveBody } from "@/components/pages/OverviewLiveBody";
import { ROUTE_PREFETCH_STALE_MS } from "@/lib/prefetch/routePrefetchRegistry";
import type { TenantCode } from "@/lib/registries/tenants";

interface OverviewProps {
  tenantCode: TenantCode;
}

function EntityOverviewView({ tenantCode }: OverviewProps) {
  const { tenantId } = useRouteTenant();
  const { items: activityItems, isLoading: activityLoading } =
    useRecentActivityFeed(tenantId);
  const { dateRange, setDateRange, bounds } = useListPageFilters();
  const entry = getTenantConfigByCode(tenantCode);
  const archetype = entry?.archetype ?? "stock";
  const isCafe = tenantCode === "VC";

  const overviewQuery = useQuery({
    queryKey: ["overviewDashboard", tenantId, bounds?.from, bounds?.to],
    queryFn: () =>
      getOverviewDashboard({
        from: bounds?.from,
        to: bounds?.to,
      }),
    enabled: Boolean(tenantId),
    staleTime: ROUTE_PREFETCH_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const pendingOrders =
    overviewQuery.data?.table?.rows.map((row) => ({
      id: String(row.id),
      ref: String(row.ref ?? row.reference ?? "—"),
      name: String(row.name ?? row.customer ?? "—"),
      date: String(row.date ?? row.dueDate ?? "—"),
      carrier: String(row.carrier ?? row.items ?? "—"),
      status: String(row.status ?? "Pending"),
    })) ?? [];

  const showPendingOrders =
    archetype === "stock" && tenantCode !== "VKW" && pendingOrders.length > 0;

  return (
    <DashboardTemplate
      beforeContent={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
        </div>
      }
      kpiRow={
        <OverviewLiveBody
          tenantCode={tenantCode}
          archetype={archetype}
          dashboard={overviewQuery.data}
          isLoading={overviewQuery.isLoading}
          error={overviewQuery.error}
          dateRange={dateRange}
        />
      }
      table={showPendingOrders ? <PendingOrdersPanel orders={pendingOrders} /> : undefined}
      feed={
        archetype === "appointment" ? (
          <ActivityFeedPanel
            title="Activity Feed"
            subtitle="Recent salon events"
            items={activityItems}
            isLoading={activityLoading}
          />
        ) : (
          <ActivityFeedPanel items={activityItems} isLoading={activityLoading} />
        )
      }
      fab={
        archetype === "stock" || isCafe ? (
          <FloatingActionButton label={isCafe ? "New order" : "Quick action"} />
        ) : undefined
      }
    />
  );
}

export function StockOverviewView({ tenantCode }: OverviewProps) {
  return <EntityOverviewView tenantCode={tenantCode} />;
}

export function TransactionOverviewView({ tenantCode }: OverviewProps) {
  return <EntityOverviewView tenantCode={tenantCode} />;
}

export function JobOverviewView({ tenantCode }: OverviewProps) {
  return <EntityOverviewView tenantCode={tenantCode} />;
}

export function AppointmentOverviewView({ tenantCode }: OverviewProps) {
  return <EntityOverviewView tenantCode={tenantCode} />;
}

export function TenantOverviewView({ tenantCode }: OverviewProps) {
  return <EntityOverviewView tenantCode={tenantCode} />;
}
