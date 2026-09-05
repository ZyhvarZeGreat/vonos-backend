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
  SyncEmployeeByUserRequest,
  UpdateDesignationRequest,
  UpdatePayrollGroupRequest,
  PayPayrollsRequest,
  PayPayrollsResult,
  LeaveTypeRow,
  LeaveRow,
  HolidayRow,
  AttendanceShiftRow,
  AttendanceRow,
  AttendanceByShiftRow,
  SalesTargetRow,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import { throwApiError } from "@/lib/api/parseApiError";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  FILTER_DROPDOWN_INITIAL_LIMIT,
  FILTER_ROSTER_TTL_MS,
  IN_MEMORY_FILTER_CATALOG_LIMIT,
  TYPEAHEAD_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchJsonListPage, fetchTenantListPage } from "@/lib/api/listPageHelpers";
import { createAccumulatingPicker } from "@/lib/api/accumulatingPicker";
import { createAsyncTtlCache } from "@/lib/utils/asyncTtlCache";
import { compositeListCursorFrom, payrollListCursor, workforceListCursor } from "@/lib/utils/pagination";
import { matchSorter, rankings } from "match-sorter";

/** Full staff roster for filters/pickers — cleared only on HRM mutations. */
const employeeOptionCache = createAsyncTtlCache<Employee[]>({
  ttlMs: FILTER_ROSTER_TTL_MS,
  maxEntries: 64,
});

/** Full designation roster — cleared only on designation mutations. */
const designationOptionCache = createAsyncTtlCache<Designation[]>({
  ttlMs: FILTER_ROSTER_TTL_MS,
  maxEntries: 64,
});

/** Drop cached employee/service-staff option lists (call after HRM mutations). */
export function clearEmployeeOptionCache(): void {
  employeeOptionCache.clear();
  for (const picker of serviceStaffPickers.values()) picker.clearAll();
  serviceStaffPickers.clear();
  for (const picker of employeePickers.values()) picker.clearAll();
  employeePickers.clear();
}

/** Drop cached designation option lists (call after designation mutations). */
export function clearDesignationOptionCache(): void {
  designationOptionCache.clear();
}

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

/** Full workforce roster for add-payroll multi-select (not for table paging). */
export async function getAllWorkforce(
  tenantId: string,
): Promise<WorkforceMember[]> {
  return fetchAllPages(
    async (cursor, limit) => {
      const page = await getWorkforcePage(tenantId, cursor, limit, undefined, {
        includeSummary: false,
      });
      return page.items;
    },
    EXPORT_PAGE_SIZE,
    (row) => workforceListCursor(row),
    IN_MEMORY_FILTER_CATALOG_LIMIT,
  );
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
    tenantCode: filters.tenantCode,
    month: filters.month != null ? String(filters.month) : undefined,
    year: filters.year != null ? String(filters.year) : undefined,
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    includeSummary: filters.includeSummary ?? false,
  });
}

/** VAG super-admin: payrolls across all businesses. */
export async function getAllTenantsPayrollsPage(
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  filters: PayrollFilters & { includeSummary?: boolean } = {},
): Promise<ListPage<Payroll>> {
  return fetchJsonListPage<Payroll>(PAYROLL_PATH, cursor, limit, {
    allTenants: true,
    search: filters.search,
    payrollGroupId: filters.payrollGroupId,
    employeeRecordId: filters.employeeRecordId,
    locationCode: filters.locationCode,
    designationId: filters.designationId,
    tenantCode: filters.tenantCode,
    month: filters.month != null ? String(filters.month) : undefined,
    year: filters.year != null ? String(filters.year) : undefined,
    status: filters.status,
    paymentStatus: filters.paymentStatus,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    includeSummary: filters.includeSummary ?? false,
  });
}

/** Unpaid (due + partial) payrolls matching filters — settle a group or designation. */
export async function getUnpaidPayrolls(
  tenantId: string,
  filters: Omit<PayrollFilters, "paymentStatus"> = {},
): Promise<Payroll[]> {
  const unpaid: Payroll[] = [];
  for (const paymentStatus of ["due", "partial"] as const) {
    const rows = await fetchAllPages(
      async (cursor, limit) => {
        const page = await getPayrollsPage(tenantId, cursor, limit, {
          ...filters,
          paymentStatus,
          includeSummary: false,
        });
        return page.items;
      },
      EXPORT_PAGE_SIZE,
      (row) => payrollListCursor(row),
    );
    unpaid.push(...rows);
  }
  return unpaid.filter((row) => row.paymentStatus !== "paid" && row.netPay > 0);
}

/** Unpaid (due + partial) payrolls for a group — used to settle a whole group. */
export async function getUnpaidPayrollsForGroup(
  tenantId: string,
  payrollGroupId: string,
  filters: Omit<PayrollFilters, "payrollGroupId" | "paymentStatus"> = {},
): Promise<Payroll[]> {
  return getUnpaidPayrolls(tenantId, { ...filters, payrollGroupId });
}

