"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import type { InvoiceListRow, PayComponent, Payroll, PayrollGroup, WorkforceMember } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { StatusPill } from "@/components/atoms/StatusPill";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6Field, Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import {
  PayrollPayslipDocument,
  payrollPayslipTitle,
} from "@/components/organisms/PayrollPayslipDocument";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { UposGradientActionButton } from "@/components/upos/UposNavTabs";
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
  getWorkforcePage,
} from "@/lib/api/hrm";
import { findInvoiceForPayroll } from "@/lib/api/invoices";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import {
  nameListCursor,
  payrollListCursor,
} from "@/lib/utils/pagination";

type AmountType = "fixed" | "percent";

type PayLine = {
  id: string;
  name: string;
  amountType: AmountType;
  amount: string;
};

type EmployeePayrollDraft = {
  workDuration: string;
  durationUnit: string;
  amountPerUnit: string;
  allowances: PayLine[];
  deductions: PayLine[];
  note: string;
};

const DURATION_UNIT_OPTIONS = [
  { value: "Month", label: "Month" },
  { value: "Day", label: "Day" },
  { value: "Hour", label: "Hour" },
] as const;

function newPayLine(): PayLine {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    amountType: "fixed",
    amount: "0",
  };
}

function emptyEmployeeDraft(): EmployeePayrollDraft {
  return {
    workDuration: "1",
    durationUnit: "Month",
    amountPerUnit: "0",
    allowances: [newPayLine()],
    deductions: [newPayLine()],
    note: "",
  };
}

