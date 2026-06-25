"use client";

import { Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { FloatingActionButton } from "@/components/atoms/FloatingActionButton";
import { Input } from "@/components/atoms/Input";
import { SearchBar } from "@/components/atoms/SearchBar";
import { Select } from "@/components/atoms/Select";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Avatar } from "@/components/atoms/Avatar";
import { StatValue } from "@/components/atoms/StatValue";
import { KpiCard } from "@/components/molecules/KpiCard";
import { ActivityFeedPanel } from "@/components/organisms/ActivityFeedPanel";
import { ChartPanel } from "@/components/organisms/ChartPanel";
import { DataTable } from "@/components/organisms/DataTable";
import { KpiRow } from "@/components/organisms/KpiRow";
import { PendingOrdersPanel } from "@/components/organisms/PendingOrdersPanel";
import { Sidebar } from "@/components/organisms/Sidebar";
import { TopBar } from "@/components/organisms/TopBar";
import {
  buildAdaptiveJobStages,
  StatusStepper,
} from "@/components/organisms/StatusStepper";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import { getItems, getKpiSummary, getTenantConfig } from "@/lib/api";
import { homeReference } from "@/lib/registries/homeReference";
import {
  sampleActivity,
  sampleChartData,
  sampleKpiDeltas,
  samplePendingOrders,
} from "@/app/dev/design-system/samples";
import { warehouseTenantConfig, navSectionsForConfig } from "@/lib/registries/tenantConfigs";
import { formatCurrency } from "@/lib/utils/formatCurrency";

const warehouseNavSections = navSectionsForConfig(warehouseTenantConfig);

