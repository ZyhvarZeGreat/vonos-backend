"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import type { InvoiceListRow, PayComponent, Payroll, PayrollGroup } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { StatusPill } from "@/components/atoms/StatusPill";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  PayrollPayslipDocument,
  payrollPayslipTitle,
} from "@/components/organisms/PayrollPayslipDocument";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import {
  addPayrollDeduction,
  createPayComponent,
  createPayroll,
  createPayrollGroup,
  getPayComponentsPage,
  getPayrollGroups,
  getPayrollGroupsPage,
  getPayrollsPage,
  getDesignations,
} from "@/lib/api/hrm";
import { findInvoiceForPayroll } from "@/lib/api/invoices";
import { businessLocationOptions } from "@/lib/hooks/useBusinessLocationOptions";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import {
  nameListCursor,
  payrollListCursor,
} from "@/lib/utils/pagination";

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

const PAYROLL_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "final", label: "Final" },
  { value: "paid", label: "Paid" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "due", label: "Due" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

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
    key: "totalDeduction",
    header: "Deductions",
    sortValue: (r) => r.totalDeduction,
    render: (r) => formatCurrency(r.totalDeduction, "NGN"),
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
  const { tenantName, config } = useRouteTenant();
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<PayrollTab>(defaultTab);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [deductionTarget, setDeductionTarget] = useState<Payroll | null>(null);
  const [deductionForm, setDeductionForm] = useState({
    amount: "",
    note: "",
    reason: "",
  });
  const [deductionError, setDeductionError] = useState<string | null>(null);

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

  const payrollListFilters = useMemo(
    () => ({
      year: currentYear,
      payrollGroupId: groupFilter || undefined,
      designationId: designationFilter || undefined,
      status: statusFilter || undefined,
      paymentStatus: paymentStatusFilter || undefined,
      locationCode: locationFilter || undefined,
      month: monthFilter ? Number(monthFilter) : undefined,
    }),
    [
      currentYear,
      designationFilter,
      groupFilter,
      locationFilter,
      monthFilter,
      paymentStatusFilter,
      statusFilter,
    ],
  );

  const groupsForFilterQuery = useQuery({
    queryKey: ["payroll-groups", tenantId, "filter-options"],
    enabled: Boolean(tenantId) && activeTab === "payrolls",
    queryFn: () => getPayrollGroups(tenantId!),
    staleTime: 5 * 60_000,
  });

  const designationsForFilterQuery = useQuery({
    queryKey: ["designations", tenantId, "filter-options"],
    enabled: Boolean(tenantId) && activeTab === "payrolls",
    queryFn: () => getDesignations(tenantId!),
    staleTime: 5 * 60_000,
  });

  const locationOptions = useMemo(
    () => businessLocationOptions(config?.businessLocations),
    [config?.businessLocations],
  );
  const hasLocations = (config?.businessLocations?.length ?? 0) > 0;

  const groupFilterOptions = useMemo(
    () =>
      (groupsForFilterQuery.data ?? []).map((g) => ({
        value: g.id,
        label: g.name,
      })),
    [groupsForFilterQuery.data],
  );

  const designationFilterOptions = useMemo(
    () =>
      (designationsForFilterQuery.data ?? []).map((d) => ({
        value: d.id,
        label: d.name,
      })),
    [designationsForFilterQuery.data],
  );

  const payrollsPage = useServerListPage<Payroll>({
    queryKey: ["payrolls", tenantId, "ytd", currentYear],
    enabled: Boolean(tenantId) && activeTab === "payrolls",
    search,
    filters: payrollListFilters,
    fetchPage: (cursor, limit, _sort, opts) =>
      getPayrollsPage(tenantId!, cursor, limit, {
        ...payrollListFilters,
        search: search.trim() || undefined,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => payrollListCursor(row),
  });

  const groupsPage = useServerListPage<PayrollGroup>({
    queryKey: ["payroll-groups", tenantId],
    enabled: Boolean(tenantId) && activeTab === "groups",
    search,
    fetchPage: (cursor, limit, _sort, opts) =>
      getPayrollGroupsPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const componentsPage = useServerListPage<PayComponent>({
    queryKey: ["pay-components", tenantId],
    enabled: Boolean(tenantId) && activeTab === "components",
    search,
    fetchPage: (cursor, limit, _sort, opts) =>
      getPayComponentsPage(tenantId!, cursor, limit, {
        search: search.trim() || undefined,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const createPayrollMutation = useAppMutation({
    mutationFn: () =>
      createPayroll(tenantId!, {
        employeeName: newPayroll.employeeName,
        grossPay: Number(newPayroll.grossPay),
        payrollMonth: newPayroll.payrollMonth,
      }),
    invalidateKeys: [["payrolls", tenantId]],
    onSuccess: () => {
      setNewPayroll({ employeeName: "", grossPay: "", payrollMonth: newPayroll.payrollMonth });
    },
  });

  const createGroupMutation = useAppMutation({
    mutationFn: () => createPayrollGroup(tenantId!, { name: newGroupName }),
    invalidateKeys: [["payroll-groups", tenantId]],
    onSuccess: () => {
      setNewGroupName("");
    },
  });

  const createComponentMutation = useAppMutation({
    mutationFn: () =>
      createPayComponent(tenantId!, {
        name: newComponent.name,
        type: newComponent.type,
        amount: Number(newComponent.amount),
      }),
    invalidateKeys: [["pay-components", tenantId]],
    onSuccess: () => {
      setNewComponent({ name: "", type: "allowance", amount: "" });
    },
  });

  const maxDeduction = deductionTarget
    ? deductionTarget.grossPay +
      deductionTarget.totalAllowance -
      deductionTarget.totalDeduction
    : 0;

  const addDeductionMutation = useAppMutation({
    mutationFn: () => {
      if (!tenantId || !deductionTarget) {
        throw new Error("No payroll selected");
      }
      const addAmount = Number(deductionForm.amount);
      if (!Number.isFinite(addAmount) || addAmount <= 0) {
        throw new Error("Enter a deduction amount greater than zero");
      }
      if (addAmount > maxDeduction + 1e-9) {
        throw new Error(
          `Deduction cannot exceed remaining take-home (${formatCurrency(maxDeduction, "NGN")})`,
        );
      }
      return addPayrollDeduction(tenantId, deductionTarget.id, {
        addAmount,
        note: deductionForm.note.trim() || undefined,
        reason: deductionForm.reason.trim() || undefined,
      });
    },
    invalidateKeys: [["payrolls", tenantId]],
    onSuccess: (updated) => {
      setSelectedPayroll(updated);
      setDeductionTarget(null);
      setDeductionForm({ amount: "", note: "", reason: "" });
      setDeductionError(null);
    },
    onError: (err: Error) => setDeductionError(err.message),
  });

  function openDeductionModal(payroll: Payroll) {
    setDeductionTarget(payroll);
    setDeductionForm({ amount: "", note: "", reason: "" });
    setDeductionError(null);
  }

  function closeDeductionModal() {
    setDeductionTarget(null);
    setDeductionError(null);
    addDeductionMutation.reset();
  }

  const payslipInvoiceQuery = useQuery({
    queryKey: ["payroll-invoice", tenantId, selectedPayroll?.id],
    enabled: Boolean(tenantId && selectedPayroll?.id),
    queryFn: () => findInvoiceForPayroll(tenantId!, selectedPayroll!.id),
    staleTime: 60_000,
  });
  const payslipInvoice: InvoiceListRow | null = payslipInvoiceQuery.data ?? null;

  const payslipAddress = useMemo(() => {
    const biz = config?.businessSettings?.business;
    if (!biz || typeof biz !== "object") return null;
    const parts = [biz.landmark, biz.city, biz.state, biz.country]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }, [config?.businessSettings?.business]);

  const searchPlaceholder =
    activeTab === "payrolls"
      ? "Search employee, ID, group, location…"
      : activeTab === "groups"
        ? "Search payroll groups…"
        : "Search pay components…";

  const payrollFilterDropdowns =
    activeTab === "payrolls"
      ? [
          {
            id: "group",
            label: "Group",
            value: groupFilter,
            onChange: setGroupFilter,
            options: groupFilterOptions,
          },
          {
            id: "designation",
            label: "Designation",
            value: designationFilter,
            onChange: setDesignationFilter,
            options: designationFilterOptions,
          },
          {
            id: "month",
            label: "Month",
            value: monthFilter,
            onChange: setMonthFilter,
            options: MONTH_OPTIONS,
          },
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: PAYROLL_STATUS_OPTIONS,
          },
          {
            id: "payment",
            label: "Payment",
            value: paymentStatusFilter,
            onChange: setPaymentStatusFilter,
            options: PAYMENT_STATUS_OPTIONS,
          },
          ...(hasLocations
            ? [
                {
                  id: "location",
                  label: "Location",
                  value: locationFilter,
                  onChange: setLocationFilter,
                  options: locationOptions,
                },
              ]
            : []),
        ]
      : undefined;

  const deductionModals = (
    <>
      <DocumentPreviewModal
        open={Boolean(selectedPayroll)}
        title={selectedPayroll ? payrollPayslipTitle(selectedPayroll) : "Payslip"}
        onClose={() => setSelectedPayroll(null)}
      >
        {selectedPayroll ? (
          <>
            <PayrollPayslipDocument
              payroll={selectedPayroll}
              tenantName={tenantName ?? "Vonos"}
              tenantAddress={payslipAddress}
              locationLabel={selectedPayroll.locationCode}
              invoice={payslipInvoice}
            />
            <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted">
                Gross stays fixed. Deductions reduce take-home (net) for the month.
                Payroll list shows {currentYear} year-to-date from imported SQL.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => openDeductionModal(selectedPayroll)}
              >
                Add deduction
              </Button>
            </div>
          </>
        ) : null}
      </DocumentPreviewModal>

      <Modal
        open={Boolean(deductionTarget)}
        onClose={closeDeductionModal}
        className="z-[60]"
      >
        <ModalHeader
          title="Add payroll deduction"
          onClose={closeDeductionModal}
        />
        <div className="space-y-3 px-1 py-2">
          <p className="text-sm text-muted">
            {deductionTarget
              ? `${deductionTarget.employeeName} · remaining take-home ${formatCurrency(maxDeduction, "NGN")}`
              : null}
          </p>
          <Input
            label="Amount"
            type="number"
            min={0}
            step="0.01"
            value={deductionForm.amount}
            onChange={(e) =>
              setDeductionForm((prev) => ({ ...prev, amount: e.target.value }))
            }
            placeholder="0.00"
          />
          <Input
            label="Label (optional)"
            value={deductionForm.note}
            onChange={(e) =>
              setDeductionForm((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder="e.g. PAYE, Loan"
          />
          <Input
            label="Reason (optional)"
            value={deductionForm.reason}
            onChange={(e) =>
              setDeductionForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="Shown on payslip"
          />
          {deductionError ? (
            <p className="text-sm text-[var(--color-error-text)]">{deductionError}</p>
          ) : null}
        </div>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={closeDeductionModal}>
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={addDeductionMutation.isPending}
            disabled={
              !deductionForm.amount ||
              Number(deductionForm.amount) <= 0 ||
              Number(deductionForm.amount) > maxDeduction ||
              addDeductionMutation.isPending
            }
            onClick={() => addDeductionMutation.mutate()}
          >
            Apply deduction
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );

  const panelBody = (
    <>
      {activeTab === "payrolls" ? (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-4">
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1 block text-xs font-medium text-muted">Employee name</label>
              <input
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={newPayroll.employeeName}
                onChange={(e) =>
                  setNewPayroll({ ...newPayroll, employeeName: e.target.value })
                }
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
            items={payrollsPage.items}
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
            isPaging={payrollsPage.isPaging}
            error={listLoadError(payrollsPage.error, "Failed to load payrolls.")}
            emptyState={{ message: "No payroll records yet." }}
            onRowClick={(row) => setSelectedPayroll(row)}
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
            isPaging={groupsPage.isPaging}
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
            isPaging={componentsPage.isPaging}
            error={listLoadError(componentsPage.error, "Failed to load pay components.")}
            emptyState={{ message: "No pay components yet." }}
          />
        </>
      ) : null}

      {deductionModals}
    </>
  );

  const shell = (
    <ListPageShell
      tabs={
        embedded
          ? PAYROLL_TABS.filter((t) => t.id === activeTab).map((t) => ({
              id: t.id,
              label: t.label,
            }))
          : PAYROLL_TABS.map((t) => ({ id: t.id, label: t.label }))
      }
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as PayrollTab)}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      showImport={false}
      showDateRange={false}
      filterDropdowns={payrollFilterDropdowns}
      className={embedded ? "border-0 shadow-none" : undefined}
      hq6Title="HRM"
      hq6Subtitle="Payroll"
      hq6PageChrome={!embedded}
    >
      {panelBody}
    </ListPageShell>
  );

  if (embedded) {
    return <div className="p-1">{shell}</div>;
  }

  return (
    <div className="space-y-6">
      <EntityContextBanner
        module="HRM — Payroll"
        description="Manage payroll runs, groups, and allowance/deduction components."
      />
      {shell}
    </div>
  );
}
