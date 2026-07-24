import type {
  Payroll,
  PayrollGroup,
  PayComponent,
  PayrollFilters,
  Designation,
  Employee,
  WorkforceMember,
  CreatePayrollRequest,
  CreatePayrollGroupRequest,
  CreatePayComponentRequest,
  CreateDesignationRequest,
  CreateEmployeeRequest,
  UpdateDesignationRequest,
  UpdatePayrollGroupRequest,
  LeaveTypeRow,
  LeaveRow,
  HolidayRow,
  AttendanceShiftRow,
  AttendanceRow,
  AttendanceByShiftRow,
  SalesTargetRow,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const PAYROLL_PATH = "/hrm/payroll";
const PAYROLL_GROUPS_PATH = "/hrm/payroll-groups";
const PAY_COMPONENTS_PATH = "/hrm/pay-components";
const WORKFORCE_PATH = "/hrm/workforce";
const DESIGNATIONS_PATH = "/hrm/designations";
const EMPLOYEES_PATH = "/hrm/employees";
const LEAVE_TYPES_PATH = "/hrm/leave-types";
const LEAVES_PATH = "/hrm/leaves";
const HOLIDAYS_PATH = "/hrm/holidays";
const ATTENDANCE_PATH = "/hrm/attendance";
const ATTENDANCE_SHIFTS_PATH = "/hrm/attendance/shifts";
const SALES_TARGETS_PATH = "/hrm/sales-targets";

function asArray<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (
    body &&
    typeof body === "object" &&
    "items" in body &&
    Array.isArray((body as { items: unknown }).items)
  ) {
    return (body as { items: T[] }).items;
  }
  return [];
}

async function fetchWorkforceRaw(
  tenantId: string | null,
  options: {
    allTenants?: boolean;
    search?: string;
    cursor?: string;
    limit?: number;
    includeSummary?: boolean;
  },
): Promise<ListPage<WorkforceMember>> {
  const params = new URLSearchParams();
  if (options.allTenants) params.set("allTenants", "true");
  if (options.search) params.set("search", options.search);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.includeSummary === false) params.set("includeSummary", "0");
  else if (options.includeSummary === true) params.set("includeSummary", "1");
  const query = params.toString();
  const base = query ? `${WORKFORCE_PATH}?${query}` : WORKFORCE_PATH;
  const path = options.allTenants ? base : withTenantQuery(base, tenantId ?? undefined);
  const res = await apiFetch(path);
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("You need super admin access to view all workforce.");
    }
    throw new Error("Failed to fetch workforce");
  }
  const body = await res.json();
  if (Array.isArray(body)) {
    return {
      items: body as WorkforceMember[],
      hasMore: body.length >= (options.limit ?? TYPEAHEAD_PAGE_SIZE),
      pageSize: options.limit ?? TYPEAHEAD_PAGE_SIZE,
    };
  }
  return {
    items: (body.items ?? []) as WorkforceMember[],
    hasMore: Boolean(body.hasMore),
    pageSize: options.limit ?? TYPEAHEAD_PAGE_SIZE,
    totalCount: body.totalCount,
  };
}

export async function getWorkforce(
  tenantId: string,
  search?: string,
  limit = TYPEAHEAD_PAGE_SIZE,
): Promise<WorkforceMember[]> {
  const page = await fetchWorkforceRaw(tenantId, {
    search,
    limit,
    includeSummary: false,
  });
  return page.items;
}

export async function getAllTenantsWorkforce(search?: string): Promise<WorkforceMember[]> {
  const page = await fetchWorkforceRaw(null, {
    allTenants: true,
    search,
    limit: TYPEAHEAD_PAGE_SIZE,
    includeSummary: false,
  });
  return page.items;
}

export async function getWorkforceStats(tenantId: string): Promise<{
  totalCount: number;
  byLocation: Array<{ locationCode: string | null; count: number }>;
}> {
  const res = await apiFetch(withTenantQuery(`${WORKFORCE_PATH}/stats`, tenantId));
  if (!res.ok) throw new Error("Failed to fetch workforce stats");
  return res.json();
}

export async function getWorkforcePage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string,
  opts?: { includeSummary?: boolean },
): Promise<ListPage<WorkforceMember>> {
  return fetchWorkforceRaw(tenantId, {
    search,
    cursor,
    limit,
    includeSummary: opts?.includeSummary,
  });
}

