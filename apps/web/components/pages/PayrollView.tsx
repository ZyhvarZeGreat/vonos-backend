"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PayComponent, Payroll, PayrollGroup } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  createPayComponent,
  createPayroll,
  createPayrollGroup,
  getPayComponentsPage,
  getPayrollGroupsPage,
  getPayrollsPage,
} from "@/lib/api/hrm";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

function listLoadError(error: unknown, fallback: string): string | null {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  if (/does not exist|internal server error|500/i.test(message)) {
    return "HRM database tables are missing. From apps/api run: npm run prisma:push (or migrate:deploy), then npm run prisma:seed";
  }
  return fallback;
}

const PAYROLL_TABS = [
  { id: "payrolls", label: "All Payrolls" },
  { id: "groups", label: "Payroll Groups" },
  { id: "components", label: "Pay Components" },
] as const;

type PayrollTab = (typeof PAYROLL_TABS)[number]["id"];

const payrollColumns: ColumnConfig<Payroll>[] = [
  {
    key: "employeeName",
    header: "Employee",
    render: (r) => <span className="font-medium">{r.employeeName}</span>,
  },
  {
    key: "payrollMonth",
    header: "Month",
    sortValue: (r) => new Date(r.payrollMonth).getTime(),
    render: (r) => formatDate(r.payrollMonth),
  },
  { key: "payrollGroupName", header: "Group", render: (r) => r.payrollGroupName ?? "—" },
  { key: "locationCode", header: "Location", render: (r) => r.locationCode ?? "—" },
  {
    key: "grossPay",
    header: "Gross",
    sortValue: (r) => r.grossPay,
    render: (r) => formatCurrency(r.grossPay, "NGN"),
  },
  {
    key: "netPay",
    header: "Net Pay",
    sortValue: (r) => r.netPay,
    render: (r) => formatCurrency(r.netPay, "NGN"),
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusPill status={r.status} vocabulary="movementStatus" />,
  },
  {
    key: "paymentStatus",
    header: "Payment",
    render: (r) => <StatusPill status={r.paymentStatus} vocabulary="movementStatus" />,
  },
];

const groupColumns: ColumnConfig<PayrollGroup>[] = [
  { key: "name", header: "Group Name", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "payrollCount", header: "Payrolls", sortValue: (r) => r.payrollCount },
  {
    key: "createdAt",
    header: "Created",
    sortValue: (r) => new Date(r.createdAt).getTime(),
    render: (r) => formatDate(r.createdAt),
  },
];

const componentColumns: ColumnConfig<PayComponent>[] = [
  { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "type", header: "Type", render: (r) => (r.type === "allowance" ? "Allowance" : "Deduction") },
  {
    key: "amount",
    header: "Amount",
    sortValue: (r) => r.amount,
    render: (r) => formatCurrency(r.amount, "NGN"),
  },
];