function lineAmountValue(line: PayLine, base: number): number {
  const n = Number(line.amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (line.amountType === "percent") return (base * n) / 100;
  return n;
}

function sumPayLines(lines: PayLine[], base: number): number {
  return lines.reduce((sum, line) => sum + lineAmountValue(line, base), 0);
}

function basicSalaryTotal(draft: EmployeePayrollDraft): number {
  const duration = Number(draft.workDuration);
  const rate = Number(draft.amountPerUnit);
  if (!Number.isFinite(duration) || !Number.isFinite(rate)) return 0;
  return duration * rate;
}

function formatPayLinesNote(
  allowances: PayLine[],
  deductions: PayLine[],
  base: number,
): string | undefined {
  const parts: string[] = [];
  for (const line of allowances) {
    const amt = lineAmountValue(line, base);
    if (!line.name.trim() || amt <= 0) continue;
    const suffix =
      line.amountType === "percent" ? ` (${line.amount}% of basic)` : "";
    parts.push(`+ ${line.name.trim()}: ${amt}${suffix}`);
  }
  for (const line of deductions) {
    const amt = lineAmountValue(line, base);
    if (!line.name.trim() || amt <= 0) continue;
    const suffix =
      line.amountType === "percent" ? ` (${line.amount}% of basic)` : "";
    parts.push(`- ${line.name.trim()}: ${amt}${suffix}`);
  }
  return parts.length > 0 ? parts.join("; ") : undefined;
}

function updatePayLine(
  lines: PayLine[],
  id: string,
  patch: Partial<PayLine>,
): PayLine[] {
  return lines.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

/** Canonical default for Add Payroll — matches imported VA workforce location labels. */
const DEFAULT_PAYROLL_LOCATION = "VONOS SALES 002";

function normalizeLocationKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isVonosSales002(value: string | null | undefined): boolean {
  if (!value) return false;
  const key = normalizeLocationKey(value);
  return (
    key === "vonos sales 002" ||
    key === "vs002" ||
    key.endsWith("sales 002") ||
    key.includes("vonos sales 002")
  );
}

function locationsMatch(
  employeeLocation: string | null | undefined,
  selected: string,
): boolean {
  if (!selected) return true;
  if (!employeeLocation) return false;
  if (employeeLocation === selected) return true;
  if (
    normalizeLocationKey(employeeLocation) === normalizeLocationKey(selected)
  ) {
    return true;
  }
  return isVonosSales002(employeeLocation) && isVonosSales002(selected);
}

function resolveDefaultPayrollLocation(
  options: Array<{ value: string; label: string }>,
  workforceCodes: string[],
): string {
  for (const opt of options) {
    if (!opt.value) continue;
    if (isVonosSales002(opt.value) || isVonosSales002(opt.label)) {
      return opt.value;
    }
  }
  for (const code of workforceCodes) {
    if (isVonosSales002(code)) return code;
  }
  return DEFAULT_PAYROLL_LOCATION;
}

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

  const [addPayrollOpen, setAddPayrollOpen] = useState(false);
  const [addPayrollStep, setAddPayrollStep] = useState<"select" | "details">("select");
  const [addPayrollLocationCode, setAddPayrollLocationCode] = useState(
    DEFAULT_PAYROLL_LOCATION,
  );
  const [addPayrollEmployeeIds, setAddPayrollEmployeeIds] = useState<string[]>([]);
  const [addPayrollMonth, setAddPayrollMonth] = useState(
    () => new Date().toISOString().slice(0, 7), // YYYY-MM
  );
  const [payrollGroupName, setPayrollGroupName] = useState("");
  const [addPayrollStatus, setAddPayrollStatus] = useState<"draft" | "final">("draft");
  const [employeeDrafts, setEmployeeDrafts] = useState<
    Record<string, EmployeePayrollDraft>
  >({});
  const [newGroupName, setNewGroupName] = useState("");
  const [newComponent, setNewComponent] = useState({
    name: "",
    type: "allowance" as PayComponent["type"],
    amount: "",
  });

  function resetAddPayrollFlow() {
    setAddPayrollOpen(false);
    setAddPayrollStep("select");
    setAddPayrollEmployeeIds([]);
    setEmployeeDrafts({});
    setPayrollGroupName("");
    setAddPayrollStatus("draft");
    setAddPayrollLocationCode(DEFAULT_PAYROLL_LOCATION);
  }

  function patchEmployeeDraft(
    employeeId: string,
    patch: Partial<EmployeePayrollDraft>,
  ) {
    setEmployeeDrafts((prev) => {
      const current = prev[employeeId] ?? emptyEmployeeDraft();
      return { ...prev, [employeeId]: { ...current, ...patch } };
    });
  }

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
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const addWorkforceQuery = useQuery({
    queryKey: ["workforce-for-add-payroll", tenantId],
    enabled: Boolean(tenantId) && (addPayrollOpen || addPayrollStep === "details"),
    queryFn: async () => {
      const page = await getWorkforcePage(tenantId!, undefined, 500, undefined, {
        includeSummary: false,
      });
      return page.items;
    },
    staleTime: 5 * 60_000,
  });

  const locationOptions = useMemo(() => {
    const fromConfig = (config?.businessLocations ?? []).map((row) => ({
      value: row.code,
      label: `${row.code} — ${row.name}`,
    }));
    const workforceCodes = Array.from(
      new Set(
        (addWorkforceQuery.data ?? [])
          .map((e) => e.locationCode?.trim())
          .filter((code): code is string => Boolean(code)),
      ),
    );
    const merged = new Map<string, { value: string; label: string }>();
    for (const opt of fromConfig) {
      if (opt.value) merged.set(opt.value, opt);
    }
    for (const code of workforceCodes) {
      if (!merged.has(code)) {
        merged.set(code, { value: code, label: code });
      }
    }
    if (![...merged.keys()].some(isVonosSales002)) {
      merged.set(DEFAULT_PAYROLL_LOCATION, {
        value: DEFAULT_PAYROLL_LOCATION,
        label: DEFAULT_PAYROLL_LOCATION,
      });
    }
    return Array.from(merged.values());
  }, [addWorkforceQuery.data, config?.businessLocations]);
  const hasLocations = locationOptions.length > 0;

  useEffect(() => {
    if (!addPayrollOpen) return;
    const workforceCodes = (addWorkforceQuery.data ?? [])
      .map((e) => e.locationCode?.trim())
      .filter((code): code is string => Boolean(code));
    const resolved = resolveDefaultPayrollLocation(
      locationOptions,
      workforceCodes,
    );
    setAddPayrollLocationCode((prev) => {
      if (prev && locationOptions.some((o) => o.value === prev)) return prev;
      if (prev && isVonosSales002(prev)) return resolved;
      return resolved;
    });
  }, [addPayrollOpen, addWorkforceQuery.data, locationOptions]);

  const employeesForPayrollModal = useMemo(() => {
    const list = addWorkforceQuery.data ?? [];
    if (!addPayrollLocationCode) return list;
    return list.filter((e) =>
      locationsMatch(e.locationCode, addPayrollLocationCode),
    );
  }, [addPayrollLocationCode, addWorkforceQuery.data]);

  const selectedEmployeesForPayroll = useMemo(() => {
    const selected = new Set(addPayrollEmployeeIds);
    return employeesForPayrollModal.filter((e) => selected.has(e.id));
  }, [addPayrollEmployeeIds, employeesForPayrollModal]);

  const createPayrollsMutation = useAppMutation<Payroll[]>({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      if (selectedEmployeesForPayroll.length === 0) {
        throw new Error("Select at least one employee");
      }
      const created: Payroll[] = [];
      const payrollMonth = `${addPayrollMonth}-01`;

      const groupName = payrollGroupName.trim();
      if (!groupName) {
        throw new Error("Payroll group name is required");
      }
      const group = await createPayrollGroup(tenantId, { name: groupName });
      const payrollGroupId = group.id;

      for (const employee of selectedEmployeesForPayroll) {
        const draft = employeeDrafts[employee.id] ?? emptyEmployeeDraft();
        const basic = basicSalaryTotal(draft);
        if (!Number.isFinite(basic) || basic <= 0) {
          throw new Error(
            `Enter work duration and amount per unit for ${employee.employeeName}`,
          );
        }
        const totalAllowance = sumPayLines(draft.allowances, basic);
        const totalDeduction = sumPayLines(draft.deductions, basic);
        const lineNote = formatPayLinesNote(
          draft.allowances,
          draft.deductions,
          basic,
        );
        const noteParts = [
          `Basic: ${draft.workDuration} ${draft.durationUnit} × ${draft.amountPerUnit}`,
          lineNote,
          draft.note.trim() || undefined,
        ].filter(Boolean);

        const row = await createPayroll(tenantId, {
          employeeRecordId: employee.id,
          payrollGroupId,
          locationCode: addPayrollLocationCode || undefined,
          grossPay: basic,
          totalAllowance,
          totalDeduction,
          status: addPayrollStatus,
          payrollMonth,
          note: noteParts.join(" · ") || undefined,
        });
        created.push(row);
      }

      return created;
    },
    invalidateKeys: [
      ["payrolls", tenantId],
      ["payroll-groups", tenantId],
    ],
    onSuccess: (created) => {
      const first = created[0] ?? null;
      setSelectedPayroll(first);
      resetAddPayrollFlow();
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

  const payrollActionColumn: ColumnConfig<Payroll> = {
    key: "actions",
    header: "Action",
    sortable: false,
    render: (r) => (
      <Hq6ActionsMenu
        label="Actions"
        items={[
          {
            id: "view",
            label: "View payslip",
            onClick: () => setSelectedPayroll(r),
          },
          {
            id: "edit",
            label: "Add deduction",
            onClick: () => openDeductionModal(r),
          },
        ]}
      />
    ),
  };

  const addPayrollMonthLabel = useMemo(() => {
    const iso = `${addPayrollMonth}-01`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return addPayrollMonth;
    return d.toLocaleString("en", { month: "long", year: "numeric" });
  }, [addPayrollMonth]);

  const addPayrollSelectModal = (
    <Hq6Modal
      open={addPayrollOpen}
      onClose={resetAddPayrollFlow}
      title="Add Payroll"
      size="2xl"
      footer={
        <Hq6ModalSaveClose
          onSave={() => {
            const drafts: Record<string, EmployeePayrollDraft> = {};
            for (const employee of selectedEmployeesForPayroll) {
              drafts[employee.id] = emptyEmployeeDraft();
            }
            setEmployeeDrafts(drafts);
            setPayrollGroupName(`Payroll for ${addPayrollMonthLabel}`);
            setAddPayrollStatus("draft");
            setAddPayrollOpen(false);
            setAddPayrollStep("details");
          }}
          onClose={resetAddPayrollFlow}
          saveLabel="Proceed"
          saving={false}
          saveDisabled={
            !addPayrollLocationCode ||
            addPayrollEmployeeIds.length === 0 ||
            !addPayrollMonth
          }
        />
      }
    >
      <div className="space-y-4">
        <Hq6Field label="Location" required>
          <select
            className="form-control select2 hq6-modal-input"
            value={addPayrollLocationCode}
            onChange={(e) => {
              setAddPayrollLocationCode(e.target.value);
              setAddPayrollEmployeeIds([]);
            }}
          >
            {locationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Hq6Field>

        <Hq6Field
          label="Employee"
          required
          hint={
            <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle font-normal">
              <button
                type="button"
                className="hq6-btn hq6-btn-blue !px-2 !py-0.5 text-xs"
                onClick={() =>
                  setAddPayrollEmployeeIds(
                    employeesForPayrollModal.map((e) => e.id),
                  )
                }
                disabled={employeesForPayrollModal.length === 0}
              >
                Select all
              </button>
              <button
                type="button"
                className="hq6-btn hq6-btn-outline !px-2 !py-0.5 text-xs"
                onClick={() => setAddPayrollEmployeeIds([])}
                disabled={addPayrollEmployeeIds.length === 0}
              >
                Deselect all
              </button>
            </span>
          }
        >
          {employeesForPayrollModal.length === 0 ? (
            <p className="hq6-modal-input min-h-[10rem] py-3 text-sm text-muted">
              No employees found for this location.
            </p>
          ) : (
            <select
              multiple
              size={8}
              className="form-control hq6-modal-input w-full min-h-[10rem]"
              value={addPayrollEmployeeIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(
                  (opt) => opt.value,
                );
                setAddPayrollEmployeeIds(selected);
              }}
            >
              {employeesForPayrollModal.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeName}
                </option>
              ))}
            </select>
          )}
        </Hq6Field>

        <Hq6Field label="Month/Year" required>
          <input
            type="month"
            className="hq6-modal-input w-full"
            value={addPayrollMonth}
            onChange={(e) => setAddPayrollMonth(e.target.value)}
          />
        </Hq6Field>
      </div>
    </Hq6Modal>
  );

  const addPayrollDetailsPage =
    addPayrollStep === "details" ? (
      <div className="space-y-5 p-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">Add Payroll</h2>
            <p className="mt-1 text-base font-semibold text-[#111827]">
              Payroll for {addPayrollMonthLabel}
            </p>
            <p className="text-sm text-muted">
              Location:{" "}
              {locationOptions.find((l) => l.value === addPayrollLocationCode)
                ?.label ??
                addPayrollLocationCode ??
                "—"}
            </p>
          </div>
          <div className="grid min-w-[16rem] flex-1 gap-3 sm:max-w-md sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#555]">
                Payroll group name<span className="text-red-600">*</span>:
              </label>
              <input
                className="form-control hq6-modal-input w-full"
                value={payrollGroupName}
                onChange={(e) => setPayrollGroupName(e.target.value)}
                placeholder={`Payroll for ${addPayrollMonthLabel}`}
                required
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-[#555]">
                Status<span className="text-red-600">*</span>:
                <span
                  className="inline-flex size-4 items-center justify-center rounded-full bg-[#3b82f6] text-[10px] font-bold text-white"
                  title="Payroll can not be deleted if status is final"
                >
                  i
                </span>
              </label>
              <select
                className="form-control select2 hq6-modal-input w-full"
                value={addPayrollStatus}
                onChange={(e) =>
                  setAddPayrollStatus(e.target.value as "draft" | "final")
                }
              >
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </select>
              <p className="mt-1 text-xs text-[#b45309]">
                Payroll can not be deleted if status is final
              </p>
            </div>
          </div>
        </div>

        {createPayrollsMutation.isError ? (
          <p className="text-sm text-[var(--color-error-text)]">
            {createPayrollsMutation.error instanceof Error
              ? createPayrollsMutation.error.message
              : "Failed to create payroll"}
          </p>
        ) : null}

        <div className="space-y-4">
          {selectedEmployeesForPayroll.map((employee) => {
            const draft = employeeDrafts[employee.id] ?? emptyEmployeeDraft();
            const basic = basicSalaryTotal(draft);
            const allowanceTotal = sumPayLines(draft.allowances, basic);
            const deductionTotal = sumPayLines(draft.deductions, basic);
            const grossAmount = basic + allowanceTotal - deductionTotal;

            return (
              <div
                key={employee.id}
                className="overflow-hidden rounded border border-[#e5e7eb] bg-white"
              >
                <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[minmax(9rem,11rem)_minmax(11rem,14rem)_minmax(0,1fr)_minmax(0,1fr)_minmax(7rem,9rem)]">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      {employee.employeeName}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      Leaves : 0 days
                      <br />
                      Work Duration : 0.00 hour
                      <br />
                      Attendance: 0 Days
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#111827]">
                      Basic salary
                    </p>
                    <div>
                      <label className="mb-0.5 block text-xs text-[#555]">
                        Total work duration
                        <span className="text-red-600">*</span>:
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="form-control hq6-modal-input w-full"
                        value={draft.workDuration}
                        onChange={(e) =>
                          patchEmployeeDraft(employee.id, {
                            workDuration: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs text-[#555]">
                        Duration Unit:
                      </label>
                      <select
                        className="form-control select2 hq6-modal-input w-full"
                        value={draft.durationUnit}
                        onChange={(e) =>
                          patchEmployeeDraft(employee.id, {
                            durationUnit: e.target.value,
                          })
                        }
                      >
                        {DURATION_UNIT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs text-[#555]">
                        Amount per unit duration
                        <span className="text-red-600">*</span>:
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="form-control hq6-modal-input w-full"
                        value={draft.amountPerUnit}
                        onChange={(e) =>
                          patchEmployeeDraft(employee.id, {
                            amountPerUnit: e.target.value,
                          })
                        }
                      />
                    </div>
                    <p className="text-sm text-[#111827]">
                      Total:{" "}
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(basic, "NGN")}
                      </span>
                    </p>
                  </div>

                  <div className="rounded border border-[#e5e7eb] bg-[#fafafa] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#111827]">
                        Earnings
                      </p>
                      <button
                        type="button"
                        className="inline-flex size-7 items-center justify-center rounded bg-[#3b82f6] text-white"
                        aria-label="Add earning"
                        onClick={() =>
                          patchEmployeeDraft(employee.id, {
                            allowances: [...draft.allowances, newPayLine()],
                          })
                        }
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <div className="mb-1 grid grid-cols-[minmax(0,1fr)_minmax(5rem,6.5rem)_minmax(4.5rem,5.5rem)_1.75rem] gap-1.5 text-[11px] text-muted">
                      <span>Description</span>
                      <span>Amount Type</span>
                      <span className="text-right">Amount</span>
                      <span />
                    </div>
                    <div className="space-y-1.5">
                      {draft.allowances.map((line, index) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,6.5rem)_minmax(4.5rem,5.5rem)_1.75rem] items-center gap-1.5"
                        >
                          <input
                            className="form-control hq6-modal-input w-full"
                            placeholder="Description"
                            value={line.name}
                            onChange={(e) =>
                              patchEmployeeDraft(employee.id, {
                                allowances: updatePayLine(
                                  draft.allowances,
                                  line.id,
                                  { name: e.target.value },
                                ),
                              })
                            }
                          />
                          <select
                            className="form-control select2 hq6-modal-input w-full"
                            value={line.amountType}
                            onChange={(e) =>
                              patchEmployeeDraft(employee.id, {
                                allowances: updatePayLine(
                                  draft.allowances,
                                  line.id,
                                  {
                                    amountType: e.target.value as AmountType,
                                  },
                                ),
                              })
                            }
                          >
                            <option value="fixed">Fixed</option>
                            <option value="percent">Percent</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="form-control hq6-modal-input w-full text-right"
                            value={line.amount}
                            onChange={(e) =>
                              patchEmployeeDraft(employee.id, {
                                allowances: updatePayLine(
                                  draft.allowances,
                                  line.id,
                                  { amount: e.target.value },
                                ),
                              })
                            }
                          />
                          {index === 0 ? (
                            <span className="size-7" />
                          ) : (
                            <button
                              type="button"
                              className="inline-flex size-7 items-center justify-center rounded bg-[#ef4444] text-white"
                              aria-label="Remove earning"
                              onClick={() =>
                                patchEmployeeDraft(employee.id, {
                                  allowances: draft.allowances.filter(
                                    (row) => row.id !== line.id,
                                  ),
                                })
                              }
                            >
                              <Minus className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-right text-xs text-muted">
                      Total: {formatCurrency(allowanceTotal, "NGN")}
                    </p>
                  </div>

                  <div className="rounded border border-[#e5e7eb] bg-[#fafafa] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#111827]">
                        Deductions
                      </p>
                      <button
                        type="button"
                        className="inline-flex size-7 items-center justify-center rounded bg-[#3b82f6] text-white"
                        aria-label="Add deduction"
                        onClick={() =>
                          patchEmployeeDraft(employee.id, {
                            deductions: [...draft.deductions, newPayLine()],
                          })
                        }
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <div className="mb-1 grid grid-cols-[minmax(0,1fr)_minmax(5rem,6.5rem)_minmax(4.5rem,5.5rem)_1.75rem] gap-1.5 text-[11px] text-muted">
                      <span>Description</span>
                      <span>Amount Type</span>
                      <span className="text-right">Amount</span>
                      <span />
                    </div>
                    <div className="space-y-1.5">
                      {draft.deductions.map((line, index) => (
                        <div
                          key={line.id}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,6.5rem)_minmax(4.5rem,5.5rem)_1.75rem] items-center gap-1.5"
                        >
                          <input
                            className="form-control hq6-modal-input w-full"
                            placeholder="Description"
                            value={line.name}
                            onChange={(e) =>
                              patchEmployeeDraft(employee.id, {
                                deductions: updatePayLine(
                                  draft.deductions,
                                  line.id,
                                  { name: e.target.value },
                                ),
                              })
                            }
                          />
                          <select
                            className="form-control select2 hq6-modal-input w-full"
                            value={line.amountType}
                            onChange={(e) =>
                              patchEmployeeDraft(employee.id, {
                                deductions: updatePayLine(
                                  draft.deductions,
                                  line.id,
                                  {
                                    amountType: e.target.value as AmountType,
                                  },
                                ),
                              })
                            }
                          >
                            <option value="fixed">Fixed</option>
                            <option value="percent">Percent</option>
                          </select>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="form-control hq6-modal-input w-full text-right"
                            value={line.amount}
                            onChange={(e) =>
                              patchEmployeeDraft(employee.id, {
                                deductions: updatePayLine(
                                  draft.deductions,
                                  line.id,
                                  { amount: e.target.value },
                                ),
                              })
                            }
                          />
                          {index === 0 ? (
                            <span className="size-7" />
                          ) : (
                            <button
                              type="button"
                              className="inline-flex size-7 items-center justify-center rounded bg-[#ef4444] text-white"
                              aria-label="Remove deduction"
                              onClick={() =>
                                patchEmployeeDraft(employee.id, {
                                  deductions: draft.deductions.filter(
                                    (row) => row.id !== line.id,
                                  ),
                                })
                              }
                            >
                              <Minus className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-right text-xs text-muted">
                      Total: {formatCurrency(deductionTotal, "NGN")}
                    </p>
                  </div>

                  <div className="flex flex-col justify-start xl:items-end">
                    <p className="text-sm font-semibold text-[#111827]">
                      Gross Amount
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-[#111827]">
                      {formatCurrency(grossAmount, "NGN")}
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#e5e7eb] px-4 py-3">
                  <label className="mb-1 block text-xs font-semibold text-[#555]">
                    Note:
                  </label>
                  <textarea
                    className="form-control hq6-modal-input min-h-[4.5rem] w-full"
                    value={draft.note}
                    placeholder="Total"
                    onChange={(e) =>
                      patchEmployeeDraft(employee.id, { note: e.target.value })
                    }
                  />
                </div>
              </div>
            );
          })}
          {selectedEmployeesForPayroll.length === 0 ? (
            <p className="text-sm text-muted">No employees selected.</p>
          ) : null}
        </div>
      </div>
    ) : null;

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

  const payrollPrimaryAction =
    addPayrollStep === "details" ? (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="hq6-btn hq6-btn-outline"
          onClick={resetAddPayrollFlow}
          disabled={createPayrollsMutation.isPending}
        >
          Cancel
        </button>
        <button
          type="button"
          className="hq6-btn hq6-btn-blue"
          onClick={() => createPayrollsMutation.mutate()}
          disabled={
            createPayrollsMutation.isPending ||
            !payrollGroupName.trim() ||
            selectedEmployeesForPayroll.length === 0 ||
            selectedEmployeesForPayroll.some((employee) => {
              const draft = employeeDrafts[employee.id] ?? emptyEmployeeDraft();
              return basicSalaryTotal(draft) <= 0;
            })
          }
        >
          {createPayrollsMutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    ) : activeTab === "payrolls" ? (
      <UposGradientActionButton
        label="Add"
        onClick={() => {
          setAddPayrollStep("select");
          setAddPayrollLocationCode(DEFAULT_PAYROLL_LOCATION);
          setAddPayrollEmployeeIds([]);
          setEmployeeDrafts({});
          setPayrollGroupName("");
          setAddPayrollStatus("draft");
          setAddPayrollOpen(true);
        }}
      />
    ) : null;

  const panelBody = (
    <>
      {addPayrollStep === "details" ? (
        addPayrollDetailsPage
      ) : activeTab === "payrolls" ? (
        <ServerPaginatedTable
          items={payrollsPage.items}
          columns={[payrollActionColumn, ...payrollColumns]}
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
          stickyFirstColumn
        />
      ) : null}

      {addPayrollStep !== "details" && activeTab === "groups" ? (
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

      {addPayrollStep !== "details" && activeTab === "components" ? (
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

      {addPayrollSelectModal}
      {deductionModals}
    </>
  );

  const shell = (
    <ListPageShell
      tabs={
        addPayrollStep === "details"
          ? [{ id: "payrolls", label: "Add Payroll" }]
          : embedded
            ? PAYROLL_TABS.filter((t) => t.id === activeTab).map((t) => ({
                id: t.id,
                label: t.label,
              }))
            : PAYROLL_TABS.map((t) => ({ id: t.id, label: t.label }))
      }
      activeTab={addPayrollStep === "details" ? "payrolls" : activeTab}
      onTabChange={(id) => {
        if (addPayrollStep === "details") return;
        setActiveTab(id as PayrollTab);
      }}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      showImport={false}
      showDateRange={false}
      filterDropdowns={
        addPayrollStep === "details" ? undefined : payrollFilterDropdowns
      }
      showSearch={addPayrollStep !== "details"}
      showExport={addPayrollStep !== "details"}
      primaryAction={payrollPrimaryAction}
      pageSize={
        activeTab === "payrolls"
          ? payrollsPage.pageSize
          : activeTab === "groups"
            ? groupsPage.pageSize
            : componentsPage.pageSize
      }
      onPageSizeChange={
        addPayrollStep === "details"
          ? undefined
          : activeTab === "payrolls"
            ? payrollsPage.setPageSize
            : activeTab === "groups"
              ? groupsPage.setPageSize
              : componentsPage.setPageSize
      }
      className={embedded ? "border-0 shadow-none" : undefined}
      hq6Title="HRM"
      hq6Subtitle="Payroll"
      hq6PageChrome={!embedded}
    >
      {panelBody}
    </ListPageShell>
  );

  if (embedded) {
    return shell;
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
