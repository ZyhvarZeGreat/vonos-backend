"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { HrView } from "@/components/pages/HrView";
import { PayrollView } from "@/components/pages/PayrollView";
import { createPosPlaceholderView } from "@/components/pages/PosNavViews";
import { getWorkforce } from "@/lib/api/hrm";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { ADMIN_ENTITY_STALE_MS } from "@/lib/admin/prefetchAdminEntity";
import { useTenantStore } from "@/stores/tenantStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export const HRM_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "leave-type", label: "Leave Type" },
  { id: "leave", label: "Leave" },
  { id: "attendance", label: "Attendance" },
  { id: "pay-components", label: "Allowance & Deduction" },
  { id: "payroll", label: "Payroll" },
  { id: "holiday", label: "Holiday" },
  { id: "departments", label: "Departments" },
  { id: "designations", label: "Designations" },
  { id: "sales-targets", label: "Sales Targets" },
  { id: "hr-people", label: "HR & People" },
  { id: "settings", label: "Settings" },
] as const;

export type HrmTab = (typeof HRM_TABS)[number]["id"];

/** Map legacy sidebar slugs → tab id (bookmarks / entity switcher). */
export const HRM_SLUG_TO_TAB: Record<string, HrmTab> = {
  hrm: "dashboard",
  "hrm-dashboard": "dashboard",
  "leave-type": "leave-type",
  leave: "leave",
  attendance: "attendance",
  "pay-components": "pay-components",
  payroll: "payroll",
  holiday: "holiday",
  departments: "departments",
  designations: "designations",
  "sales-targets": "sales-targets",
  hr: "hr-people",
  "hr-people": "hr-people",
  /** HRM settings tab only — must NOT use bare `settings` (that is Business Settings). */
  "hrm-settings": "settings",
};

const Placeholder = createPosPlaceholderView;

function HrmPlaceholder({ title, message }: { title: string; message?: string }) {
  const View = Placeholder(title, message);
  return <View />;
}

function HrmDashboardPanel({ onOpenPayroll }: { onOpenPayroll: () => void }) {
  const { tenantId } = useRouteTenant();
  const isHq6 = useIsVaHq6();
  const workforceQuery = useQuery({
    queryKey: ["workforce", tenantId, "dashboard"],
    enabled: Boolean(tenantId),
    queryFn: () => getWorkforce(tenantId!),
    staleTime: ADMIN_ENTITY_STALE_MS,
    placeholderData: (prev) => prev,
  });

  const workforce = workforceQuery.data ?? [];
  const byLocation = Object.entries(
    workforce.reduce<Record<string, number>>((acc, row) => {
      const key = row.locationCode ?? "Unassigned";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  );

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
        {isHq6 ? (
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
              <p className="text-lg font-semibold">{workforce.length}</p>
            </div>
          </div>
          <div className={cardPad}>
            {workforceQuery.isLoading ? (
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
    </div>
  );
}
export function HrmPageView({ defaultTab = "dashboard" }: { defaultTab?: HrmTab }) {
  const [activeTab, setActiveTab] = useState<HrmTab>(defaultTab);
  const tenantConfig = useTenantStore((state) => state.tenantConfig);
  const isHq6 = useIsVaHq6();
  const essentialsEnabled = tenantConfig?.enabledModules.includes("hrmEssentials") ?? false;

  const visibleTabs = useMemo(
    () =>
      HRM_TABS.filter((tab) => {
        if (isHq6 || essentialsEnabled) return true;
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
        isHq6 && tab.id === "dashboard"
          ? { ...tab, label: "HRM" }
          : isHq6 && tab.id === "pay-components"
            ? { ...tab, label: "Payroll" }
            : tab,
      ),
    [essentialsEnabled, isHq6],
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
        return <HrmPlaceholder title="Leave Type" message="Configure leave types for employee requests." />;
      case "leave":
        return <HrmPlaceholder title="Leave" message="Manage employee leave requests." />;
      case "attendance":
        return <HrmPlaceholder title="Attendance" message="Track employee clock-in and attendance." />;
      case "pay-components":
        return <PayrollView embedded defaultTab="components" />;
      case "payroll":
        return <PayrollView embedded defaultTab="payrolls" />;
      case "holiday":
        return <HrmPlaceholder title="Holiday" message="Manage company holidays." />;
      case "departments":
        return <HrmPlaceholder title="Departments" message="Manage employee departments." />;
      case "designations":
        return <HrmPlaceholder title="Designations" message="Manage job designations and titles." />;
      case "sales-targets":
        return <HrmPlaceholder title="Sales Targets" message="Set and track staff sales targets." />;
      case "hr-people":
        return <HrView embedded />;
      case "settings":
        return <HrmPlaceholder title="HRM Settings" message="Essentials and HRM configuration." />;
      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }
  })();

  const showToolbar = activeTab !== "dashboard" && activeTab !== "hr-people" && activeTab !== "payroll";

  return (
    <ListPageShell
      tabs={visibleTabs.map((tab) => ({ id: tab.id, label: tab.label }))}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as HrmTab)}
      showImport={false}
      showExport={showToolbar}
      showDateRange={false}
      showSearch={false}
    >
      {tabContent}
    </ListPageShell>
  );
}
