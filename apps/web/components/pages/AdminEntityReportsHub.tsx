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
import { REPORT_SLUG_TO_HQ6_PATH } from "@/lib/registries/hq6ReportRoutes";
import { REPORT_TABS } from "@/lib/registries/reportTabs";
import { PAYMENT_ACCOUNT_PAGE_TABS } from "@/lib/registries/paymentAccountNav";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import { getTenantConfigByCode } from "@/lib/registries/tenantConfigs";
import { reportsForArchetype } from "@/lib/registries/reportRegistry";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { cn } from "@/lib/utils/cn";
import { tenantBasePath } from "@/lib/utils/tenantMount";

export interface AdminEntityReportsHubProps {
  tenantCode: TenantCode;
  /** When true, omit outer Hq6PageFrame (caller provides chrome). */
  embedded?: boolean;
  title?: string;
  subtitle?: string;
  /**
   * `admin` — links under `/admin/reports/{code}/…`
   * `tenant` — links under `/{code}/reports/{hq6Path}` (same as VA sidebar)
   */
  linkMode?: "admin" | "tenant";
  showBackToGroup?: boolean;
}

export function AdminEntityReportsHub({
  tenantCode,
  embedded = false,
  title,
  subtitle,
  linkMode = "admin",
  showBackToGroup = true,
}: AdminEntityReportsHubProps) {
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

  const registryReports = reportsForArchetype(archetype, enabledModules).filter(
    (entry) => entry.source.kind !== "payment-accounts",
  );

  const paymentAccountReports = PAYMENT_ACCOUNT_PAGE_TABS.filter(
    (tab) => tab.slug !== "payment-accounts",
  );

  if (!tenant) {
    return (
      <p className="text-sm text-muted">Unknown entity code &quot;{tenantCode}&quot;.</p>
    );
  }

  const reportHref = (slug: string) => {
    if (linkMode === "tenant") {
      const hq6Path = REPORT_SLUG_TO_HQ6_PATH[slug] ?? slug.replace(/^report-/, "");
      return `${tenantBasePath(tenantCode)}/reports/${hq6Path}`;
    }
    return `/admin/reports/${tenantCode}/${slug}`;
  };

  const body = (
    <div className="space-y-6">
      <div className="hq6-card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
        <p className="text-[#6b7280]">
          Viewing{" "}
          <span className="font-semibold text-[#111827]">{tenant.name}</span>
          {showBackToGroup && linkMode === "admin" ? (
            <>
              {" · "}
              <Link
                href="/admin/reports"
                className="font-medium text-info hover:underline"
              >
                Back to group reports
              </Link>
            </>
          ) : null}
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
            Summary charts for {tenant.name} — open a report below for full
            detail sheets.
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
            Printable detail sheets — same set as the Reports sidebar.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {registryReports.map((entry) => (
            <Link
              key={entry.id}
              href={reportHref(entry.slug)}
              className="hq6-card hq6-report-link-card flex items-start gap-3 transition-colors hover:border-[var(--color-brand-primary)]/40"
            >
              <FileBarChart className="mt-0.5 h-6 w-6 shrink-0 text-[#6b7280]" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#111827]">
                  {entry.label}
                </p>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Open report sheet →
                </p>
              </div>
            </Link>
          ))}
          {paymentAccountReports.map((tab) => (
            <Link
              key={tab.slug}
              href={
                linkMode === "tenant"
                  ? `${tenantBasePath(tenantCode)}/${tab.slug}`
                  : `/admin/reports/${tenantCode}/${tab.slug}`
              }
              className="hq6-card hq6-report-link-card flex items-start gap-3 transition-colors hover:border-[var(--color-brand-primary)]/40"
            >
              <FileBarChart className="mt-0.5 h-6 w-6 shrink-0 text-[#6b7280]" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-[#111827]">
                  {tab.label}
                </p>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Trial / account sheet →
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );

  if (embedded) {
    return (
      <Hq6PageFrame
        title={title ?? `Reports — ${tenant.name}`}
        subtitle={
          subtitle ?? "Archetype dashboard and printable report sheets"
        }
      >
        {body}
      </Hq6PageFrame>
    );
  }

  return (
    <Hq6PageFrame
      title={title ?? `Reports — ${tenant.name}`}
      subtitle={subtitle ?? "Archetype dashboard and printable report sheets"}
    >
      {body}
    </Hq6PageFrame>
  );
}