export function PayrollView({
  defaultTab = "payrolls",
  embedded = false,
}: {
  defaultTab?: PayrollTab;
  embedded?: boolean;
}) {
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<PayrollTab>(defaultTab);
  const [search, setSearch] = useState("");

  const [newPayroll, setNewPayroll] = useState({
    employeeName: "",
    grossPay: "",
    payrollMonth: new Date().toISOString().slice(0, 7) + "-01",
  });
  const [newGroupName, setNewGroupName] = useState("");
  const [newComponent, setNewComponent] = useState({
    name: "",
    type: "allowance" as PayComponent["type"],
    amount: "",
  });

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const payrollsPage = useServerListPage<Payroll>({
    queryKey: ["payrolls", tenantId],
    enabled: Boolean(tenantId) && activeTab === "payrolls",
    search,
    fetchPage: (cursor, limit) => getPayrollsPage(tenantId!, cursor, limit),
  });

  const groupsPage = useServerListPage<PayrollGroup>({
    queryKey: ["payroll-groups", tenantId],
    enabled: Boolean(tenantId) && activeTab === "groups",
    fetchPage: (cursor, limit) => getPayrollGroupsPage(tenantId!, cursor, limit),
  });

  const componentsPage = useServerListPage<PayComponent>({
    queryKey: ["pay-components", tenantId],
    enabled: Boolean(tenantId) && activeTab === "components",
    fetchPage: (cursor, limit) => getPayComponentsPage(tenantId!, cursor, limit),
  });

  const createPayrollMutation = useMutation({
    mutationFn: () =>
      createPayroll(tenantId!, {
        employeeName: newPayroll.employeeName,
        grossPay: Number(newPayroll.grossPay),
        payrollMonth: newPayroll.payrollMonth,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrolls", tenantId] });
      setNewPayroll({ employeeName: "", grossPay: "", payrollMonth: newPayroll.payrollMonth });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: () => createPayrollGroup(tenantId!, { name: newGroupName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-groups", tenantId] });
      setNewGroupName("");
    },
  });

  const createComponentMutation = useMutation({
    mutationFn: () =>
      createPayComponent(tenantId!, {
        name: newComponent.name,
        type: newComponent.type,
        amount: Number(newComponent.amount),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pay-components", tenantId] });
      setNewComponent({ name: "", type: "allowance", amount: "" });
    },
  });

  const filteredPayrolls = useMemo(() => {
    const rows = payrollsPage.items;
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        (r.payrollGroupName ?? "").toLowerCase().includes(q),
    );
  }, [payrollsPage.items, search]);

  const panelBody = (
    <>
      {activeTab === "payrolls" ? (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-4">
              <div className="min-w-[10rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-muted">Employee</label>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={newPayroll.employeeName}
                  onChange={(e) => setNewPayroll({ ...newPayroll, employeeName: e.target.value })}
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs font-medium text-muted">Gross pay</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={newPayroll.grossPay}
                  onChange={(e) => setNewPayroll({ ...newPayroll, grossPay: e.target.value })}
                />
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium text-muted">Month</label>
                <input
                  type="month"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={newPayroll.payrollMonth.slice(0, 7)}
                  onChange={(e) =>
                    setNewPayroll({ ...newPayroll, payrollMonth: `${e.target.value}-01` })
                  }
                />
              </div>
              <Button
                onClick={() => createPayrollMutation.mutate()}
                disabled={
                  !newPayroll.employeeName ||
                  !newPayroll.grossPay ||
                  createPayrollMutation.isPending
                }
              >
                Add Payroll
              </Button>
            </div>
            <ServerPaginatedTable
              items={filteredPayrolls}
              columns={payrollColumns}
              pageIndex={payrollsPage.pageIndex}
              pageSize={payrollsPage.pageSize}
              hasMore={payrollsPage.hasMore}
              canGoPrev={payrollsPage.canGoPrev}
              onNext={payrollsPage.goNext}
              onPrev={payrollsPage.goPrev}
              onPageSizeChange={payrollsPage.setPageSize}
              onPageSelect={payrollsPage.goToPage}
              canSelectPage={payrollsPage.canSelectPage}
              isLoading={payrollsPage.isLoading}
              isFetching={payrollsPage.isFetching}
              error={listLoadError(payrollsPage.error, "Failed to load payrolls.")}
              emptyState={{ message: "No payroll records yet." }}
            />
          </>
        ) : null}

        {activeTab === "groups" ? (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-4">
              <div className="min-w-[12rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-muted">Group name</label>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
              </div>
              <Button
                onClick={() => createGroupMutation.mutate()}
                disabled={!newGroupName || createGroupMutation.isPending}
              >
                Add Group
              </Button>
            </div>
            <ServerPaginatedTable
              items={groupsPage.items}
              columns={groupColumns}
              pageIndex={groupsPage.pageIndex}
              pageSize={groupsPage.pageSize}
              hasMore={groupsPage.hasMore}
              canGoPrev={groupsPage.canGoPrev}
              onNext={groupsPage.goNext}
              onPrev={groupsPage.goPrev}
              onPageSizeChange={groupsPage.setPageSize}
              onPageSelect={groupsPage.goToPage}
              canSelectPage={groupsPage.canSelectPage}
              isLoading={groupsPage.isLoading}
              isFetching={groupsPage.isFetching}
              error={listLoadError(groupsPage.error, "Failed to load payroll groups.")}
              emptyState={{ message: "No payroll groups yet." }}
            />
          </>
        ) : null}

        {activeTab === "components" ? (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-4">
              <div className="min-w-[10rem] flex-1">
                <label className="mb-1 block text-xs font-medium text-muted">Name</label>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={newComponent.name}
                  onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                />
              </div>
              <div className="w-36">
                <label className="mb-1 block text-xs font-medium text-muted">Type</label>
                <select
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={newComponent.type}
                  onChange={(e) =>
                    setNewComponent({
                      ...newComponent,
                      type: e.target.value as PayComponent["type"],
                    })
                  }
                >
                  <option value="allowance">Allowance</option>
                  <option value="deduction">Deduction</option>
                </select>
              </div>
              <div className="w-32">
                <label className="mb-1 block text-xs font-medium text-muted">Amount</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={newComponent.amount}
                  onChange={(e) => setNewComponent({ ...newComponent, amount: e.target.value })}
                />
              </div>
              <Button
                onClick={() => createComponentMutation.mutate()}
                disabled={
                  !newComponent.name ||
                  !newComponent.amount ||
                  createComponentMutation.isPending
                }
              >
                Add Component
              </Button>
            </div>
            <ServerPaginatedTable
              items={componentsPage.items}
              columns={componentColumns}
              pageIndex={componentsPage.pageIndex}
              pageSize={componentsPage.pageSize}
              hasMore={componentsPage.hasMore}
              canGoPrev={componentsPage.canGoPrev}
              onNext={componentsPage.goNext}
              onPrev={componentsPage.goPrev}
              onPageSizeChange={componentsPage.setPageSize}
              onPageSelect={componentsPage.goToPage}
              canSelectPage={componentsPage.canSelectPage}
              isLoading={componentsPage.isLoading}
              isFetching={componentsPage.isFetching}
              error={listLoadError(componentsPage.error, "Failed to load pay components.")}
              emptyState={{ message: "No pay components yet." }}
            />
          </>
        ) : null}
    </>
  );

  if (embedded) {
    return <div className="p-4">{panelBody}</div>;
  }

  return (
    <div className="space-y-6">
      <EntityContextBanner
        module="HRM — Payroll"
        description="Manage payroll runs, groups, and allowance/deduction components."
      />
      <ListPageShell
        tabs={PAYROLL_TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as PayrollTab)}
        searchValue={activeTab === "payrolls" ? search : undefined}
        onSearchChange={activeTab === "payrolls" ? setSearch : undefined}
        searchPlaceholder="Search payrolls…"
        showImport={false}
        showDateRange={false}
      >
        {panelBody}
      </ListPageShell>
    </div>
  );
}
