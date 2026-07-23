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
  },
): Promise<WorkforceMember[]> {
  const params = new URLSearchParams();
  if (options.allTenants) params.set("allTenants", "true");
  if (options.search) params.set("search", options.search);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit != null) params.set("limit", String(options.limit));
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
  return res.json();
}

export async function getWorkforce(
  tenantId: string,
  search?: string,
  limit = TYPEAHEAD_PAGE_SIZE,
): Promise<WorkforceMember[]> {
  return fetchWorkforceRaw(tenantId, {
    search,
    limit,
  });
}

export async function getAllTenantsWorkforce(search?: string): Promise<WorkforceMember[]> {
  return fetchWorkforceRaw(null, {
    allTenants: true,
    search,
    limit: TYPEAHEAD_PAGE_SIZE,
  });
}

export async function getWorkforcePage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string,
): Promise<ListPage<WorkforceMember>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchWorkforceRaw(tenantId, {
        search,
        cursor: pageCursor,
        limit: pageLimit,
      }),
    cursor,
    limit,
  );
}

export async function getAllTenantsWorkforcePage(
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  search?: string,
): Promise<ListPage<WorkforceMember>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchWorkforceRaw(null, {
        allTenants: true,
        search,
        cursor: pageCursor,
        limit: pageLimit,
      }),
    cursor,
    limit,
  );
}

async function fetchPayrollsRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<Payroll[]> {
  const tenantPath = withTenantQuery(PAYROLL_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch payrolls");
  return res.json();
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
  search?: string,
): Promise<ListPage<Designation>> {
  return fetchTenantListPage(DESIGNATIONS_PATH, tenantId, cursor, limit, {
    search,
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
  opts?: { includeSummary?: boolean },
): Promise<ListPage<PayrollGroup>> {
  return fetchTenantListPage(PAYROLL_GROUPS_PATH, tenantId, cursor, limit, {
    includeSummary: opts?.includeSummary ?? false,
  });
}

export async function getPayComponentsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  opts?: { includeSummary?: boolean },
): Promise<ListPage<PayComponent>> {
  return fetchTenantListPage(PAY_COMPONENTS_PATH, tenantId, cursor, limit, {
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
