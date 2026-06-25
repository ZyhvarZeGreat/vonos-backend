"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart } from "lucide-react";
import { AdminEntityBanner } from "@/components/molecules/AdminEntityBanner";
import { DateRangeDropdown } from "@/components/molecules/DateRangeDropdown";
import { ReportsDashboardBody, REPORT_TABS } from "@/components/pages/ReportsView";
import { getReportsDashboard } from "@/lib/api/reports";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { reportsForArchetype } from "@/lib/registries/reportRegistry";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";

export interface AdminEntityReportsHubProps {
  tenantCode: TenantCode;
}

export function AdminEntityReportsHub({ tenantCode }: AdminEntityReportsHubProps) {
  const tenant = getTenantByCode(tenantCode);
  const config = getTenantConfigByCode(tenantCode);
  const archetype = tenant?.archetype ?? "stock";
  const tabs = REPORT_TABS[archetype] ?? REPORT_TABS.stock;
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "valuation");
  const { dateRange, setDateRange, bounds } = useListPageFilters();

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
  });

  const registryReports = reportsForArchetype(archetype, enabledModules);

  if (!tenant) {
    return (
      <p className="text-sm text-muted">Unknown entity code &quot;{tenantCode}&quot;.</p>
    );
  }

  return (
    <div className="space-y-8">
      <AdminEntityBanner
        tenantCode={tenantCode}
        tenantName={tenant.name}
        backHref="/admin/reports"
        backLabel="Back to group reports"
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">Archetype dashboard</h3>
            <p className="text-sm text-muted">
              Summary charts for {tenant.name} — open a report below for full detail sheets.
            </p>
          </div>
          <DateRangeDropdown value={dateRange} onChange={setDateRange} />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-[var(--color-surface-muted)] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <ReportsDashboardBody
          tenantCode={tenantCode}
          dashboard={query.data}
          isLoading={query.isLoading}
          error={query.error}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">All reports</h3>
          <p className="text-sm text-muted">
            Printable detail sheets for each report type available to this entity.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {registryReports.map((entry) => (
            <Link
              key={entry.id}
              href={`/admin/reports/${tenantCode}/${entry.slug}`}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-[var(--color-brand-primary)]/40 hover:bg-[var(--color-surface-muted)]/40"
            >
              <FileBarChart className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <div>
                <p className="text-sm font-medium text-foreground">{entry.label}</p>
                <p className="mt-0.5 text-xs text-muted">Open report sheet →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
