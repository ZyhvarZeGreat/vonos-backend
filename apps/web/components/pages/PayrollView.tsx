"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import type {
  InvoiceListRow,
  PayComponent,
  PayComponentAmountType,
  Payroll,
  PayrollCandidate,
  PayrollGroup,
  PayrollStaffBucket,
} from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { EntityColorBadge } from "@/components/atoms/EntityColorBadge";
import { StatusPill } from "@/components/atoms/StatusPill";
import { Hq6BoldStatusBadge } from "@/components/hq6/Hq6BoldStatusBadge";
import { EntityContextBanner } from "@/components/molecules/EntityContextBanner";
import {
  EmployeePayrollSearch,
  PayrollSelectCheck,
  type PayrollEmployeePick,
} from "@/components/molecules/EmployeePayrollSearch";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
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
import { savePayrollCreateSession } from "@/components/pages/payroll/payrollCreateSession";
import { PayrollViewPaymentsModal } from "@/components/pages/payroll/PayrollViewPaymentsModal";
import {
  createPayComponent,
  createPayrollGroup,
  deletePayComponent,
  deletePayrollGroup,
  getAllTenantsPayrollsPage,
  getEmployees,
  getPayComponentsPage,
  getPayrollCandidates,
  getPayrollGroups,
  getPayrollGroupsPage,
  getPayrollPayments,
  getPayrollsPage,
  getDesignations,
  updatePayComponent,
} from "@/lib/api/hrm";
import { findInvoiceForPayroll } from "@/lib/api/invoices";
import { ENTITY_LIST, getTenantCodeFromId } from "@/lib/registries/tenants";
import { getTenantConfigById } from "@/lib/registries/tenantConfigs";
import { toast } from "@/stores/toastStore";
import { useAppPermissions } from "@/lib/hooks/useHq6Permissions";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import {
  nameListCursor,
  payrollListCursor,
} from "@/lib/utils/pagination";
import { prefetchPaymentAccountsRef } from "@/lib/query/prefetchListModals";
import { tenantListPath } from "@/lib/utils/tenantRoutes";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { cn } from "@/lib/utils/cn";

function candidateToPayrollPick(row: PayrollCandidate): PayrollEmployeePick {
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
    staffBucket: row.staffBucket,
  };
}

const STAFF_BUCKET_FILTERS: Array<{
  value: "" | PayrollStaffBucket;
  label: string;
}> = [
  { value: "", label: "All staff" },
  { value: "management", label: "Management" },
  { value: "service", label: "Service staff" },
  { value: "technical", label: "Technical staff" },
];

function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/\s/g, "").trim();
  if (!cleaned) return Number.NaN;
  return Number.parseFloat(cleaned);
}

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

