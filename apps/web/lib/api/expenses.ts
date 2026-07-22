import type {
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  CreateExpenseRequest,
  CreateExpenseCategoryRequest,
  UpdateExpenseCategoryRequest,
  UpdateExpenseRequest,
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

const EXPENSES_PATH = "/expenses";
const CATEGORIES_PATH = "/expenses/categories";

export type ExpenseListFilters = Pick<
  ExpenseFilters,
  | "from"
  | "to"
  | "search"
  | "locationCode"
  | "expenseForCustomerId"
  | "contactCustomerId"
  | "createdById"
  | "categoryId"
  | "paymentStatus"
>;

async function fetchExpensesRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
  extra?: ExpenseListFilters,
): Promise<Expense[] | { items: Expense[]; totalCount?: number }> {
  const tenantPath = withTenantQuery(EXPENSES_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit, ...extra });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

async function fetchExpenseCategoriesRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
): Promise<ExpenseCategory[]> {
  const tenantPath = withTenantQuery(CATEGORIES_PATH, tenantId);
  const url = appendListQuery(tenantPath, { cursor, limit });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch expense categories");
  return res.json();
}

export async function getExpensesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
  extra?: ExpenseListFilters,
): Promise<ListPage<Expense>> {
  return fetchTenantListPage(EXPENSES_PATH, tenantId, cursor, limit, extra);
}

export async function getExpense(
  tenantId: string,
  id: string,
): Promise<Expense> {
  const res = await apiFetch(withTenantQuery(`${EXPENSES_PATH}/${id}`, tenantId));
  if (!res.ok) throw new Error("Failed to fetch expense");
  return res.json();
}

export async function updateExpense(
  tenantId: string,
  id: string,
  dto: UpdateExpenseRequest,
): Promise<Expense> {
  const res = await apiFetch(withTenantQuery(`${EXPENSES_PATH}/${id}`, tenantId), {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to update expense");
  return res.json();
}

export async function deleteExpense(tenantId: string, id: string): Promise<void> {
  const res = await apiFetch(withTenantQuery(`${EXPENSES_PATH}/${id}`, tenantId), {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete expense");
}

export async function getExpenseCategoriesPage(
  tenantId: string,
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<ExpenseCategory>> {
  return fetchTenantListPage(CATEGORIES_PATH, tenantId, cursor, limit);
}

/** Full expense list for export — not for table rendering. */
export async function getAllExpenses(
  tenantId: string,
  extra?: ExpenseListFilters,
): Promise<Expense[]> {
  return fetchAllPages(
    (cursor, limit) => fetchExpensesRaw(tenantId, cursor, limit, extra),
    EXPORT_PAGE_SIZE,
  );
}

/** Full expense category list for export — not for table rendering. */
export async function getAllExpenseCategories(
  tenantId: string,
): Promise<ExpenseCategory[]> {
  return fetchAllPages(
    (cursor, limit) => fetchExpenseCategoriesRaw(tenantId, cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getExpenses(tenantId: string): Promise<Expense[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchExpensesRaw(tenantId, cursor, limit),
  );
}

export async function createExpense(
  tenantId: string,
  dto: CreateExpenseRequest,
): Promise<Expense> {
  const res = await apiFetch(withTenantQuery(EXPENSES_PATH, tenantId), {
    method: "POST",
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error("Failed to create expense");
  return res.json();
}

export async function getExpenseCategories(
  tenantId: string,
): Promise<ExpenseCategory[]> {
  return fetchFirstPage((cursor, limit) =>
    fetchExpenseCategoriesRaw(tenantId, cursor, limit),
  );
}

export async function createExpenseCategory(
  tenantId: string,
  dto: CreateExpenseCategoryRequest,
): Promise<ExpenseCategory> {
  const res = await apiFetch(
    withTenantQuery(CATEGORIES_PATH, tenantId),
    { method: "POST", body: JSON.stringify(dto) },
  );
  if (!res.ok) throw new Error("Failed to create expense category");
  return res.json();
}

export async function updateExpenseCategory(
  tenantId: string,
  id: string,
  dto: UpdateExpenseCategoryRequest,
): Promise<ExpenseCategory> {
  const res = await apiFetch(
    withTenantQuery(`/expenses/categories/${id}`, tenantId),
    { method: "PATCH", body: JSON.stringify(dto) },
  );
  if (!res.ok) throw new Error("Failed to update expense category");
  return res.json();
}

export async function deleteExpenseCategory(
  tenantId: string,
  id: string,
): Promise<void> {
  const res = await apiFetch(
    withTenantQuery(`/expenses/categories/${id}`, tenantId),
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete expense category");
}