export default function DesignSystemPage() {
  const configQuery = useQuery({
    queryKey: ["tenantConfig", "tenant_vw_001"],
    queryFn: () => getTenantConfig("tenant_vw_001"),
  });
  const itemsQuery = useQuery({
    queryKey: ["items", "tenant_vw_001"],
    queryFn: () => getItems("tenant_vw_001"),
  });
  const kpiQuery = useQuery({
    queryKey: ["kpi", "tenant_vw_001"],
    queryFn: () => getKpiSummary("tenant_vw_001"),
  });

  const config = configQuery.data ?? warehouseTenantConfig;
  const kpi = kpiQuery.data;

  return (
    <div className="space-y-10 p-6">
      <header>
        <h1 className="text-3xl font-semibold text-foreground">Design System</h1>
        <p className="mt-2 text-sm text-muted">
          Aligned to <code className="text-xs">apps/home.jsx</code> — light sidebar, gray-900
          primary, KPI tints, 400px charts, pending orders + activity feed. Registry:{" "}
          <code className="text-xs">lib/registries/homeReference.ts</code>
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Atoms</h2>
        <div className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2 xl:grid-cols-4">
          <Button>Primary (gray-900)</Button>
          <Button variant="secondary">Secondary</Button>
          <StatusPill status="in_stock" vocabulary="stockStatus" />
          <StatusPill status="Ready" vocabulary="orderStatus" />
          <Avatar name="William Smith" />
          <StatValue value={1284} delta={12} deltaLabel="this week" />
          <Input label="SKU" placeholder="Search SKU" />
          <Select
            label="Category"
            options={[
              { label: "Brakes", value: "brakes" },
              { label: "Filters", value: "filters" },
            ]}
          />
          <SearchBar placeholder="Search..." showShortcut />
          <EmptyState title="No items" message="Add your first SKU to get started." />
          <FloatingActionButton className="relative bottom-0 right-0" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Molecules & Stepper</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <KpiCard
            label="Total SKU"
            icon={Package}
            value={1284}
            delta={12}
            deltaLabel="this week"
            tint="emerald"
          />
          <StatusStepper
            config={{
              stages: buildAdaptiveJobStages(true),
              currentStage: "In Progress",
            }}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Organisms</h2>
        <KpiRow
          cards={config.kpiCards}
          values={{
            totalSku: kpi?.totalSku ?? 1284,
            todayInbound: kpi?.todayInbound ?? 48,
            todayOutbound: kpi?.todayOutbound ?? 73,
            stockValue: kpi ? formatCurrency(kpi.stockValue, kpi.currency) : "$ 2.4M",
          }}
          deltas={{
            totalSku: sampleKpiDeltas.totalSku.delta,
            todayInbound: sampleKpiDeltas.todayInbound.delta,
            todayOutbound: sampleKpiDeltas.todayOutbound.delta,
          }}
          deltaLabels={{
            totalSku: sampleKpiDeltas.totalSku.deltaLabel,
            todayInbound: sampleKpiDeltas.todayInbound.deltaLabel,
            todayOutbound: sampleKpiDeltas.todayOutbound.deltaLabel,
            stockValue: sampleKpiDeltas.stockValue.deltaLabel,
          }}
          deltaPercents={{ stockValue: sampleKpiDeltas.stockValue.deltaPercent }}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartPanel
            title="Stock Level Trend"
            subtitle="From home.jsx reference"
            type="bar"
            data={sampleChartData}
            series={[
              { name: "Inbound", dataKey: "inbound", color: "#3b82f6" },
              { name: "Outbound", dataKey: "outbound", color: "#93c5fd" },
            ]}
          />
          <ActivityFeedPanel items={sampleActivity} />
        </div>
        <PendingOrdersPanel orders={samplePendingOrders} />
        <DataTable
          data={itemsQuery.data ?? []}
          isLoading={itemsQuery.isLoading}
          error={itemsQuery.error ? "Failed to load items" : null}
          displayMode="table"
          columns={[
            { key: "sku", header: "SKU" },
            { key: "name", header: "Name" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <StatusPill status={row.status} vocabulary="stockStatus" />
              ),
            },
            {
              key: "quantity",
              header: "Qty",
              render: (row) => String(row.quantity),
            },
          ]}
          filters={[{ key: "name", label: "Search name", type: "text" }]}
          emptyState={{ message: "No inventory items found." }}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Template Preview (home.jsx layout)</h2>
        <div className="h-[720px] overflow-hidden rounded-xl border border-border">
          <DashboardTemplate
            sidebar={
              <Sidebar
                sections={warehouseNavSections}
                tenantName={config.name}
                tenantCode={config.code}
                activeRoute="/VW/overview"
              />
            }
            title="Overview"
            kpiRow={
              <KpiRow
                cards={config.kpiCards}
                values={{
                  totalSku: 1284,
                  todayInbound: 48,
                  todayOutbound: 73,
                  stockValue: "$ 2.4M",
                }}
                deltas={{
                  totalSku: 12,
                  todayInbound: 8,
                  todayOutbound: -5,
                }}
                deltaLabels={{
                  totalSku: "this week",
                  todayInbound: "vs yesterday",
                  todayOutbound: "this week",
                  stockValue: "this week",
                }}
                deltaPercents={{ stockValue: "+3.2%" }}
              />
            }
            charts={
              <>
                <ChartPanel
                  title={homeReference.charts.panels[0].title}
                  type="bar"
                  data={sampleChartData}
                  series={[{ name: "Inbound", dataKey: "inbound", color: "#3b82f6" }]}
                />
                <ChartPanel
                  title={homeReference.charts.panels[1].title}
                  type="line"
                  data={sampleChartData}
                  series={[
                    { name: "Inbound", dataKey: "inbound", color: "#ef4444" },
                    { name: "Outbound", dataKey: "outbound", color: "#3b82f6" },
                  ]}
                />
              </>
            }
            table={<PendingOrdersPanel orders={samplePendingOrders} />}
            feed={<ActivityFeedPanel items={sampleActivity} />}
            fab={<FloatingActionButton />}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <TopBar title="Overview" />
      </section>
    </div>
  );
}