export async function getAllTenantsWorkforcePage(
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string,
  opts?: { includeSummary?: boolean },
): Promise<ListPage<WorkforceMember>> {
  return fetchWorkforceRaw(null, {
    allTenants: true,
    search,
    cursor,
    limit,
    includeSummary: opts?.includeSummary,
  });
}

async function fetchPayrollsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<Payroll[]> {
  const tenantPath = withTenantQuery(PAYROLL_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    cursor,
    limit,
    includeSummary: false,
  });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch payrolls");
  const body = await res.json();
  if (Array.isArray(body)) return body as Payroll[];
  return (body.items ?? []) as Payroll[];
}

async function fetchPayrollGroupsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<PayrollGroup[]> {
  const tenantPath = withTenantQuery(PAYROLL_GROUPS_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch payroll groups");
  return res.json();
}

async function fetchPayComponentsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<PayComponent[]> {
  const tenantPath = withTenantQuery(PAY_COMPONENTS_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch pay components");
  return res.json();
}

export async function getPayrollsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: PayrollFilters & { includeSummary?: boolean } = {},
): Promise<ListPage<Payroll>> {
  return fetchTenantListPage(PAYROLL_PATH, tenantId, cursor, limit, {
    search: filters.search,
    payrollGroupId: filters.payrollGroupId,
    employeeRecordId: filters.employeeRecordId,
    locationCode: filters.locationCode,
    designationId: filters.designationId,
    month: filters.month != null ? String(filters.month) : undefined,
    year: filters.year != null ? String(filters.year) : undefined,
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    includeSummary: filters.includeSummary ?? false,
  });
}

/** Typeahead options — never dumps the full catalog. */
export async function getDesignations(
  tenantId: string,
  search?: string,
): Promise<Designation[]> {
  const tenantPath = withTenantQuery(DESIGNATIONS_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    search,
    limit: TYPEAHEAD_PAGE_SIZE,
  });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch designations");
  return asArray<Designation>(await res.json());
}

export async function getDesignationsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { search?: string; includeSummary?: boolean } | string,
): Promise<ListPage<Designation>> {
  const search = typeof opts === "string" ? opts : opts?.search;
  const includeSummary =
    typeof opts === "string" ? false : (opts?.includeSummary ?? false);
  return fetchTenantListPage(DESIGNATIONS_PATH, tenantId, cursor, limit, {
    search,
    includeSummary,
  });
}

export async function createDesignation(
  tenantId: string,
  dto: CreateDesignationRequest,
): Promise<Designation> {
  const res = await apiFetch(withTenantQuery(DESIGNATIONS_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create designation");
  return res.json();
}

/** Service staff roster for sales assignment and filters. */
export async function getServiceStaff(
  tenantId: string,
  search?: string,
): Promise<Employee[]> {
  const tenantPath = withTenantQuery(EMPLOYEES_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    search,
    serviceStaffOnly: "true",
    limit: TYPEAHEAD_PAGE_SIZE,
  });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch service staff");
  return asArray<Employee>(await res.json());
}

/** Typeahead options — never dumps the full catalog. */
export async function getEmployees(
  tenantId: string,
  search?: string,
): Promise<Employee[]> {
  const tenantPath = withTenantQuery(EMPLOYEES_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    search,
    limit: TYPEAHEAD_PAGE_SIZE,
  });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch employees");
  return asArray<Employee>(await res.json());
}

export async function getEmployeesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string,
): Promise<ListPage<Employee>> {
  return fetchTenantListPage(EMPLOYEES_PATH, tenantId, cursor, limit, {
    search,
  });
}

