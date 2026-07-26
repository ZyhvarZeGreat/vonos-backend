"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart } from "lucide-react";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { ReportsDashboardBody } from "@/components/pages/ReportsView";
import { getReportsDashboard } from "@/lib/api/reports";
import { ROUTE_PREFETCH_STALE_MS } from "@/lib/prefetch/routePrefetchRegistry";
import { REPORT_TABS } from "@/lib/registries/reportTabs";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { reportsForArchetype } from "@/lib/registries/reportRegistry";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { cn } from "@/lib/utils/cn";

export interface AdminEntityReportsHubProps {
  tenantCode: TenantCode;
}

export function AdminEntityReportsHub({ tenantCode }: AdminEntityReportsHubProps) {
  const tenant = getTenantByCode(tenantCode);
  const config = getTenantConfigByCode(tenantCode);
  const archetype = tenant?.archetype ?? "stock";
  const tabs = REPORT_TABS[archetype] ?? REPORT_TABS.stock;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "valuation");
  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    bounds,
  } = useListPageFilters({
    defaultDateRange: "last_7_days",
    unboundedAllTime: false,
    isolateDateRange: true,
  });

  const tenantId = tenant?.tenantId;
  const enabledModules = config?.enabledModules ?? [];

  const query = useQuery({
    queryKey: ["adminReportsDashboard", tenantId, activeTab, bounds?.from, bounds?.to],
    queryFn: () =>
      getReportsDashboard({
        tab: activeTab,
        from: bounds?.from,
        to: bounds?.to,
        tenantId: tenantId!,
      }),
    enabled: Boolean(tenantId),
    staleTime: ROUTE_PREFETCH_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const registryReports = reportsForArchetype(archetype, enabledModules);

  if (!tenant) {
    return (
      <p className="text-sm text-muted">Unknown entity code &quot;{tenantCode}&quot;.</p>
    );
  }

  return (
    <Hq6PageFrame
      title={`Reports — ${tenant.name}`}
      subtitle="Archetype dashboard and printable report sheets"
    >
      <div className="space-y-6">
        <div className="hq6-card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <p className="text-[#6b7280]">
            Viewing{" "}
            <span className="font-semibold text-[#111827]">{tenant.name}</span>
            {" · "}
            <Link href="/admin/reports" className="font-medium text-info hover:underline">
              Back to group reports
            </Link>
          </p>
          <DateRangeDropdown
            value={dateRange}
            onChange={setDateRange}
            customValue={customDateRange}
            onCustomChange={setCustomDateRange}
          />
        </div>

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">Dashboard</h3>
            <p className="text-sm text-[#6b7280]">
              Summary charts for {tenant.name} — open a report below for full detail sheets.
            </p>
          </div>
          <div className="hq6-tab-row max-w-full overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "hq6-tab shrink-0",
                  activeTab === tab.id && "hq6-tab-active",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ReportsDashboardBody
            tenantCode={tenantCode}
            dashboard={query.data}
            isLoading={query.isLoading || query.isFetching}
            error={query.error}
            dateRange={dateRange}
            setDateRange={setDateRange}
            customDateRange={customDateRange}
            setCustomDateRange={setCustomDateRange}
          />
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-[#111827]">All reports</h3>
            <p className="text-sm text-[#6b7280]">
              Printable detail sheets for each report type available to this entity.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {registryReports.map((entry) => (
              <Link
                key={entry.id}
                href={`/admin/reports/${tenantCode}/${entry.slug}`}
                className="hq6-card flex items-start gap-3 p-4 transition-colors hover:border-[var(--color-brand-primary)]/40"
              >
                <FileBarChart className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
                <div>
                  <p className="text-sm font-medium text-[#111827]">{entry.label}</p>
                  <p className="mt-0.5 text-xs text-[#6b7280]">Open report sheet →</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Hq6PageFrame>
  );
}