/** Unpaid payrolls for a designation. */
export async function getUnpaidPayrollsForDesignation(
  tenantId: string,
  designationId: string,
  filters: Omit<PayrollFilters, "designationId" | "paymentStatus"> = {},
): Promise<Payroll[]> {
  return getUnpaidPayrolls(tenantId, { ...filters, designationId });
}

/** Full designation roster — loaded once; cleared only on designation mutations. */
export async function getDesignationRoster(
  tenantId: string,
): Promise<Designation[]> {
  const cacheKey = JSON.stringify(["designation-roster", tenantId]);
  return designationOptionCache.get(cacheKey, async () =>
    fetchAllPages(
      async (cursor, limit) => {
        const url = appendListQuery(
          withTenantQuery(DESIGNATIONS_PATH, tenantId),
          { cursor, limit },
        );
        const res = await apiFetch(url);
        if (!res.ok) throw new Error("Failed to fetch designations");
        return asArray<Designation>(await res.json());
      },
      Math.min(EXPORT_PAGE_SIZE, IN_MEMORY_FILTER_CATALOG_LIMIT),
      (row) => compositeListCursorFrom(row, "name", "string"),
      IN_MEMORY_FILTER_CATALOG_LIMIT,
    ),
  );
}

/**
 * Designation filter/picker options — full roster; `search` is local match-sorter.
 */
export async function getDesignations(
  tenantId: string,
  search?: string,
  opts?: { limit?: number },
): Promise<Designation[]> {
  const roster = await getDesignationRoster(tenantId);
  const q = search?.trim() ?? "";
  const matched = q
    ? matchSorter(roster, q, {
        keys: ["name"],
        threshold: rankings.CONTAINS,
        keepDiacritics: true,
      })
    : roster;
  const limit = opts?.limit;
  return limit != null ? matched.slice(0, limit) : matched;
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
  if (!res.ok) return throwApiError(res, "Failed to create designation");
  clearDesignationOptionCache();
  return res.json();
}

type StaffPicker = ReturnType<typeof createAccumulatingPicker<Employee>>;
const serviceStaffPickers = new Map<string, StaffPicker>();

function serviceStaffPickerFor(tenantId: string): StaffPicker {
  let picker = serviceStaffPickers.get(tenantId);
  if (!picker) {
    picker = createAccumulatingPicker<Employee>({
      getCursor: (row) => compositeListCursorFrom(row, "name", "string"),
      searchKeys: ["name", "employeeCode", "designationName"],
      fetchPage: (cursor, limit, search) =>
        fetchListPage(
          async (pageCursor, pageLimit) => {
            const url = appendListQuery(withTenantQuery(EMPLOYEES_PATH, tenantId), {
              serviceStaffOnly: "true",
              search: search || undefined,
              cursor: pageCursor,
              limit: pageLimit,
            });
            const res = await apiFetch(url);
            if (!res.ok) throw new Error("Failed to fetch service staff");
            return asArray<Employee>(await res.json());
          },
          cursor,
          limit,
        ),
    });
    serviceStaffPickers.set(tenantId, picker);
  }
  return picker;
}

/**
 * Service staff filter/picker — first ~100, scroll for more.
 * Search uses loaded rows first; otherwise API.
 */
export async function getServiceStaff(
  tenantId: string,
  search?: string,
  _opts?: { limit?: number },
): Promise<Employee[]> {
  const page = await serviceStaffPickerFor(tenantId).load(tenantId, search);
  return page.items;
}

export async function loadMoreServiceStaffForPicker(
  tenantId: string,
): Promise<{ items: Employee[]; appended: Employee[]; hasMore: boolean }> {
  return serviceStaffPickerFor(tenantId).loadMore(tenantId);
}

export function serviceStaffPickerHasMore(tenantId: string): boolean {
  return serviceStaffPickerFor(tenantId).hasMore(tenantId);
}

type EmployeePicker = ReturnType<typeof createAccumulatingPicker<Employee>>;
const employeePickers = new Map<string, EmployeePicker>();

function employeePickerKey(tenantId: string, designationId = ""): string {
  return JSON.stringify([tenantId, designationId]);
}

function employeePickerFor(
  tenantId: string,
  designationId = "",
): EmployeePicker {
  const key = employeePickerKey(tenantId, designationId);
  let picker = employeePickers.get(key);
  if (!picker) {
    picker = createAccumulatingPicker<Employee>({
      getCursor: (row) => compositeListCursorFrom(row, "name", "string"),
      searchKeys: ["name", "employeeCode", "designationName"],
      fetchPage: (cursor, limit, search) =>
        fetchListPage(
          async (pageCursor, pageLimit) => {
            const url = appendListQuery(withTenantQuery(EMPLOYEES_PATH, tenantId), {
              search: search || undefined,
              designationId: designationId || undefined,
              cursor: pageCursor,
              limit: pageLimit,
            });
            const res = await apiFetch(url);
            if (!res.ok) throw new Error("Failed to fetch employees");
            return asArray<Employee>(await res.json());
          },
          cursor,
          limit,
        ),
    });
    employeePickers.set(key, picker);
  }
  return picker;
}

