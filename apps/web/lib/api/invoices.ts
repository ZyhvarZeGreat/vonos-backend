import type { InvoiceDetail, InvoiceKind, InvoiceListRow } from "@vonos/types";
import { apiFetch, withTenantQuery } from "@/lib/api/client";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";

export interface InvoiceFilters {
  kind?: InvoiceKind;
  paymentStatus?: string;
  from?: string;
  to?: string;
  search?: string;
  customerId?: string;
  supplierId?: string;
  employeeRecordId?: string;
  saleId?: string;
  stockMovementId?: string;
  expenseId?: string;
  payrollId?: string;
  payrollGroupId?: string;
  jobId?: string;
}

async function fetchInvoicesRaw(
  tenantId: string,
  filters: InvoiceFilters | undefined,
  cursor?: string,
  limit?: number,
): Promise<InvoiceListRow[]> {
  const params = new URLSearchParams();
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.customerId) params.set("customerId", filters.customerId);
  if (filters?.supplierId) params.set("supplierId", filters.supplierId);
  if (filters?.employeeRecordId) {
    params.set("employeeRecordId", filters.employeeRecordId);
  }
  if (filters?.saleId) params.set("saleId", filters.saleId);
  if (filters?.stockMovementId) {
    params.set("stockMovementId", filters.stockMovementId);
  }
  if (filters?.expenseId) params.set("expenseId", filters.expenseId);
  if (filters?.payrollId) params.set("payrollId", filters.payrollId);
  if (filters?.payrollGroupId) {
    params.set("payrollGroupId", filters.payrollGroupId);
  }
  if (filters?.jobId) params.set("jobId", filters.jobId);
  if (cursor) params.set("cursor", cursor);
  if (limit) params.set("limit", String(limit));
  const query = params.toString();
  const path = withTenantQuery(query ? `/invoices?${query}` : "/invoices", tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch invoices");
  return response.json();
}

export async function getInvoicesPage(
  tenantId: string,
  filters: InvoiceFilters | undefined,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<InvoiceListRow>> {
  return fetchListPage(
    (pageCursor, pageLimit) =>
      fetchInvoicesRaw(tenantId, filters, pageCursor, pageLimit),
    cursor,
    limit,
  );
}

export async function getInvoice(
  tenantId: string,
  invoiceId: string,
): Promise<InvoiceDetail> {
  const path = withTenantQuery(`/invoices/${invoiceId}`, tenantId);
  const response = await apiFetch(path);
  if (!response.ok) throw new Error("Failed to fetch invoice");
  return response.json();
}

export async function findInvoiceForPayroll(
  tenantId: string,
  payrollId: string,
): Promise<InvoiceListRow | null> {
  const rows = await fetchInvoicesRaw(tenantId, { payrollId }, undefined, 1);
  return rows[0] ?? null;
}

export async function findInvoiceForPayrollGroup(
  tenantId: string,
  payrollGroupId: string,
): Promise<InvoiceListRow | null> {
  const rows = await fetchInvoicesRaw(
    tenantId,
    { payrollGroupId },
    undefined,
    1,
  );
  return rows[0] ?? null;
}
