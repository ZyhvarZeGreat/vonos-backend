import type {
  Payroll,
  PayrollGroup,
  PayComponent,
  WorkforceMember,
  CreatePayrollRequest,
  CreatePayrollGroupRequest,
  CreatePayComponentRequest,
} from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";

const PAYROLL_PATH = "/hrm/payroll";
const PAYROLL_GROUPS_PATH = "/hrm/payroll-groups";
const PAY_COMPONENTS_PATH = "/hrm/pay-components";
const WORKFORCE_PATH = "/hrm/workforce";

async function fetchWorkforceRaw(
  tenantId: string | null,
  options: { allTenants?: boolean; search?: string },
): Promise<WorkforceMember[]> {
  const params = new URLSearchParams();
  if (options.allTenants) params.set("allTenants", "true");
  if (options.search) params.set("search", options.search);
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
): Promise<WorkforceMember[]> {
  return fetchWorkforceRaw(tenantId, { search });
}

export async function getAllTenantsWorkforce(search?: string): Promise<WorkforceMember[]> {
  return fetchWorkforceRaw(null, { allTenants: true, search });
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
): Promise<ListPage<Payroll>> {
  return fetchTenantListPage(PAYROLL_PATH, tenantId, cursor, limit);
}

export async function getPayrollGroupsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<PayrollGroup>> {
  return fetchTenantListPage(PAYROLL_GROUPS_PATH, tenantId, cursor, limit);
}

export async function getPayComponentsPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<PayComponent>> {
  return fetchTenantListPage(PAY_COMPONENTS_PATH, tenantId, cursor, limit);
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

export async function getPayrollGroups(tenantId: string): Promise<PayrollGroup[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchPayrollGroupsRaw(tenantId, cursor, limit),
  );
}

export async function createPayrollGroup(
  tenantId: string,
  dto: CreatePayrollGroupRequest,
): Promise<PayrollGroup> {
  const res = await apiFetch(withTenantQuery(PAYROLL_GROUPS_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create payroll group");
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
