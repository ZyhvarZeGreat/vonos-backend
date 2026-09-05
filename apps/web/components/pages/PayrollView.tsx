"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import type {
  Employee,
  InvoiceListRow,
  PayComponent,
  Payroll,
  PayrollGroup,
} from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { StatusPill } from "@/components/atoms/StatusPill";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import {
  EmployeePayrollSearch,
  type PayrollEmployeePick,
} from "@/components/molecules/EmployeePayrollSearch";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
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
  getAllPayComponents,
  getAllEmployees,
  getAllTenantsPayrollsPage,
  getPayComponentsPage,
  getPayrollGroups,
  getPayrollGroupsPage,
  getPayrollsPage,
  getDesignations,
  getUnpaidPayrollsForGroup,
  payPayrolls,
} from "@/lib/api/hrm";
import { findInvoiceForPayroll } from "@/lib/api/invoices";
import { mapQueriesByPrefix } from "@/lib/query/optimistic";
import { PaymentAccountSelect } from "@/components/hq6/PaymentAccountSelect";
import { Hq6DateTimeInput } from "@/components/hq6/Hq6DateTimeInput";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";
import { ENTITY_LIST, getTenantCodeFromId } from "@/lib/registries/tenants";
import { getTenantConfigById } from "@/lib/registries/tenantConfigs";
import { toast } from "@/stores/toastStore";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import {
  nameListCursor,
  payrollListCursor,
} from "@/lib/utils/pagination";
import { tenantListPath } from "@/lib/utils/tenantRoutes";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";

function employeeToPayrollPick(row: Employee): PayrollEmployeePick {
  return {
    id: row.id,
    employeeName: row.name,
    employeeId: row.employeeCode,
    locationCode: row.locationCode,
    designationId: row.designationId,
    designationName: row.designationName,
    department: row.department,
    payrollGroupId: row.payrollGroupId,
    payrollGroupName: row.payrollGroupName,
  };
}

function nowPaidOnLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function paidOnToIso(value: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

type PayRowForm = {
  paidOn: string;
  accountId: string;
  method: string;
};

function emptyPayRowForm(): PayRowForm {
  return {
    paidOn: nowPaidOnLocal(),
    accountId: "",
    method: "",
  };
}

function payrollBankDetailLines(row: Payroll): Array<{ label: string; value: string }> {
  return [
    { label: "Bank Name", value: row.bankName?.trim() || "" },
    {
      label: "Account Holder's Name",
      value: row.accountHolderName?.trim() || "",
    },
    { label: "Branch Name", value: row.bankBranch?.trim() || "" },
    {
      label: "Bank Identifier Code",
      value: row.bankCode?.trim() || "",
    },
    { label: "Bank Account No.", value: row.bankAccountNo?.trim() || "" },
    { label: "Tax Payer ID", value: row.taxPayerId?.trim() || "" },
  ];
}

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

/** Prefill allowance / deduction rows from the Pay Components catalog. */
function employeeDraftFromPayComponents(
  components: PayComponent[],
): EmployeePayrollDraft {
  const allowances = components
    .filter((c) => c.type === "allowance" && Number(c.amount) > 0)
    .map((c) => ({
      id: `line-${c.id}`,
      name: c.name,
      amountType: "fixed" as const,
      amount: String(c.amount),
    }));
  const deductions = components
    .filter((c) => c.type === "deduction" && Number(c.amount) > 0)
    .map((c) => ({
      id: `line-${c.id}`,
      name: c.name,
      amountType: "fixed" as const,
      amount: String(c.amount),
    }));
  return {
    workDuration: "1",
    durationUnit: "Month",
    amountPerUnit: "0",
    allowances: allowances.length > 0 ? allowances : [newPayLine()],
    deductions: deductions.length > 0 ? deductions : [newPayLine()],
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

/** First configured business location, or empty when none. */
function defaultBusinessLocationCode(
  options: Array<{ value: string; label: string }>,
): string {
  return options[0]?.value ?? "";
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

const groupPayrollColumns: ColumnConfig<Payroll>[] = [
  {
    key: "tenantCode",
    header: "Entity",
    render: (r) =>
      r.tenantCode ? (
        <EntityColorBadge code={r.tenantCode} size="sm" />
      ) : (
        <span className="text-sm text-muted">—</span>
      ),
  },
  ...payrollColumns,
];

const ENTITY_FILTER_OPTIONS = ENTITY_LIST.map((e) => ({
  value: e.code,
  label: `${e.code} — ${e.name}`,
}));

const groupColumnsBase: ColumnConfig<PayrollGroup>[] = [
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
  allTenants = false,
}: {
  defaultTab?: PayrollTab;
  embedded?: boolean;
  /** VAG HRM: list and pay payrolls across all businesses. */
  allTenants?: boolean;
}) {
  const tenantId = useTenantId();
  const router = useRouter();
  const { tenantName, tenantCode, config } = useRouteTenant();
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<PayrollTab>(
    allTenants ? "payrolls" : defaultTab,
  );
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [tenantCodeFilter, setTenantCodeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [deductionTarget, setDeductionTarget] = useState<Payroll | null>(null);
  const [payTargets, setPayTargets] = useState<Payroll[] | null>(null);
  /** Per-payroll payment fields for group pay screen. */
  const [payRowForms, setPayRowForms] = useState<Record<string, PayRowForm>>(
    {},
  );
  const [payingGroupId, setPayingGroupId] = useState<string | null>(null);
  const [deductionForm, setDeductionForm] = useState({
    amount: "",
    note: "",
    reason: "",
  });
  const [deductionError, setDeductionError] = useState<string | null>(null);

  const [addPayrollOpen, setAddPayrollOpen] = useState(false);
  const [addPayrollStep, setAddPayrollStep] = useState<"select" | "details">("select");
  /** Target business when creating payroll from VAG all-tenants view. */
  const [addPayrollTenantId, setAddPayrollTenantId] = useState("");
  const [addPayrollLocationCode, setAddPayrollLocationCode] = useState("");
  const [addPayrollEmployeeIds, setAddPayrollEmployeeIds] = useState<string[]>([]);
  const [addPayrollMonth, setAddPayrollMonth] = useState(
    () => new Date().toISOString().slice(0, 7), // YYYY-MM
  );
  const [payrollGroupName, setPayrollGroupName] = useState("");
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
    setAddPayrollTenantId("");
    setAddPayrollEmployeeIds([]);
    setEmployeeDrafts({});
    setPayrollGroupName("");
    setAddPayrollLocationCode("");
  }

  function openAddPayroll() {
    const prefillCode = allTenants ? tenantCodeFilter : undefined;
    const prefillId = prefillCode
      ? ENTITY_LIST.find((e) => e.code === prefillCode)?.tenantId ?? ""
      : "";
    setAddPayrollTenantId(allTenants ? prefillId : "");
    setAddPayrollStep("select");
    setAddPayrollLocationCode("");
    setAddPayrollEmployeeIds([]);
    setEmployeeDrafts({});
    setPayrollGroupName("");
    setAddPayrollOpen(true);
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
      tenantCode: allTenants ? tenantCodeFilter || undefined : undefined,
    }),
    [
      allTenants,
      currentYear,
      designationFilter,
      groupFilter,
      locationFilter,
      monthFilter,
      paymentStatusFilter,
      statusFilter,
      tenantCodeFilter,
    ],
  );

  const canLoadPayrolls = allTenants || Boolean(tenantId);
  /** Tenant for list filters / pay-by-group (VAG: requires Business filter). */
  const filterTenantId = useMemo(() => {
    if (!allTenants) return tenantId ?? null;
    if (!tenantCodeFilter) return null;
    return (
      ENTITY_LIST.find((e) => e.code === tenantCodeFilter)?.tenantId ?? null
    );
  }, [allTenants, tenantCodeFilter, tenantId]);
  /** Groups / components lists use entity tenant, or VAG business filter. */
  const groupsTenantId = allTenants ? filterTenantId : tenantId ?? null;
  const canLoadTenantScoped = Boolean(groupsTenantId);
  /** Tenant used for create-payroll API calls (VAG picks a business). */
  const writeTenantId = allTenants
    ? addPayrollTenantId || null
    : tenantId ?? null;
  const writeTenantCode = writeTenantId
    ? getTenantCodeFromId(writeTenantId)
    : null;
  const writeTenantConfig = writeTenantId
    ? getTenantConfigById(writeTenantId)
    : null;
  const addFlowActive = addPayrollOpen || addPayrollStep === "details";

  const groupsForFilterQuery = useQuery({
    queryKey: ["payroll-groups", filterTenantId, "filter-options"],
    enabled: Boolean(filterTenantId) && activeTab === "payrolls",
    queryFn: () => getPayrollGroups(filterTenantId!),
    staleTime: 5 * 60_000,
  });

  const designationsForFilterQuery = useQuery({
    queryKey: ["designations", filterTenantId, "filter-options"],
    enabled: Boolean(filterTenantId) && activeTab === "payrolls",
    queryFn: () => getDesignations(filterTenantId!),
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
    queryKey: [
      "payrolls",
      allTenants ? "all" : tenantId,
      "ytd",
      currentYear,
    ],
    enabled: canLoadPayrolls && activeTab === "payrolls",
    search,
    searchMode: "hybrid",
    filters: payrollListFilters,
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    fetchPage: (cursor, limit, _sort, opts) =>
      allTenants
        ? getAllTenantsPayrollsPage(cursor, limit, {
            ...payrollListFilters,
            search: opts?.search,
            includeSummary: opts?.includeSummary,
          })
        : getPayrollsPage(tenantId!, cursor, limit, {
            ...payrollListFilters,
            search: opts?.search,
            includeSummary: opts?.includeSummary,
          }),
    getCursor: (row) => payrollListCursor(row),
  });

  const groupsPage = useServerListPage<PayrollGroup>({
    queryKey: ["payroll-groups", groupsTenantId],
    enabled: canLoadTenantScoped && activeTab === "groups",
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _sort, opts) =>
      getPayrollGroupsPage(groupsTenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const componentsPage = useServerListPage<PayComponent>({
    queryKey: ["pay-components", groupsTenantId],
    enabled: canLoadTenantScoped && activeTab === "components",
    search,
    searchMode: "hybrid",
    fetchPage: (cursor, limit, _sort, opts) =>
      getPayComponentsPage(groupsTenantId!, cursor, limit, {
        search: opts?.search,
        includeSummary: opts?.includeSummary,
      }),
    getCursor: (row) => nameListCursor(row),
  });

  const addEmployeesQuery = useQuery({
    queryKey: ["employees-for-add-payroll", writeTenantId, "all"],
    enabled: Boolean(writeTenantId) && addFlowActive,
    queryFn: () => getAllEmployees(writeTenantId!),
    staleTime: 5 * 60_000,
  });

  const addPayrollEmployeePicks = useMemo(
    () => (addEmployeesQuery.data ?? []).map(employeeToPayrollPick),
    [addEmployeesQuery.data],
  );

  /** Department values on employee HR records (informational — does not filter the list). */
  const departmentSummary = useMemo(() => {
    const counts = new Map<string, number>();
    let unassigned = 0;
    for (const e of addPayrollEmployeePicks) {
      const name = e.department?.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
      else unassigned += 1;
    }
    const chips = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      chips,
      unassigned,
      assigned: addPayrollEmployeePicks.length - unassigned,
      total: addPayrollEmployeePicks.length,
    };
  }, [addPayrollEmployeePicks]);

  const payComponentsForDraftQuery = useQuery({
    queryKey: ["pay-components", writeTenantId, "for-add-payroll"],
    enabled: Boolean(writeTenantId) && addFlowActive,
    queryFn: () => getAllPayComponents(writeTenantId!),
    staleTime: 5 * 60_000,
  });

  const addUserHref = allTenants
    ? "/admin/hrm/users/new/edit"
    : writeTenantCode
      ? `${tenantListPath(writeTenantCode, "users")}/new/edit`
      : tenantCode
        ? `${tenantListPath(tenantCode, "users")}/new/edit`
        : null;

  const locationConfigLocations =
    writeTenantConfig?.businessLocations ?? config?.businessLocations;

  const locationOptions = useMemo(
    () =>
      (locationConfigLocations ?? []).map((row) => ({
        value: row.code,
        label: row.name,
      })),
    [locationConfigLocations],
  );
  const hasLocations = locationOptions.length > 0;

  useEffect(() => {
    if (!addPayrollOpen) return;
    setAddPayrollLocationCode((prev) => {
      if (prev && locationOptions.some((o) => o.value === prev)) return prev;
      return defaultBusinessLocationCode(locationOptions);
    });
  }, [addPayrollOpen, locationOptions]);

  const employeesForPayrollModal = addPayrollEmployeePicks;

  const selectedEmployeesForPayroll = useMemo(() => {
    const selected = new Set(addPayrollEmployeeIds);
    return addPayrollEmployeePicks.filter((e) => selected.has(e.id));
  }, [addPayrollEmployeeIds, addPayrollEmployeePicks]);

  function toggleAddPayrollEmployee(id: string) {
    setAddPayrollEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  }

  function toggleAddPayrollPick(employee: PayrollEmployeePick) {
    toggleAddPayrollEmployee(employee.id);
  }

  const createPayrollsMutation = useAppMutation({
    mutationFn: async (): Promise<Payroll[]> => {
      if (!writeTenantId) throw new Error("Select a business first");
      if (selectedEmployeesForPayroll.length === 0) {
        throw new Error("Select at least one employee");
      }
      const created: Payroll[] = [];
      const payrollMonth = `${addPayrollMonth}-01`;

      const groupName = payrollGroupName.trim();
      if (!groupName) {
        throw new Error("Payroll group name is required");
      }
      const group = await createPayrollGroup(writeTenantId, { name: groupName });
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

        const row = await createPayroll(writeTenantId, {
          employeeRecordId: employee.id,
          payrollGroupId,
          locationCode:
            employee.locationCode || addPayrollLocationCode || undefined,
          grossPay: basic,
          totalAllowance,
          totalDeduction,
          status: "draft",
          payrollMonth,
          note: noteParts.join(" · ") || undefined,
        });
        created.push(row);
      }

      return created;
    },
    invalidateKeys: [
      ["payrolls"],
      ["payroll-groups", writeTenantId],
    ],
    onSuccess: (created) => {
      const first = created[0] ?? null;
      const businessCode = writeTenantCode;
      const groupId = first?.payrollGroupId ?? "";
      resetAddPayrollFlow();
      if (allTenants && businessCode) {
        setTenantCodeFilter(businessCode);
      }
      if (groupId) setGroupFilter(groupId);
      setActiveTab("groups");
      toast.success(
        created.length === 1
          ? "Draft payroll saved — open Payroll Groups to pay"
          : `Draft payroll group saved (${created.length} employees) — pay from Payroll Groups`,
      );
    },
  });

  const createGroupMutation = useAppMutation({
    mutationFn: () => {
      if (!groupsTenantId) throw new Error("Select a business first");
      return createPayrollGroup(groupsTenantId, { name: newGroupName });
    },
    invalidateKeys: [["payroll-groups", groupsTenantId]],
    onSuccess: () => {
      setNewGroupName("");
    },
  });

  const createComponentMutation = useAppMutation({
    mutationFn: () => {
      if (!groupsTenantId) throw new Error("Select a business first");
      return createPayComponent(groupsTenantId, {
        name: newComponent.name,
        type: newComponent.type,
        amount: Number(newComponent.amount),
      });
    },
    invalidateKeys: [["pay-components", groupsTenantId]],
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
    mutationFn: (vars: {
      tenantId: string;
      payrollId: string;
      addAmount: number;
      note?: string;
      reason?: string;
    }) => {
      return addPayrollDeduction(vars.tenantId, vars.payrollId, {
        addAmount: vars.addAmount,
        note: vars.note,
        reason: vars.reason,
      });
    },
    successMessage: "Deduction applied",
    progressLabel: "Applying deduction",
    invalidateKeys: [["payrolls"]],
    onSuccess: (updated) => {
      setSelectedPayroll(updated);
      setDeductionTarget(null);
      setDeductionForm({ amount: "", note: "", reason: "" });
      setDeductionError(null);
    },
    onError: (err: Error) => {
      setDeductionError(err.message);
      toast.error(err.message);
    },
  });

  function openDeductionModal(payroll: Payroll) {
    if (payroll.paymentStatus === "paid" || payroll.status === "paid") {
      toast.error("Cannot add a deduction after payroll is paid");
      return;
    }
    setDeductionTarget(payroll);
    setDeductionForm({ amount: "", note: "", reason: "" });
    setDeductionError(null);
  }

  function closeDeductionModal() {
    setDeductionTarget(null);
    setDeductionError(null);
  }
  const payModalRows = payTargets ?? [];
  const payTotal = useMemo(
    () => payModalRows.reduce((sum, row) => sum + (row.netPay || 0), 0),
    [payModalRows],
  );
  const payGroupRowsReady = payModalRows.every((row) => {
    const form = payRowForms[row.id];
    return Boolean(form?.accountId?.trim() && form?.method?.trim());
  });

  function patchPayRowForm(payrollId: string, patch: Partial<PayRowForm>) {
    setPayRowForms((prev) => {
      const current = prev[payrollId] ?? emptyPayRowForm();
      return { ...prev, [payrollId]: { ...current, ...patch } };
    });
  }

  function openGroupPayModal(unpaid: Payroll[]) {
    const rows = unpaid.filter(
      (row) => row.paymentStatus !== "paid" && row.netPay > 0,
    );
    if (rows.length === 0) {
      toast.error("No unpaid payrolls to pay");
      return;
    }
    setPayTargets(rows);
    const forms: Record<string, PayRowForm> = {};
    for (const row of rows) {
      forms[row.id] = emptyPayRowForm();
    }
    setPayRowForms(forms);
  }

  async function openPayGroup(groupId: string, groupName?: string) {
    const payTenantId = filterTenantId;
    if (!payTenantId || !groupId) {
      if (allTenants) {
        toast.error("Select a business first, then a group to pay");
      }
      return;
    }
    setPayingGroupId(groupId);
    try {
      const unpaid = await getUnpaidPayrollsForGroup(payTenantId, groupId, {
        month: monthFilter ? Number(monthFilter) : undefined,
        year: currentYear,
        locationCode: locationFilter || undefined,
        designationId: designationFilter || undefined,
      });
      if (unpaid.length === 0) {
        toast.error(
          groupName
            ? `No unpaid payrolls in ${groupName}`
            : "No unpaid payrolls in this group",
        );
        return;
      }
      openGroupPayModal(unpaid);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load group payrolls",
      );
    } finally {
      setPayingGroupId(null);
    }
  }

  function closePayModal() {
    setPayTargets(null);
    setPayRowForms({});
  }

  const payMutation = useAppMutation({
    mutationFn: async (vars: {
      batches: Array<{
        tenantId: string;
        payrollIds: string[];
        accountId: string;
        method: string;
        paidOn: string;
        note?: string;
      }>;
    }) => {
      if (!vars.batches.length) {
        throw new Error("No payroll selected");
      }
      let paid = 0;
      let skipped = 0;
      let totalDebited = 0;
      const accountNames: string[] = [];
      for (const batch of vars.batches) {
        if (!batch.accountId.trim()) {
          throw new Error("Select a payment account for each payroll");
        }
        if (!batch.method.trim()) {
          throw new Error("Select a payment method for each payroll");
        }
        const result = await payPayrolls(batch.tenantId, {
          payrollIds: batch.payrollIds,
          accountId: batch.accountId,
          method: batch.method,
          paidOn: batch.paidOn,
          note: batch.note,
        });
        paid += result.paid;
        skipped += result.skipped;
        totalDebited += result.totalDebited;
        if (result.accountName) accountNames.push(result.accountName);
      }
      return {
        paid,
        skipped,
        totalDebited,
        accountName: [...new Set(accountNames)].join(", "),
      };
    },
    progressLabel: "Paying payroll",
    successMessage: (result) =>
      `Paid ${result.paid} payroll${result.paid === 1 ? "" : "s"} — ${formatHq6Currency(result.totalDebited)}${result.accountName ? ` from ${result.accountName}` : ""}`,
    optimistic: {
      keys: [["payrolls"], ["payment-accounts"]],
      update: (qc, vars) => {
        const ids = new Set(vars.batches.flatMap((b) => b.payrollIds));
        if (ids.size === 0) return;
        mapQueriesByPrefix<{ id: string; paymentStatus?: string }>(
          qc,
          ["payrolls"],
          (items) =>
            items.map((row) =>
              ids.has(row.id) ? { ...row, paymentStatus: "paid" } : row,
            ),
        );
      },
    },
    onSuccess: () => {
      closePayModal();
    },
  });

  function submitPayModal() {
    if (!payGroupRowsReady) {
      toast.error("Select payment account and method for each employee");
      return;
    }
    if (!payModalRows.length) {
      toast.error("No payroll selected");
      return;
    }
    const batchMap = new Map<
      string,
      {
        tenantId: string;
        payrollIds: string[];
        accountId: string;
        method: string;
        paidOn: string;
      }
    >();
    for (const row of payModalRows) {
      const form = payRowForms[row.id] ?? emptyPayRowForm();
      const paidOnIso = paidOnToIso(form.paidOn);
      const key = `${row.tenantId}|${form.accountId}|${form.method}|${paidOnIso}`;
      const existing = batchMap.get(key);
      if (existing) {
        existing.payrollIds.push(row.id);
        continue;
      }
      batchMap.set(key, {
        tenantId: row.tenantId,
        payrollIds: [row.id],
        accountId: form.accountId,
        method: form.method,
        paidOn: paidOnIso,
      });
    }
    const batches = [...batchMap.values()];
    closePayModal();
    payMutation.mutate({ batches });
  }

  const payGroupHeader = useMemo(() => {
    const first = payModalRows[0];
    if (!first) return null;
    const cfg = getTenantConfigById(first.tenantId);
    const biz = cfg?.businessSettings?.business;
    const addressParts = [
      biz?.landmark,
      biz?.city,
      biz?.state,
      biz?.zipCode,
      biz?.country,
    ].filter(Boolean);
    return {
      groupName: first.payrollGroupName || "Payroll group",
      companyName: first.tenantName || cfg?.name || tenantName || "Business",
      address: addressParts.join(", "),
      status: first.status,
    };
  }, [payModalRows, tenantName]);

  const payslipTenantId = selectedPayroll?.tenantId ?? tenantId;
  const payslipInvoiceQuery = useQuery({
    queryKey: ["payroll-invoice", payslipTenantId, selectedPayroll?.id],
    enabled: Boolean(payslipTenantId && selectedPayroll?.id),
    queryFn: () =>
      findInvoiceForPayroll(payslipTenantId!, selectedPayroll!.id),
    staleTime: 60_000,
  });
  const payslipInvoice: InvoiceListRow | null = payslipInvoiceQuery.data ?? null;

  const payslipAddress = useMemo(() => {
    const tid = selectedPayroll?.tenantId ?? tenantId;
    const cfg = tid
      ? getTenantConfigById(tid) ?? config
      : config;
    const biz = cfg?.businessSettings?.business;
    if (!biz || typeof biz !== "object") return null;
    const parts = [biz.landmark, biz.city, biz.state, biz.country, biz.zipCode]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    // Ultimate POS prints address on separate lines
    if (parts.length === 0) return null;
    const line1 = [biz.landmark, biz.city, biz.state]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .join(", ");
    const line2 = [biz.country, biz.zipCode]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .join(", ");
    return [line1, line2].filter(Boolean).join("\n");
  }, [selectedPayroll?.tenantId, tenantId, config]);

  const searchPlaceholder =
    activeTab === "payrolls"
      ? allTenants
        ? "Search employee, business, ID, group…"
        : "Search employee, ID, group, location…"
      : activeTab === "groups"
        ? "Search payroll groups…"
        : "Search pay components…";

  const payrollFilterDropdowns =
    activeTab === "payrolls"
      ? [
          ...(allTenants
            ? [
                {
                  id: "entity",
                  label: "Business",
                  value: tenantCodeFilter,
                  onChange: (value: string) => {
                    setTenantCodeFilter(value);
                    setGroupFilter("");
                    setDesignationFilter("");
                  },
                  options: ENTITY_FILTER_OPTIONS,
                },
              ]
            : []),
          ...((!allTenants || filterTenantId)
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
              ]
            : []),
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
          ...(!allTenants && hasLocations
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
          ...(r.paymentStatus !== "paid"
            ? [
                {
                  id: "edit",
                  label: "Add deduction",
                  onClick: () => openDeductionModal(r),
                },
              ]
            : []),
        ]}
      />
    ),
  };

  const groupActionColumn: ColumnConfig<PayrollGroup> = {
    key: "actions",
    header: "Action",
    sortable: false,
    render: (r) => (
      <Hq6ActionsMenu
        label="Actions"
        items={[
          {
            id: "pay-unpaid",
            label:
              payingGroupId === r.id ? "Loading…" : "Pay unpaid payrolls",
            onClick: () => {
              void openPayGroup(r.id, r.name);
            },
          },
          {
            id: "view-payrolls",
            label: "View payrolls",
            onClick: () => {
              setGroupFilter(r.id);
              setActiveTab("payrolls");
            },
          },
        ]}
      />
    ),
  };

  const groupColumns: ColumnConfig<PayrollGroup>[] = [
    groupActionColumn,
    ...groupColumnsBase,
  ];

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
            const catalog = payComponentsForDraftQuery.data ?? [];
            const baseDraft = employeeDraftFromPayComponents(catalog);
            const drafts: Record<string, EmployeePayrollDraft> = {};
            for (const employee of selectedEmployeesForPayroll) {
              drafts[employee.id] = {
                ...baseDraft,
                allowances: baseDraft.allowances.map((line) => ({
                  ...line,
                  id: `line-${employee.id}-a-${line.id}`,
                })),
                deductions: baseDraft.deductions.map((line) => ({
                  ...line,
                  id: `line-${employee.id}-d-${line.id}`,
                })),
              };
            }
            setEmployeeDrafts(drafts);
            setPayrollGroupName(`Payroll for ${addPayrollMonthLabel}`);
            setAddPayrollOpen(false);
            setAddPayrollStep("details");
          }}
          onClose={resetAddPayrollFlow}
          saveLabel="Proceed"
          saving={false}
          saveDisabled={
            (allTenants && !addPayrollTenantId) ||
            addPayrollEmployeeIds.length === 0 ||
            !addPayrollMonth
          }
        />
      }
    >
      <div className="space-y-4">
        {allTenants ? (
          <Hq6Field label="Business" required>
            <select
              className="form-control select2 hq6-modal-input"
              value={addPayrollTenantId}
              onChange={(e) => {
                setAddPayrollTenantId(e.target.value);
                setAddPayrollEmployeeIds([]);
                setAddPayrollLocationCode("");
              }}
            >
              <option value="">Select business…</option>
              {ENTITY_LIST.map((entity) => (
                <option key={entity.tenantId} value={entity.tenantId}>
                  {entity.code} — {entity.name}
                </option>
              ))}
            </select>
          </Hq6Field>
        ) : null}

        <Hq6Field
          label="Business location"
          hint="From tenant settings — used when an employee has no location set"
        >
          {hasLocations ? (
            <select
              className="form-control select2 hq6-modal-input"
              value={addPayrollLocationCode}
              onChange={(e) => setAddPayrollLocationCode(e.target.value)}
              disabled={allTenants && !addPayrollTenantId}
            >
              {locationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="hq6-modal-input py-3 text-sm text-muted">
              No business locations configured for this entity. Add locations in
              Settings, or each employee&apos;s own location will be used when set.
            </p>
          )}
        </Hq6Field>

        {writeTenantId && departmentSummary.total > 0 ? (
          <div className="rounded-md border border-border bg-[#fafafa] px-3 py-2 text-xs text-muted">
            <p>
              <span className="font-semibold text-foreground">
                {departmentSummary.assigned}
              </span>{" "}
              of {departmentSummary.total} employees have a department on their HR
              record
              {departmentSummary.unassigned > 0
                ? ` · ${departmentSummary.unassigned} without department`
                : ""}
              .
            </p>
            {departmentSummary.chips.length > 0 ? (
              <p className="mt-1">
                {departmentSummary.chips
                  .map((chip) => `${chip.name} (${chip.count})`)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <Hq6Field
          label={`Employees${
            addPayrollEmployeeIds.length > 0
              ? ` (${addPayrollEmployeeIds.length} selected)`
              : ""
          }`}
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
                Select all matching
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
          {allTenants && !addPayrollTenantId ? (
            <p className="hq6-modal-input py-3 text-sm text-muted">
              Select a business to load employees.
            </p>
          ) : addEmployeesQuery.isLoading ? (
            <p className="hq6-modal-input py-3 text-sm text-muted">
              Loading all employees…
            </p>
          ) : addPayrollEmployeePicks.length === 0 ? (
            <div className="hq6-modal-input min-h-[10rem] space-y-3 py-3 text-sm">
              <p className="text-muted">
                No employees found. Add people under Users first (that creates
                their HR / payroll employee record), then return here to run
                payroll.
              </p>
              {addUserHref ? (
                <button
                  type="button"
                  className="hq6-btn hq6-btn-blue"
                  onClick={() => {
                    resetAddPayrollFlow();
                    router.push(addUserHref);
                  }}
                >
                  Add user
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <EmployeePayrollSearch
                employees={addPayrollEmployeePicks}
                selectedIds={addPayrollEmployeeIds}
                onToggle={toggleAddPayrollPick}
                isLoading={addEmployeesQuery.isLoading}
              />
              <div className="hq6-modal-input max-h-[22rem] min-h-[10rem] overflow-y-auto p-0">
                <ul className="divide-y divide-border">
                  {employeesForPayrollModal.map((employee) => {
                    const checked = addPayrollEmployeeIds.includes(employee.id);
                    return (
                      <li key={employee.id}>
                        <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-surface">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={() =>
                              toggleAddPayrollEmployee(employee.id)
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-[#111827]">
                              {employee.employeeName}
                            </span>
                            <span className="block text-xs text-muted">
                              {[
                                employee.employeeId,
                                employee.department
                                  ? `Dept: ${employee.department}`
                                  : "Dept: —",
                                employee.designationName
                                  ? `Designation: ${employee.designationName}`
                                  : null,
                                employee.locationCode,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {employeesForPayrollModal.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted">
                    No employees loaded.
                  </p>
                ) : null}
              </div>
              <p className="text-xs text-muted">
                Showing {employeesForPayrollModal.length} of{" "}
                {addPayrollEmployeePicks.length} employees
                {addPayrollEmployeeIds.length > 0
                  ? ` · ${addPayrollEmployeeIds.length} selected`
                  : ""}
              </p>
            </div>
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
            {allTenants && writeTenantCode ? (
              <p className="text-sm text-muted">
                Business: {writeTenantCode}
                {writeTenantConfig?.name ? ` — ${writeTenantConfig.name}` : ""}
              </p>
            ) : null}
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
                  title="Draft groups are paid from the Payroll Groups tab"
                >
                  i
                </span>
              </label>
              <select
                className="form-control select2 hq6-modal-input w-full"
                value="draft"
                disabled
              >
                <option value="draft">Draft</option>
              </select>
              <p className="mt-1 text-xs text-[#b45309]">
                Saves as draft — then pay from the Payroll Groups tab
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
                    <p className="mt-1 text-xs text-muted">
                      {[
                        employee.department
                          ? `Dept: ${employee.department}`
                          : null,
                        employee.designationName
                          ? `Designation: ${employee.designationName}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
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
        printLabel="Print"
      >
        {selectedPayroll ? (
          <>
            <PayrollPayslipDocument
              payroll={selectedPayroll}
              tenantName={
                selectedPayroll.tenantName ?? tenantName ?? "Vonos"
              }
              tenantAddress={payslipAddress}
              locationLabel={selectedPayroll.locationCode}
              invoice={payslipInvoice}
            />
            <div className="no-print mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              {selectedPayroll.paymentStatus !== "paid" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => openDeductionModal(selectedPayroll)}
                >
                  Add deduction
                </Button>
              ) : null}
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
            onClick={() => {
              if (!deductionTarget) return;
              const amount = Number(deductionForm.amount);
              if (!Number.isFinite(amount) || amount <= 0 || amount > maxDeduction) {
                return;
              }
              const vars = {
                tenantId: deductionTarget.tenantId,
                payrollId: deductionTarget.id,
                addAmount: amount,
                note: deductionForm.note.trim() || undefined,
                reason: deductionForm.reason.trim() || undefined,
              };
              // Capture ids then close — do not reset() the mutation (that
              // cancelled in-flight applies and hid errors).
              setDeductionTarget(null);
              setDeductionError(null);
              addDeductionMutation.mutate(vars);
            }}
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
        <Hq6BusyButton
          type="button"
          className="hq6-btn hq6-btn-blue"
          busy={createPayrollsMutation.isPending}
          busyLabel="Saving…"
          onClick={() => createPayrollsMutation.mutate()}
          disabled={
            !payrollGroupName.trim() ||
            selectedEmployeesForPayroll.length === 0 ||
            selectedEmployeesForPayroll.some((employee) => {
              const draft = employeeDrafts[employee.id] ?? emptyEmployeeDraft();
              return basicSalaryTotal(draft) <= 0;
            })
          }
        >
          Save as draft
        </Hq6BusyButton>
      </div>
    ) : activeTab === "payrolls" ? (
      <div className="flex flex-wrap items-center gap-2">
        <UposGradientActionButton label="Add Payroll" onClick={openAddPayroll} />
      </div>
    ) : null;

  const panelBody = (
    <>
      {addPayrollStep === "details" ? (
        addPayrollDetailsPage
      ) : activeTab === "payrolls" ? (
        <ServerPaginatedTable
          items={payrollsPage.items}
          columns={[
            payrollActionColumn,
            ...(allTenants ? groupPayrollColumns : payrollColumns),
          ]}
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
          emptyState={{
            message: allTenants
              ? "No payroll records across businesses yet."
              : "No payroll records yet.",
          }}
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

      <Hq6Modal
        open={Boolean(payTargets)}
        onClose={closePayModal}
        title={`Add payment for payroll group${
          payGroupHeader?.groupName ? ` (${payGroupHeader.groupName})` : ""
        }`}
        size="2xl"
        footer={
          <Hq6ModalSaveClose
            onSave={submitPayModal}
            onClose={closePayModal}
            saving={false}
            saveLabel={
              payModalRows.length > 1
                ? `Pay ${payModalRows.length} · ${formatCurrency(payTotal, "NGN")}`
                : `Pay ${formatCurrency(payTotal, "NGN")}`
            }
            saveDisabled={payModalRows.length === 0 || !payGroupRowsReady}
          />
        }
      >
        <div className="space-y-4">
          {payGroupHeader ? (
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">
                  {payGroupHeader.companyName}
                </p>
                {payGroupHeader.address ? (
                  <p className="mt-0.5 max-w-md text-muted">
                    {payGroupHeader.address}
                  </p>
                ) : null}
              </div>
              <div className="text-right text-sm">
                <p>
                  <span className="text-muted">Payroll group: </span>
                  <span className="font-medium">
                    {payGroupHeader.groupName}
                  </span>
                </p>
                <p className="mt-1">
                  <span className="text-muted">Status: </span>
                  <span className="font-medium capitalize">
                    {payGroupHeader.status}
                  </span>
                </p>
              </div>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left">
                  <th className="px-3 py-2 font-semibold">Employee</th>
                  <th className="px-3 py-2 font-semibold">Gross Amount</th>
                  <th className="px-3 py-2 font-semibold">Bank Details</th>
                  <th className="px-3 py-2 font-semibold">Add payment</th>
                </tr>
              </thead>
              <tbody>
                {payModalRows.map((row) => {
                  const form = payRowForms[row.id] ?? emptyPayRowForm();
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/80 align-top last:border-0"
                    >
                      <td className="px-3 py-3 font-medium">
                        {row.employeeName}
                      </td>
                      <td className="px-3 py-3 tabular-nums whitespace-nowrap">
                        {formatHq6Currency(row.grossPay)}
                      </td>
                      <td className="px-3 py-3 text-xs leading-5 text-muted">
                        {payrollBankDetailLines(row).map((line) => (
                          <div key={line.label}>
                            {line.label}: {line.value}
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-3">
                        <div className="min-w-[14rem] space-y-2">
                          <Hq6Field label="Paid on" required>
                            <Hq6DateTimeInput
                              value={form.paidOn}
                              onChange={(value) =>
                                patchPayRowForm(row.id, { paidOn: value })
                              }
                            />
                          </Hq6Field>
                          <Hq6Field label="Payment Account">
                            <PaymentAccountSelect
                              tenantId={row.tenantId}
                              value={form.accountId}
                              onChange={(accountId) =>
                                patchPayRowForm(row.id, { accountId })
                              }
                              emptyLabel="None"
                            />
                          </Hq6Field>
                          <Hq6Field label="Payment Method" required>
                            <select
                              className="form-control"
                              value={form.method}
                              onChange={(e) =>
                                patchPayRowForm(row.id, {
                                  method: e.target.value,
                                })
                              }
                            >
                              <option value="">Please Select</option>
                              {HQ6_PAYMENT_METHOD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </Hq6Field>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Hq6Modal>
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
            : allTenants && !filterTenantId
              ? PAYROLL_TABS.filter((t) => t.id === "payrolls").map((t) => ({
                  id: t.id,
                  label: t.label,
                }))
              : PAYROLL_TABS.map((t) => ({ id: t.id, label: t.label }))
      }
      activeTab={addPayrollStep === "details" ? "payrolls" : activeTab}
      onTabChange={(id) => {
        if (addPayrollStep === "details") return;
        if (allTenants && !filterTenantId && id !== "payrolls") {
          toast.error("Select a business first to open Payroll Groups");
          return;
        }
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
      hq6Subtitle={allTenants ? "Payroll — all businesses" : "Payroll"}
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
        description={
          allTenants
            ? "Select a business, add employees to a draft payroll group, then pay from Payroll Groups."
            : "Add multiple employees to a draft payroll group, then pay everyone from the Payroll Groups tab."
        }
      />
      {shell}
    </div>
  );
}
