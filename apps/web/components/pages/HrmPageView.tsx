"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { HrView } from "@/components/pages/HrView";
import { PayrollView } from "@/components/pages/PayrollView";
import { createPosPlaceholderView } from "@/components/pages/PosNavViews";
import { getWorkforce } from "@/lib/api/hrm";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
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
  "hrm-settings": "settings",
  settings: "settings",
};

const Placeholder = createPosPlaceholderView;

function HrmPlaceholder({ title, message }: { title: string; message?: string }) {
  const View = Placeholder(title, message);
  return <View />;
}

function HrmDashboardPanel({ onOpenPayroll }: { onOpenPayroll: () => void }) {
  const { tenantId } = useRouteTenant();
  const workforceQuery = useQuery({
    queryKey: ["workforce", tenantId, "dashboard"],
    enabled: Boolean(tenantId),
    queryFn: () => getWorkforce(tenantId!),
  });

  const workforce = workforceQuery.data ?? [];
  const totalNet = workforce.reduce((sum, row) => sum + row.totalNetPay, 0);

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">My leaves</p>
            <p className="mt-3 text-sm text-muted">No data</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">My sales targets</p>
            <p className="mt-2 text-sm text-foreground">Target achieved last month: {formatCurrency(0, "NGN")}</p>
            <p className="text-sm text-foreground">Target achieved this month: {formatCurrency(0, "NGN")}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Workforce</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{workforce.length}</p>
            <p className="mt-1 text-sm text-muted">Total net paid: {formatCurrency(totalNet, "NGN")}</p>
          </div>
        </div>
        <Button size="sm" className="gap-2 shrink-0" variant="secondary" onClick={onOpenPayroll}>
          <Wallet className="h-4 w-4" />
          My Payrolls
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-info-bg)] text-[var(--color-brand-primary)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Users</p>
              <p className="text-xl font-semibold text-foreground">{workforce.length}</p>
            </div>
          </div>
          <div className="p-4">
            {workforceQuery.isLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : workforce.length === 0 ? (
              <p className="text-sm text-muted">No workforce data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted">
                    <th className="pb-2">Location</th>
                    <th className="pb-2 text-right">Employees</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    workforce.reduce<Record<string, number>>((acc, row) => {
                      const key = row.locationCode ?? "Unassigned";
                      acc[key] = (acc[key] ?? 0) + 1;
                      return acc;
                    }, {}),
                  ).map(([location, count]) => (
                    <tr key={location} className="border-t border-border">
                      <td className="py-2">{location}</td>
                      <td className="py-2 text-right">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-foreground">Leaves</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted">Today</p>
              <p className="mt-1 text-muted">No data</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted">Upcoming</p>
              <p className="mt-1 text-muted">No data</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="mb-3 text-sm font-semibold text-foreground">Holidays</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted">Today</p>
              <p className="mt-1 text-muted">No data</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted">Upcoming</p>
              <p className="mt-1 text-muted">No data</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card shadow-card">
          <p className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Today&apos;s Attendance
          </p>
          <div className="p-4">
            <EmptyState title="No data" message="Attendance tracking will appear here once configured." />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-card">
          <p className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Sales targets
          </p>
          <div className="p-4">
            <EmptyState title="No data" message="Sales target progress will appear here once configured." />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HrmPageView({ defaultTab = "dashboard" }: { defaultTab?: HrmTab }) {
  const [activeTab, setActiveTab] = useState<HrmTab>(defaultTab);
  const tenantConfig = useTenantStore((state) => state.tenantConfig);
  const essentialsEnabled = tenantConfig?.enabledModules.includes("hrmEssentials") ?? false;

  const visibleTabs = useMemo(
    () =>
      HRM_TABS.filter((tab) => {
        if (essentialsEnabled) return true;
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
      }),
    [essentialsEnabled],
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
