"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { HrView } from "@/components/pages/HrView";
import { PayrollView } from "@/components/pages/PayrollView";
import { HrmSettingsView } from "@/components/pages/HrmSettingsView";
import {
  HrmAttendanceView,
  HrmDepartmentsView,
  HrmDesignationsView,
  HrmHolidayView,
  HrmLeaveTypeView,
  HrmLeaveView,
  HrmSalesTargetsView,
} from "@/components/pages/HrmEssentialsViews";
import { getWorkforceStats } from "@/lib/api/hrm";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import {
  HRM_TABS,
  HRM_SLUG_TO_TAB,
  type HrmTab,
} from "@/lib/registries/hrmTabs";
import { useTenantStore } from "@/stores/tenantStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { tenantListPath } from "@/lib/utils/tenantRoutes";

export { HRM_TABS, HRM_SLUG_TO_TAB, type HrmTab } from "@/lib/registries/hrmTabs";

function HrmDashboardPanel({ onOpenPayroll }: { onOpenPayroll: () => void }) {
  const { tenantId, tenantCode } = useRouteTenant();
  const isHq6 = useIsVaHq6();
  const payrollHref = tenantCode
    ? `${tenantListPath(tenantCode, "hrm")}/my-payrolls`
    : null;
  const statsQuery = useQuery({
    queryKey: ["workforce", tenantId, "stats"],
    enabled: Boolean(tenantId),
    queryFn: () => getWorkforceStats(tenantId!),
    staleTime: ADMIN_ENTITY_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const totalCount = statsQuery.data?.totalCount ?? 0;
  const byLocation = (statsQuery.data?.byLocation ?? []).map((row) => [
    row.locationCode ?? "Unassigned",
    row.count,
  ] as const);

  const card = isHq6
    ? "hq6-card overflow-hidden"
    : "rounded-xl border border-border bg-card shadow-card";
  const cardPad = isHq6 ? "p-3" : "p-4";
  const head = isHq6
    ? "border-b border-[var(--hq6-border)] px-3 py-2 text-sm font-semibold"
    : "border-b border-border px-4 py-3 text-sm font-semibold text-foreground";

  return (
    <div className={isHq6 ? "space-y-3 p-1" : "space-y-6 p-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className={`${card} ${cardPad}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#777]">My leaves</p>
            <p className="mt-3 text-sm text-[#777]">No data</p>
          </div>
          <div className={`${card} ${cardPad}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#777]">
              My sales targets
            </p>
            <p className="mt-2 text-sm">
              Target achieved last month: {formatCurrency(0, "NGN")}
            </p>
            <p className="text-sm">Target achieved this month: {formatCurrency(0, "NGN")}</p>
            <table className="mt-3 w-full text-xs">
              <thead>
                <tr className="text-left text-[#777]">
                  <th className="pb-1">Targets</th>
                  <th className="pb-1">Commission Percent</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={2} className="py-2 text-[#777]">
                    No data
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {isHq6 && payrollHref ? (
          <Link
            href={payrollHref}
            className="hq6-btn shrink-0 bg-[var(--hq6-success,#5cb85c)] text-white hover:opacity-90"
          >
            My Payrolls
          </Link>
        ) : isHq6 ? (
          <button
            type="button"
            className="hq6-btn shrink-0 bg-[var(--hq6-success,#5cb85c)] text-white hover:opacity-90"
            onClick={onOpenPayroll}
          >
            My Payrolls
          </button>
        ) : (
          <Button size="sm" className="gap-2 shrink-0" variant="secondary" onClick={onOpenPayroll}>
            <Wallet className="h-4 w-4" />
            My Payrolls
          </Button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className={card}>
          <div className={`flex items-center gap-3 ${head}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3c8dbc]/10 text-[#3c8dbc]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase text-[#777]">Users</p>
              <p className="text-lg font-semibold">{totalCount}</p>
            </div>
          </div>
          <div className={cardPad}>
            {statsQuery.isLoading ? (
              <p className="text-sm text-[#777]">Loading…</p>
            ) : byLocation.length === 0 ? (
              <p className="text-sm text-[#777]">No data</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {byLocation.map(([location, count]) => (
                    <tr key={location} className="border-t border-[var(--hq6-border,#eee)]">
                      <td className="py-1.5">{location}</td>
                      <td className="py-1.5 text-right tabular-nums">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={`${card} ${cardPad}`}>
          <p className="mb-3 text-sm font-semibold">Leaves</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-[#777]">Today</p>
              <p className="mt-1 text-[#777]">No data</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-[#777]">Upcoming</p>
              <p className="mt-1 text-[#777]">No data</p>
            </div>
          </div>
        </div>

        <div className={`${card} ${cardPad}`}>
          <p className="mb-3 text-sm font-semibold">Holidays</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-[#777]">Today</p>
              <p className="mt-1 text-[#777]">No data</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-[#777]">Upcoming</p>
              <p className="mt-1 text-[#777]">No data</p>
            </div>
          </div>
        </div>
      </div>

      {isHq6 ? null : (
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={card}>
          <p className={head}>Today&apos;s Attendance</p>
          <div className={cardPad}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#777]">
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Clock In</th>
                  <th className="pb-2">Clock Out</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[#777]">
                    No data
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className={card}>
          <p className={head}>Sales targets</p>
          <div className={cardPad}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#777]">
                  <th className="pb-2">User</th>
                  <th className="pb-2">Target achieved last month</th>
                  <th className="pb-2">Target achieved this month</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="py-4 text-center text-[#777]">
                    No data available in table
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
export function HrmPageView({
  defaultTab = "dashboard",
  forceFullTabs = false,
}: {
  defaultTab?: HrmTab;
  /** Admin / VAG: always show the full VA HRM tab set. */
  forceFullTabs?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<HrmTab>(defaultTab);
  const tenantConfig = useTenantStore((state) => state.tenantConfig);
  const isHq6 = useIsVaHq6();
  const essentialsEnabled = tenantConfig?.enabledModules.includes("hrmEssentials") ?? false;
  const fullTabs = forceFullTabs || isHq6 || essentialsEnabled;

  const visibleTabs = useMemo(
    () =>
      HRM_TABS.filter((tab) => {
        if (isHq6) {
          return ![
            "pay-components",
            "hr-people",
          ].includes(tab.id);
        }
        if (fullTabs) return true;
        return ![
          "leave-type",
          "leave",
          "attendance",
          "holiday",
          "departments",
          "designations",
          "sales-targets",
          "settings",
        ].includes(tab.id);
      }).map((tab) =>
        (forceFullTabs || isHq6) && tab.id === "dashboard"
          ? { ...tab, label: "HRM" }
          : tab,
      ),
    [forceFullTabs, fullTabs, isHq6],
  );

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("dashboard");
    }
  }, [activeTab, visibleTabs]);

  const tabContent = (() => {
    switch (activeTab) {
      case "dashboard":
        return <HrmDashboardPanel onOpenPayroll={() => setActiveTab("payroll")} />;
      case "leave-type":
        return <HrmLeaveTypeView />;
      case "leave":
        return <HrmLeaveView />;
      case "attendance":
        return <HrmAttendanceView />;
      case "pay-components":
        return <PayrollView embedded defaultTab="components" />;
      case "payroll":
        return <PayrollView embedded defaultTab="payrolls" />;
      case "holiday":
        return <HrmHolidayView />;
      case "departments":
        return <HrmDepartmentsView />;
      case "designations":
        return <HrmDesignationsView />;
      case "sales-targets":
        return <HrmSalesTargetsView />;
      case "hr-people":
        return <HrView embedded />;
      case "settings":
        return <HrmSettingsView />;
      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }
  })();

  const showToolbar =
    activeTab !== "dashboard" &&
    activeTab !== "hr-people" &&
    activeTab !== "payroll" &&
    activeTab !== "settings" &&
    activeTab !== "attendance";

  return (
    <ListPageShell
      tabs={visibleTabs.map((tab) => ({ id: tab.id, label: tab.label }))}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as HrmTab)}
      showImport={false}
      showExport={showToolbar}
      showDateRange={false}
      showSearch={false}
      hq6Title="HRM"
      hq6Subtitle="Human resource management"
      hq6PageChrome={!isHq6}
    >
      {tabContent}
    </ListPageShell>
  );
}