function payrollGroupHref(
  group: PayrollGroup,
  allTenants: boolean,
  tenantCode: string | null,
  action?: "edit" | "pay",
): string {
  const tenantCodeForLink =
    getTenantCodeFromId(group.tenantId) ?? tenantCode ?? null;
  if (allTenants) {
    const q = `?tenantId=${encodeURIComponent(group.tenantId)}`;
    const base = `/admin/hrm/payroll-groups/${group.id}${q}`;
    return action ? `${base}/${action}` : base;
  }
  if (!tenantCodeForLink) return "#";
  const base = tenantListPath(
    tenantCodeForLink,
    `hrm/payroll-groups/${group.id}`,
  );
  return action ? `${base}/${action}` : base;
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

const AMOUNT_TYPE_OPTIONS: Array<{ value: PayComponentAmountType; label: string }> = [
  { value: "fixed", label: "Fixed" },
  { value: "percent", label: "Percent" },
];

const ENTITY_FILTER_OPTIONS = ENTITY_LIST.map((e) => ({
  value: e.code,
  label: `${e.code} — ${e.name}`,
}));

const emptyComponentForm = () => ({
  name: "",
  type: "allowance" as PayComponent["type"],
  amount: "",
  amountType: "fixed" as PayComponentAmountType,
  applicableDate: "",
  employeeRecordId: "",
});

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
  const queryClient = useQueryClient();
  const { can, requireCan } = useAppPermissions();
  const canCreatePayroll = can("essentials.create_payroll");
  const canUpdatePayroll = can("essentials.update_payroll");
  const canDeletePayroll = can("essentials.delete_payroll");
  const isHq6 = useIsVaHq6();
  const { tenantName, tenantCode, config } = useRouteTenant();
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<PayrollTab>(
    allTenants ? "payrolls" : defaultTab,
  );
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [tenantCodeFilter, setTenantCodeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [paymentsModalPayroll, setPaymentsModalPayroll] = useState<Payroll | null>(
    null,
  );

  const [addPayrollOpen, setAddPayrollOpen] = useState(false);
  const [addPayrollTenantId, setAddPayrollTenantId] = useState("");
  const [addPayrollLocationCode, setAddPayrollLocationCode] = useState("");
  const [addPayrollEmployeeIds, setAddPayrollEmployeeIds] = useState<string[]>([]);
  const [addPayrollStaffBucket, setAddPayrollStaffBucket] = useState<
    "" | PayrollStaffBucket
  >("");
  const [addPayrollMonth, setAddPayrollMonth] = useState(
    () => new Date().toISOString().slice(0, 7),
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [newComponent, setNewComponent] = useState(emptyComponentForm);
  const [editComponent, setEditComponent] = useState<PayComponent | null>(null);
  const [editComponentForm, setEditComponentForm] = useState(emptyComponentForm);
  const [deleteComponentTarget, setDeleteComponentTarget] =
    useState<PayComponent | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] =
    useState<PayrollGroup | null>(null);

  function resetAddPayrollFlow() {
    setAddPayrollOpen(false);
    setAddPayrollTenantId("");
    setAddPayrollEmployeeIds([]);
    setAddPayrollStaffBucket("");
    setAddPayrollLocationCode("");
  }

  function openAddPayroll() {
    if (!requireCan("essentials.create_payroll", "action")) return;
    const prefillCode = allTenants ? tenantCodeFilter : undefined;
    const prefillId = prefillCode
      ? ENTITY_LIST.find((e) => e.code === prefillCode)?.tenantId ?? ""
      : "";
    setAddPayrollTenantId(allTenants ? prefillId : "");
    setAddPayrollLocationCode("");
    setAddPayrollEmployeeIds([]);
    setAddPayrollOpen(true);
  }

  function proceedToCreatePayroll() {
    if (!writeTenantId) {
      toast.error("Select a business first");
      return;
    }
    if (selectedEmployeesForPayroll.length === 0) {
      toast.error("Select at least one employee");
      return;
    }
    savePayrollCreateSession({
      tenantId: writeTenantId,
      locationCode: addPayrollLocationCode,
      month: addPayrollMonth,
      employees: selectedEmployeesForPayroll,
    });
    resetAddPayrollFlow();
    if (allTenants) {
      router.push("/admin/hrm/payroll/create");
    } else if (tenantCode) {
      router.push(tenantListPath(tenantCode, "hrm/payroll/create"));
    }
  }

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const payrollListFilters = useMemo(
    () => ({
      year: currentYear,
      payrollGroupId: groupFilter || undefined,
      designationId: designationFilter || undefined,
      department: departmentFilter || undefined,
      status: statusFilter || undefined,
      paymentStatus: paymentStatusFilter || undefined,
      locationCode: locationFilter || undefined,
      month: monthFilter ? Number(monthFilter) : undefined,
      tenantCode: allTenants ? tenantCodeFilter || undefined : undefined,
    }),
    [
      allTenants,
      currentYear,
      departmentFilter,
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
  const filterTenantId = useMemo(() => {
    if (!allTenants) return tenantId ?? null;
    if (!tenantCodeFilter) return null;
    return (
      ENTITY_LIST.find((e) => e.code === tenantCodeFilter)?.tenantId ?? null
    );
  }, [allTenants, tenantCodeFilter, tenantId]);
  const groupsTenantId = allTenants ? filterTenantId : tenantId ?? null;
  const canLoadTenantScoped = Boolean(groupsTenantId);
  const writeTenantId = allTenants
    ? addPayrollTenantId || null
    : tenantId ?? null;
  const writeTenantCode = writeTenantId
    ? getTenantCodeFromId(writeTenantId)
    : null;
  const writeTenantConfig = writeTenantId
    ? getTenantConfigById(writeTenantId)
    : null;
  const addFlowActive = addPayrollOpen;

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

  const employeesForDeptFilterQuery = useQuery({
    queryKey: ["employees", filterTenantId, "dept-filter"],
    enabled: Boolean(filterTenantId) && activeTab === "payrolls",
    queryFn: () => getEmployees(filterTenantId!),
    staleTime: 5 * 60_000,
  });

  const employeesForComponentQuery = useQuery({
    queryKey: ["employees", groupsTenantId, "component-form"],
    enabled: Boolean(groupsTenantId) && activeTab === "components",
    queryFn: () => getEmployees(groupsTenantId!),
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

  const departmentFilterOptions = useMemo(() => {
    const depts = new Set<string>();
    for (const e of employeesForDeptFilterQuery.data ?? []) {
      const name = e.department?.trim();
      if (name) depts.add(name);
    }
    return Array.from(depts)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [employeesForDeptFilterQuery.data]);

  const componentEmployeeOptions = useMemo(
    () =>
      (employeesForComponentQuery.data ?? []).map((e) => ({
        value: e.id,
        label: e.name,
      })),
    [employeesForComponentQuery.data],
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
    queryKey: ["payroll-candidates", writeTenantId],
    enabled: Boolean(writeTenantId) && addFlowActive,
    queryFn: () => getPayrollCandidates(writeTenantId!),
    staleTime: 5 * 60_000,
  });

  const addPayrollEmployeePicks = useMemo(
    () => (addEmployeesQuery.data ?? []).map(candidateToPayrollPick),
    [addEmployeesQuery.data],
  );

  const employeesForPayrollModal = useMemo(() => {
    if (!addPayrollStaffBucket) return addPayrollEmployeePicks;
    return addPayrollEmployeePicks.filter(
      (e) => e.staffBucket === addPayrollStaffBucket,
    );
  }, [addPayrollEmployeePicks, addPayrollStaffBucket]);

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

  function openEditComponent(row: PayComponent) {
    setEditComponent(row);
    setEditComponentForm({
      name: row.name,
      type: row.type,
      amount: String(row.amount),
      amountType: row.amountType,
      applicableDate: row.applicableDate?.slice(0, 10) ?? "",
      employeeRecordId: row.employeeRecordId ?? "",
    });
  }

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

  const deleteGroupMutation = useAppMutation({
    mutationFn: (group: PayrollGroup) => {
      const tid = allTenants ? group.tenantId : groupsTenantId;
      if (!tid) throw new Error("Select a business first");
      return deletePayrollGroup(tid, group.id);
    },
    invalidateKeys: [
      ["payroll-groups", groupsTenantId],
      ["payroll-groups"],
      ["payrolls"],
    ],
    onSuccess: () => {
      toast.success("Payroll group deleted");
      setDeleteGroupTarget(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const createComponentMutation = useAppMutation({
    mutationFn: () => {
      if (!groupsTenantId) throw new Error("Select a business first");
      return createPayComponent(groupsTenantId, {
        name: newComponent.name,
        type: newComponent.type,
        amount: parseMoneyInput(newComponent.amount),
        amountType: newComponent.amountType,
        applicableDate: newComponent.applicableDate || undefined,
        employeeRecordId: newComponent.employeeRecordId || undefined,
      });
    },
    invalidateKeys: [["pay-components", groupsTenantId]],
    onSuccess: () => {
      setNewComponent(emptyComponentForm());
    },
  });

  const updateComponentMutation = useAppMutation({
    mutationFn: () => {
      if (!groupsTenantId || !editComponent) {
        throw new Error("Select a component to edit");
      }
      return updatePayComponent(groupsTenantId, editComponent.id, {
        name: editComponentForm.name,
        type: editComponentForm.type,
        amount: parseMoneyInput(editComponentForm.amount),
        amountType: editComponentForm.amountType,
        applicableDate: editComponentForm.applicableDate || null,
        employeeRecordId: editComponentForm.employeeRecordId || null,
      });
    },
    invalidateKeys: [["pay-components", groupsTenantId]],
    onSuccess: () => {
      setEditComponent(null);
    },
  });

  const deleteComponentMutation = useAppMutation({
    mutationFn: (row: PayComponent) => {
      if (!groupsTenantId) throw new Error("Select a business first");
      return deletePayComponent(groupsTenantId, row.id);
    },
    invalidateKeys: [["pay-components", groupsTenantId]],
    onSuccess: () => {
      setDeleteComponentTarget(null);
    },
  });

  const payslipTenantId = selectedPayroll?.tenantId ?? tenantId;
  const payslipInvoiceQuery = useQuery({
    queryKey: ["payroll-invoice", payslipTenantId, selectedPayroll?.id],
    enabled: Boolean(payslipTenantId && selectedPayroll?.id),
    queryFn: () =>
      findInvoiceForPayroll(payslipTenantId!, selectedPayroll!.id),
    staleTime: 60_000,
  });
  const payslipInvoice: InvoiceListRow | null = payslipInvoiceQuery.data ?? null;

  const payslipPaymentsQuery = useQuery({
    queryKey: ["payroll-payments", payslipTenantId, selectedPayroll?.id],
    enabled: Boolean(
      payslipTenantId &&
        selectedPayroll?.id &&
        selectedPayroll.paymentStatus === "paid",
    ),
    queryFn: () =>
      getPayrollPayments(payslipTenantId!, selectedPayroll!.id),
    staleTime: 60_000,
  });

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
                    setDepartmentFilter("");
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
                {
                  id: "department",
                  label: "Department",
                  value: departmentFilter,
                  onChange: setDepartmentFilter,
                  options: departmentFilterOptions,
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
            label: "View",
            onClick: () => setSelectedPayroll(r),
          },
        ]}
      />
    ),
  };

  const hq6PayrollColumns: ColumnConfig<Payroll>[] = [
    {
      key: "employeeName",
      header: "Employee",
      render: (r) => <span className="font-medium">{r.employeeName}</span>,
    },
    {
      key: "department",
      header: "Department",
      render: (r) => r.department?.trim() || "—",
    },
    {
      key: "designationName",
      header: "Designation",
      render: (r) => r.designationName?.trim() || "—",
    },
    {
      key: "payrollMonth",
      header: "Month/Year",
      sortValue: (r) => new Date(r.payrollMonth).getTime(),
      render: (r) => formatDate(r.payrollMonth),
    },
    {
      key: "referenceNo",
      header: "Reference No",
      render: (r) => r.referenceNo?.trim() || "—",
    },
    {
      key: "netPay",
      header: "Total amount",
      sortValue: (r) => r.netPay,
      render: (r) => formatCurrency(r.netPay, "NGN"),
    },
    {
      key: "paymentStatus",
      header: "Payment Status",
      render: (r) =>
        r.paymentStatus === "paid" ? (
          <button
            type="button"
            className="inline-flex cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setPaymentsModalPayroll(r);
            }}
          >
            <StatusPill status={r.paymentStatus} vocabulary="movementStatus" />
          </button>
        ) : (
          <StatusPill status={r.paymentStatus} vocabulary="movementStatus" />
        ),
    },
  ];

  const entityColumn: ColumnConfig<Payroll> = {
    key: "tenantCode",
    header: "Entity",
    render: (r) =>
      r.tenantCode ? (
        <EntityColorBadge code={r.tenantCode} size="sm" />
      ) : (
        <span className="text-sm text-muted">—</span>
      ),
  };

  const payrollListColumns: ColumnConfig<Payroll>[] = [
    payrollActionColumn,
    ...(allTenants ? [entityColumn, ...hq6PayrollColumns] : hq6PayrollColumns),
  ];

  const groupActionColumn: ColumnConfig<PayrollGroup> = {
    key: "actions",
    header: "Action",
    sortable: false,
    render: (r) => {
      const payTenantId = allTenants ? r.tenantId : tenantId;
      return (
        <Hq6ActionsMenu
          label="Actions"
          onOpenChange={(open) => {
            if (open && payTenantId) {
              prefetchPaymentAccountsRef(queryClient, payTenantId);
            }
          }}
          items={[
            {
              id: "view",
              label: "View",
              onClick: () =>
                router.push(payrollGroupHref(r, allTenants, tenantCode)),
            },
            ...(canUpdatePayroll
              ? [
                  {
                    id: "edit",
                    label: "Edit",
                    onClick: () =>
                      router.push(
                        payrollGroupHref(r, allTenants, tenantCode, "edit"),
                      ),
                  },
                  {
                    id: "add_payment",
                    label: "Add payment",
                    dividerBefore: true,
                    onClick: () => {
                      const href = payrollGroupHref(
                        r,
                        allTenants,
                        tenantCode,
                        "pay",
                      );
                      if (href === "#") {
                        toast.error("Could not open add payment page");
                        return;
                      }
                      router.push(href);
                    },
                  },
                ]
              : []),
            ...(canDeletePayroll
              ? [
                  {
                    id: "delete",
                    label: "Delete",
                    danger: true,
                    dividerBefore: true,
                    onClick: () => setDeleteGroupTarget(r),
                  },
                ]
              : []),
          ]}
        />
      );
    },
  };

  const groupColumnsBase: ColumnConfig<PayrollGroup>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Hq6BoldStatusBadge status={r.status} kind="payroll" />
      ),
    },
    {
      key: "paymentStatus",
      header: "Payment Status",
      render: (r) => (
        <Hq6BoldStatusBadge status={r.paymentStatus} kind="payment" />
      ),
    },
    {
      key: "totalGross",
      header: "Total gross",
      sortValue: (r) => r.totalGross,
      render: (r) => formatCurrency(r.totalGross, "NGN"),
    },
    {
      key: "createdByName",
      header: "Added By",
      render: (r) => r.createdByName?.trim() || "—",
    },
    {
      key: "locationCode",
      header: "Location",
      render: (r) => r.locationCode ?? "—",
    },
    {
      key: "createdAt",
      header: "Created At",
      sortValue: (r) => new Date(r.createdAt).getTime(),
      render: (r) => formatDate(r.createdAt),
    },
  ];

  const groupColumns: ColumnConfig<PayrollGroup>[] = [
    groupActionColumn,
    ...groupColumnsBase,
  ];

  const componentActionColumn: ColumnConfig<PayComponent> = {
    key: "actions",
    header: "Action",
    sortable: false,
    render: (r) => (
      <Hq6ActionsMenu
        label="Actions"
        items={[
          {
            id: "edit",
            label: "Edit",
            onClick: () => openEditComponent(r),
          },
          {
            id: "delete",
            label: "Delete",
            danger: true,
            onClick: () => setDeleteComponentTarget(r),
          },
        ]}
      />
    ),
  };

  const componentColumns: ColumnConfig<PayComponent>[] = [
    componentActionColumn,
    {
      key: "name",
      header: "Name",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "type", header: "Type", render: (r) => (r.type === "allowance" ? "Allowance" : "Deduction") },
    {
      key: "amountType",
      header: "Amount Type",
      render: (r) =>
        r.amountType === "percent" ? "Percent" : "Fixed",
    },
    {
      key: "amount",
      header: "Amount",
      sortValue: (r) => r.amount,
      render: (r) =>
        r.amountType === "percent"
          ? `${r.amount}%`
          : formatCurrency(r.amount, "NGN"),
    },
    {
      key: "applicableDate",
      header: "Applicable Date",
      sortValue: (r) =>
        r.applicableDate ? new Date(r.applicableDate).getTime() : 0,
      render: (r) =>
        r.applicableDate ? formatDate(r.applicableDate) : "—",
    },
    {
      key: "employeeName",
      header: "Employee",
      render: (r) => r.employeeName?.trim() || "All employees",
    },
  ];

  const componentFormFields = (
    form: ReturnType<typeof emptyComponentForm>,
    onChange: (next: ReturnType<typeof emptyComponentForm>) => void,
  ) => (
    <>
      <div className="min-w-[10rem] flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">Name</label>
        <input
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs font-medium text-muted">Type</label>
        <select
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={form.type}
          onChange={(e) =>
            onChange({
              ...form,
              type: e.target.value as PayComponent["type"],
            })
          }
        >
          <option value="allowance">Allowance</option>
          <option value="deduction">Deduction</option>
        </select>
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-muted">Amount Type</label>
        <select
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={form.amountType}
          onChange={(e) =>
            onChange({
              ...form,
              amountType: e.target.value as PayComponentAmountType,
            })
          }
        >
          {AMOUNT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-32">
        <label className="mb-1 block text-xs font-medium text-muted">Amount</label>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={form.amount}
          onChange={(e) => onChange({ ...form, amount: e.target.value })}
        />
      </div>
      <div className="w-40">
        <label className="mb-1 block text-xs font-medium text-muted">Applicable Date</label>
        <input
          type="date"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={form.applicableDate}
          onChange={(e) =>
            onChange({ ...form, applicableDate: e.target.value })
          }
        />
      </div>
      <div className="min-w-[10rem] flex-1">
        <label className="mb-1 block text-xs font-medium text-muted">Employee (optional)</label>
        <select
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          value={form.employeeRecordId}
          onChange={(e) =>
            onChange({ ...form, employeeRecordId: e.target.value })
          }
        >
          <option value="">All employees</option>
          {componentEmployeeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );

  const addPayrollSelectModal = (
    <Hq6Modal
      open={addPayrollOpen}
      onClose={resetAddPayrollFlow}
      title="Add Payroll"
      size="2xl"
      footer={
        <Hq6ModalSaveClose
          onSave={proceedToCreatePayroll}
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
                {addPayrollStaffBucket
                  ? "Select this group"
                  : "Select all matching"}
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
              Loading staff from users…
            </p>
          ) : addPayrollEmployeePicks.length === 0 ? (
            <div className="hq6-modal-input min-h-[10rem] space-y-3 py-3 text-sm">
              <p className="text-muted">
                No users found for this entity. Add people under Users first,
                then return here to run payroll.
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
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Staff group filter"
              >
                {STAFF_BUCKET_FILTERS.map((opt) => {
                  const active = addPayrollStaffBucket === opt.value;
                  const count =
                    opt.value === ""
                      ? addPayrollEmployeePicks.length
                      : addPayrollEmployeePicks.filter(
                          (e) => e.staffBucket === opt.value,
                        ).length;
                  return (
                    <button
                      key={opt.value || "all"}
                      type="button"
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
                        active
                          ? "border-[#2563eb] bg-[#2563eb] text-white"
                          : "border-border bg-card text-[#111827] hover:bg-[var(--color-surface-muted)]",
                      )}
                      onClick={() => setAddPayrollStaffBucket(opt.value)}
                    >
                      {opt.label}
                      <span
                        className={cn(
                          "ml-1 tabular-nums",
                          active ? "text-white/80" : "text-muted",
                        )}
                      >
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
              <EmployeePayrollSearch
                employees={employeesForPayrollModal}
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
                        <button
                          type="button"
                          className={cn(
                            "flex w-full cursor-pointer items-start gap-3 px-3 py-2 text-left hover:bg-surface",
                            checked && "bg-[var(--color-surface-muted)]",
                          )}
                          onClick={() =>
                            toggleAddPayrollEmployee(employee.id)
                          }
                        >
                          <PayrollSelectCheck checked={checked} />
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
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {employeesForPayrollModal.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted">
                    No staff in this group.
                  </p>
                ) : null}
              </div>
              <p className="text-xs text-muted">
                Showing {employeesForPayrollModal.length} of{" "}
                {addPayrollEmployeePicks.length} users
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

  const payslipModal = (
    <DocumentPreviewModal
      open={Boolean(selectedPayroll)}
      title={selectedPayroll ? payrollPayslipTitle(selectedPayroll) : "Payslip"}
      onClose={() => setSelectedPayroll(null)}
      printLabel="Print"
    >
      {selectedPayroll ? (
        <PayrollPayslipDocument
          payroll={selectedPayroll}
          tenantName={
            selectedPayroll.tenantName ?? tenantName ?? "Vonos"
          }
          tenantAddress={payslipAddress}
          locationLabel={selectedPayroll.locationCode}
          invoice={payslipInvoice}
          payments={payslipPaymentsQuery.data ?? null}
        />
      ) : null}
    </DocumentPreviewModal>
  );

  const payrollPrimaryAction = canCreatePayroll ? (
    <div className="flex flex-wrap items-center gap-2">
      <UposGradientActionButton label="Add Payroll" onClick={openAddPayroll} />
    </div>
  ) : null;

  const panelBody = (
    <>
      {activeTab === "payrolls" ? (
        <ServerPaginatedTable
          items={payrollsPage.items}
          columns={payrollListColumns}
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
              onClick={() => {
                if (!requireCan("essentials.create_payroll", "action")) return;
                createGroupMutation.mutate();
              }}
              disabled={
                !canCreatePayroll ||
                !newGroupName ||
                createGroupMutation.isPending
              }
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
            {componentFormFields(newComponent, setNewComponent)}
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
        open={Boolean(editComponent)}
        onClose={() => setEditComponent(null)}
        title="Edit pay component"
        size="lg"
        footer={
          <Hq6ModalSaveClose
            onSave={() => updateComponentMutation.mutate()}
            onClose={() => setEditComponent(null)}
            saving={updateComponentMutation.isPending}
            saveDisabled={
              !editComponentForm.name ||
              !editComponentForm.amount ||
              updateComponentMutation.isPending
            }
          />
        }
      >
        <div className="flex flex-wrap items-end gap-2">
          {componentFormFields(editComponentForm, setEditComponentForm)}
        </div>
      </Hq6Modal>

      <Hq6ConfirmModal
        open={Boolean(deleteComponentTarget)}
        onClose={() => setDeleteComponentTarget(null)}
        title="Delete pay component?"
        message={
          deleteComponentTarget
            ? `Delete "${deleteComponentTarget.name}"? This cannot be undone.`
            : "Are you sure?"
        }
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!deleteComponentTarget) return;
          deleteComponentMutation.mutate(deleteComponentTarget);
        }}
      />

      <Hq6ConfirmModal
        open={Boolean(deleteGroupTarget)}
        onClose={() => setDeleteGroupTarget(null)}
        title="Delete payroll group?"
        message={
          deleteGroupTarget
            ? `Delete “${deleteGroupTarget.name}” and all payroll rows in this group?`
            : "Are you sure?"
        }
        confirmLabel="Delete"
        danger
        confirming={deleteGroupMutation.isPending}
        onConfirm={() => {
          if (!deleteGroupTarget) return;
          deleteGroupMutation.mutate(deleteGroupTarget);
        }}
      />

      {payslipModal}

      <PayrollViewPaymentsModal
        open={Boolean(paymentsModalPayroll)}
        onClose={() => setPaymentsModalPayroll(null)}
        tenantId={paymentsModalPayroll?.tenantId ?? tenantId ?? null}
        payroll={paymentsModalPayroll}
      />
    </>
  );

  const shell = (
    <ListPageShell
      tabs={
        allTenants && !filterTenantId
          ? PAYROLL_TABS.filter((t) => t.id === "payrolls").map((t) => ({
              id: t.id,
              label: t.label,
            }))
          : PAYROLL_TABS.map((t) => ({ id: t.id, label: t.label }))
      }
      activeTab={activeTab}
      onTabChange={(id) => {
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
      filterDropdowns={payrollFilterDropdowns}
      primaryAction={payrollPrimaryAction}
      pageSize={
        activeTab === "payrolls"
          ? payrollsPage.pageSize
          : activeTab === "groups"
            ? groupsPage.pageSize
            : componentsPage.pageSize
      }
      onPageSizeChange={
        activeTab === "payrolls"
          ? payrollsPage.setPageSize
          : activeTab === "groups"
            ? groupsPage.setPageSize
            : componentsPage.setPageSize
      }
      className={embedded && isHq6 ? "border-0 shadow-none bg-transparent" : embedded ? "border-0 shadow-none" : undefined}
      hq6Title="HRM"
      hq6Subtitle={allTenants ? "Payroll — all businesses" : "Payroll"}
      hq6PageChrome={isHq6}
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
            ? "Select employees to start a payroll group, then finalize and pay from Payroll Groups."
            : "Add employees to a payroll group, finalize it, then pay from Payroll Groups."
        }
      />
      {shell}
    </div>
  );
}
