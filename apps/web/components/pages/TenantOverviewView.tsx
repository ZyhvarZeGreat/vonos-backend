"use client";

import { useQuery } from "@tanstack/react-query";
import { PendingOrdersPanel } from "@/components/organisms/PendingOrdersPanel";
import { FloatingActionButton } from "@/components/atoms/FloatingActionButton";
import { ActivityFeedPanel } from "@/components/organisms/ActivityFeedPanel";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { Sidebar } from "@/components/organisms/Sidebar";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import { getTenantConfig } from "@/lib/api";
import { getOverviewDashboard } from "@/lib/api/overview";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { useRecentActivityFeed } from "@/lib/hooks/useRecentActivityFeed";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { navSectionsForTenant } from "@/lib/utils/navRoutes";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { AdminViewingBanner } from "@/components/molecules/AdminViewingBanner";
import { OverviewLiveBody } from "@/components/pages/OverviewLiveBody";
import type { TenantCode } from "@/lib/registries/tenants";

interface OverviewProps {
  tenantCode: TenantCode;
}

function useOverviewShell(tenantCode: TenantCode) {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const authName = useAuthStore((state) => state.name);
  const authEmail = useAuthStore((state) => state.email);
  const { tenantId, config } = useRouteTenant();
  const fallback = getTenantConfigByCode(tenantCode)!;

  const configQuery = useQuery({
    queryKey: ["tenantConfig", tenantId],
    queryFn: () => getTenantConfig(tenantId!),
    enabled: Boolean(tenantId),
  });

  const authRole = useAuthStore((state) => state.role);
  const finalConfig = configQuery.data ?? config ?? fallback;
  const tenantName = finalConfig.name ?? tenantCode;

  const { items: activityItems, isLoading: activityLoading } = useRecentActivityFeed(tenantId);

  const topSlot =
    authRole === "super_admin" ? (
      <AdminViewingBanner tenantCode={tenantCode} tenantName={tenantName} />
    ) : undefined;

  const sidebar = (
    <Sidebar
      sections={navSectionsForTenant(tenantCode, finalConfig)}
      tenantName={tenantName}
      tenantCode={tenantCode}
      userName={authName ?? undefined}
      userEmail={authEmail ?? undefined}
      activeRoute={`/${tenantCode}/overview`}
      collapsed={sidebarCollapsed}
    />
  );

  return {
    tenantId,
    finalConfig,
    sidebar,
    topSlot,
    activityItems,
    activityLoading,
    tenantName,
  };
}

function EntityOverviewView({ tenantCode }: OverviewProps) {
  const {
    tenantId,
    sidebar,
    topSlot,
    activityItems,
    activityLoading,
    tenantName,
  } = useOverviewShell(tenantCode);
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
      sidebar={sidebar}
      topSlot={topSlot}
      title="Overview"
      tenantCode={tenantCode}
      tenantName={tenantName}
      primaryAction={<DateRangeDropdown value={dateRange} onChange={setDateRange} />}
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