/**
 * Employee filter/picker — first ~100, scroll for more.
 * Search uses loaded rows first; otherwise API.
 */
export async function getEmployees(
  tenantId: string,
  search?: string,
  opts?: {
    designationId?: string;
    serviceStaffOnly?: boolean;
    limit?: number;
  },
): Promise<Employee[]> {
  if (opts?.serviceStaffOnly) {
    return getServiceStaff(tenantId, search, { limit: opts.limit });
  }
  const designationId = opts?.designationId ?? "";
  const key = employeePickerKey(tenantId, designationId);
  const page = await employeePickerFor(tenantId, designationId).load(key, search);
  return page.items;
}

export async function loadMoreEmployeesForPicker(
  tenantId: string,
  opts?: { designationId?: string },
): Promise<{ items: Employee[]; appended: Employee[]; hasMore: boolean }> {
  const designationId = opts?.designationId ?? "";
  const key = employeePickerKey(tenantId, designationId);
  return employeePickerFor(tenantId, designationId).loadMore(key);
}

export function employeePickerHasMore(
  tenantId: string,
  designationId = "",
): boolean {
  const key = employeePickerKey(tenantId, designationId);
  return employeePickerFor(tenantId, designationId).hasMore(key);
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

/** Full employee roster for add-payroll multi-select (real Employee rows). */
export async function getAllEmployees(
  tenantId: string,
): Promise<Employee[]> {
  return fetchAllPages(
    async (cursor, limit) => {
      const page = await getEmployeesPage(tenantId, cursor, limit);
      return page.items;
    },
    EXPORT_PAGE_SIZE,
    (row) => compositeListCursorFrom(row, "name", "string"),
    IN_MEMORY_FILTER_CATALOG_LIMIT,
  );
}

export async function createEmployee(
  tenantId: string,
  dto: CreateEmployeeRequest,
): Promise<Employee> {
  const res = await apiFetch(withTenantQuery(EMPLOYEES_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) return throwApiError(res, "Failed to create employee");
  clearEmployeeOptionCache();
  return res.json();
}

export async function syncEmployeeWorkLocations(
  tenantId: string,
  userId: string,
  dto: SyncEmployeeByUserRequest & { locationCodes: string[] },
): Promise<Employee | null> {
  const res = await apiFetch(
    withTenantQuery(
      `${EMPLOYEES_PATH}/by-user/${encodeURIComponent(userId)}/locations`,
      tenantId,
    ),
    {
      method: "PATCH",
      body: JSON.stringify(dto),
    },
  );
  if (!res.ok) {
    return throwApiError(res, "Failed to update work locations");
  }
  clearEmployeeOptionCache();
  return res.json();
}

export async function getEmployeeByUserId(
  tenantId: string,
  userId: string,
): Promise<Employee | null> {
  const res = await apiFetch(
    withTenantQuery(
      `${EMPLOYEES_PATH}/by-user/${encodeURIComponent(userId)}`,
      tenantId,
    ),
  );
  if (res.status === 404) return null;
  if (!res.ok) return throwApiError(res, "Failed to load employee");
  const body = (await res.json()) as Employee | null;
  return body ?? null;
}

export async function getLatestPayrollForEmployee(
  tenantId: string,
  employeeRecordId: string,
): Promise<Payroll | null> {
  const page = await getPayrollsPage(tenantId, undefined, 1, {
    employeeRecordId,
    sortBy: "payrollMonth",
    sortDir: "desc",
    includeSummary: false,
  });
  return page.items[0] ?? null;
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
  if (!res.ok) return throwApiError(res, "Failed to create payroll");
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
    return throwApiError(res, "Failed to add deduction");
  }
  return res.json();
}

export async function payPayrolls(
  tenantId: string,
  dto: PayPayrollsRequest,
): Promise<PayPayrollsResult> {
  const res = await apiFetch(withTenantQuery(`${PAYROLL_PATH}/pay`, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    return throwApiError(res, "Failed to pay payrolls");
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
    const err = body as { message?: string | string[]; error?: string } | null;
    const message = Array.isArray(err?.message)
      ? err.message.join(" ")
      : err?.message || err?.error;
    throw new Error(message || "Failed to fetch payroll groups");
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
    return throwApiError(res, "Failed to create payroll group");
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
  clearDesignationOptionCache();
  clearEmployeeOptionCache();
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
  clearDesignationOptionCache();
  clearEmployeeOptionCache();
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