export async function createEmployee(
  tenantId: string,
  dto: CreateEmployeeRequest,
): Promise<Employee> {
  const res = await apiFetch(withTenantQuery(EMPLOYEES_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create employee");
  return res.json();
}

export async function getPayrollGroupsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { search?: string; includeSummary?: boolean },
): Promise<ListPage<PayrollGroup>> {
  return fetchTenantListPage(PAYROLL_GROUPS_PATH, tenantId, cursor, limit, {
    search: opts?.search,
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function getPayComponentsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { search?: string; includeSummary?: boolean },
): Promise<ListPage<PayComponent>> {
  return fetchTenantListPage(PAY_COMPONENTS_PATH, tenantId, cursor, limit, {
    search: opts?.search,
    includeSummary: opts?.includeSummary ?? false,
  });
}

/** Full payroll list for export — not for table rendering. */
export async function getAllPayrolls(tenantId: string): Promise<Payroll[]> {
  return fetchAllPages(
    (cursor, limit) => fetchPayrollsRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

/** Full payroll group list for export — not for table rendering. */
export async function getAllPayrollGroups(tenantId: string): Promise<PayrollGroup[]> {
  return fetchAllPages(
    (cursor, limit) => fetchPayrollGroupsRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

/** Full pay component list for export — not for table rendering. */
export async function getAllPayComponents(tenantId: string): Promise<PayComponent[]> {
  return fetchAllPages(
    (cursor, limit) => fetchPayComponentsRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getPayrolls(tenantId: string): Promise<Payroll[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchPayrollsRaw(tenantId, cursor, limit),
  );
}

export async function createPayroll(
  tenantId: string,
  dto: CreatePayrollRequest,
): Promise<Payroll> {
  const res = await apiFetch(withTenantQuery(PAYROLL_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create payroll");
  return res.json();
}

export async function addPayrollDeduction(
  tenantId: string,
  payrollId: string,
  dto: {
    addAmount?: number;
    totalDeduction?: number;
    note?: string;
    reason?: string;
  },
): Promise<Payroll> {
  const res = await apiFetch(
    withTenantQuery(`${PAYROLL_PATH}/${payrollId}/deduction`, tenantId),
    {
      method: "PATCH",
      body: JSON.stringify(dto),
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message ?? "Failed to add deduction");
  }
  return res.json();
}

/** Typeahead options — never dumps the full catalog. */
export async function getPayrollGroups(
  tenantId: string,
  search?: string,
): Promise<PayrollGroup[]> {
  const tenantPath = withTenantQuery(PAYROLL_GROUPS_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    search,
    limit: TYPEAHEAD_PAGE_SIZE,
  });
  const res = await apiFetch(url);
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body as { message?: string | string[] } | null;
    const message = Array.isArray(err?.message)
      ? err.message.join(", ")
      : err?.message;
    throw new Error(message ?? "Failed to fetch payroll groups");
  }
  return asArray<PayrollGroup>(body);
}

export async function createPayrollGroup(
  tenantId: string,
  dto: CreatePayrollGroupRequest,
): Promise<PayrollGroup> {
  const res = await apiFetch(withTenantQuery(PAYROLL_GROUPS_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message ?? "Failed to create payroll group");
  }
  return res.json();
}

export async function getPayComponents(tenantId: string): Promise<PayComponent[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchPayComponentsRaw(tenantId, cursor, limit),
  );
}

export async function createPayComponent(
  tenantId: string,
  dto: CreatePayComponentRequest,
): Promise<PayComponent> {
  const res = await apiFetch(withTenantQuery(PAY_COMPONENTS_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create pay component");
  return res.json();
}

export async function updateDesignation(
  tenantId: string,
  id: string,
  dto: UpdateDesignationRequest,
): Promise<Designation> {
  const res = await apiFetch(
    withTenantQuery(`${DESIGNATIONS_PATH}/${id}`, tenantId),
    { method: "PATCH", body: JSON.stringify(dto) },
  );
  if (!res.ok) throw new Error("Failed to update designation");
  return res.json();
}

export async function deleteDesignation(
  tenantId: string,
  id: string,
): Promise<void> {
  const res = await apiFetch(
    withTenantQuery(`${DESIGNATIONS_PATH}/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete designation");
}

export async function updatePayrollGroup(
  tenantId: string,
  id: string,
  dto: UpdatePayrollGroupRequest,
): Promise<PayrollGroup> {
  const res = await apiFetch(
    withTenantQuery(`${PAYROLL_GROUPS_PATH}/${id}`, tenantId),
    { method: "PATCH", body: JSON.stringify(dto) },
  );
  if (!res.ok) throw new Error("Failed to update department");
  return res.json();
}

export async function deletePayrollGroup(
  tenantId: string,
  id: string,
): Promise<void> {
  const res = await apiFetch(
    withTenantQuery(`${PAYROLL_GROUPS_PATH}/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete department");
}

export async function getLeaveTypesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { search?: string; includeSummary?: boolean },
): Promise<ListPage<LeaveTypeRow>> {
  return fetchTenantListPage(LEAVE_TYPES_PATH, tenantId, cursor, limit, {
    search: opts?.search,
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function createLeaveType(
  tenantId: string,
  dto: { name: string; maxLeaveCount?: number },
): Promise<LeaveTypeRow> {
  const res = await apiFetch(withTenantQuery(LEAVE_TYPES_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create leave type");
  return res.json();
}

export async function updateLeaveType(
  tenantId: string,
  id: string,
  dto: { name?: string; maxLeaveCount?: number },
): Promise<LeaveTypeRow> {
  const res = await apiFetch(
    withTenantQuery(`${LEAVE_TYPES_PATH}/${id}`, tenantId),
    { method: "PATCH", body: JSON.stringify(dto) },
  );
  if (!res.ok) throw new Error("Failed to update leave type");
  return res.json();
}

export async function deleteLeaveType(
  tenantId: string,
  id: string,
): Promise<void> {
  const res = await apiFetch(
    withTenantQuery(`${LEAVE_TYPES_PATH}/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete leave type");
}

export async function getLeavesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: {
    search?: string;
    designationId?: string;
    includeSummary?: boolean;
  },
): Promise<ListPage<LeaveRow>> {
  return fetchTenantListPage(LEAVES_PATH, tenantId, cursor, limit, {
    search: opts?.search,
    designationId: opts?.designationId,
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function createLeave(
  tenantId: string,
  dto: {
    referenceNo?: string;
    leaveTypeId?: string;
    employeeName: string;
    employeeRecordId?: string;
    designationId?: string;
    leaveDate: string;
    reason?: string;
    status?: string;
  },
): Promise<LeaveRow> {
  const res = await apiFetch(withTenantQuery(LEAVES_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create leave");
  return res.json();
}

export async function deleteLeave(tenantId: string, id: string): Promise<void> {
  const res = await apiFetch(withTenantQuery(`${LEAVES_PATH}/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete leave");
}

export async function getHolidaysPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { search?: string; includeSummary?: boolean },
): Promise<ListPage<HolidayRow>> {
  return fetchTenantListPage(HOLIDAYS_PATH, tenantId, cursor, limit, {
    search: opts?.search,
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function createHoliday(
  tenantId: string,
  dto: {
    name: string;
    date: string;
    locationCode?: string;
    note?: string;
  },
): Promise<HolidayRow> {
  const res = await apiFetch(withTenantQuery(HOLIDAYS_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create holiday");
  return res.json();
}

export async function deleteHoliday(
  tenantId: string,
  id: string,
): Promise<void> {
  const res = await apiFetch(
    withTenantQuery(`${HOLIDAYS_PATH}/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete holiday");
}

export async function getAttendanceShiftsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { search?: string; includeSummary?: boolean },
): Promise<ListPage<AttendanceShiftRow>> {
  return fetchTenantListPage(ATTENDANCE_SHIFTS_PATH, tenantId, cursor, limit, {
    search: opts?.search,
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function createAttendanceShift(
  tenantId: string,
  dto: { name: string },
): Promise<AttendanceShiftRow> {
  const res = await apiFetch(
    withTenantQuery(ATTENDANCE_SHIFTS_PATH, tenantId),
    { method: "POST", body: JSON.stringify(dto) },
  );
  if (!res.ok) throw new Error("Failed to create shift");
  return res.json();
}

export async function getAttendancesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { search?: string; date?: string; includeSummary?: boolean },
): Promise<ListPage<AttendanceRow>> {
  return fetchTenantListPage(ATTENDANCE_PATH, tenantId, cursor, limit, {
    search: opts?.search,
    date: opts?.date,
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function getAttendanceByShift(
  tenantId: string,
  date: string,
): Promise<AttendanceByShiftRow[]> {
  const url = appendListQuery(
    withTenantQuery(`${ATTENDANCE_PATH}/by-shift`, tenantId),
    { date },
  );
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch attendance by shift");
  return asArray<AttendanceByShiftRow>(await res.json());
}

export async function clockInAttendance(
  tenantId: string,
  dto: { employeeName: string; shiftId?: string; date?: string },
): Promise<AttendanceRow> {
  const res = await apiFetch(
    withTenantQuery(`${ATTENDANCE_PATH}/clock-in`, tenantId),
    { method: "POST", body: JSON.stringify(dto) },
  );
  if (!res.ok) throw new Error("Failed to clock in");
  return res.json();
}

export async function getSalesTargetsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { search?: string; includeSummary?: boolean },
): Promise<ListPage<SalesTargetRow>> {
  return fetchTenantListPage(SALES_TARGETS_PATH, tenantId, cursor, limit, {
    search: opts?.search,
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function upsertSalesTarget(
  tenantId: string,
  dto: { userName: string; userId?: string; note?: string },
): Promise<SalesTargetRow> {
  const res = await apiFetch(withTenantQuery(SALES_TARGETS_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to set sales target");
  return res.json();
}
