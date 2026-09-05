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
  fetchListPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { createAccumulatingPicker } from "@/lib/api/accumulatingPicker";
import { appendListQuery, fetchTenantListPage } from "@/lib/api/listPageHelpers";
import { nameListCursor } from "@/lib/utils/pagination";

const EXPENSES_PATH = "/expenses";
const CATEGORIES_PATH = "/expenses/categories";

/** Same chunk size as sale-form pickers feel: first 25, then +25 on scroll. */
const EXPENSE_CATEGORY_PICKER_BATCH = 25;

type ExpenseCategoryPicker = ReturnType<
  typeof createAccumulatingPicker<ExpenseCategory>
>;
const expenseCategoryPickers = new Map<string, ExpenseCategoryPicker>();

function expenseCategoryPickerFor(tenantId: string): ExpenseCategoryPicker {
  let picker = expenseCategoryPickers.get(tenantId);
  if (!picker) {
    picker = createAccumulatingPicker<ExpenseCategory>({
      batchSize: EXPENSE_CATEGORY_PICKER_BATCH,
      getCursor: (row) => nameListCursor(row),
      searchKeys: ["name", "code"],
      fetchPage: (cursor, limit, search) =>
        fetchListPage(
          (pageCursor, pageLimit) =>
            fetchExpenseCategoriesRaw(
              tenantId,
              pageCursor,
              pageLimit,
              search,
            ),
          cursor,
          limit,
        ),
    });
    expenseCategoryPickers.set(tenantId, picker);
  }
  return picker;
}

export function clearExpenseCategoryOptionCache(): void {
  expenseCategoryPickers.clear();
}

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
  | "includeSummary"
>;

async function fetchExpensesRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
  extra?: ExpenseListFilters,
): Promise<Expense[] | { items: Expense[]; totalCount?: number }> {
  const tenantPath = withTenantQuery(EXPENSES_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    cursor,
    limit,
    includeSummary: extra?.includeSummary ?? false,
    ...extra,
  });
  const res = await apiFetch(url);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

async function fetchExpenseCategoriesRaw(
  tenantId: string,
  cursor?: string,
  limit?: number,
  search?: string,
): Promise<ExpenseCategory[]> {
  const tenantPath = withTenantQuery(CATEGORIES_PATH, tenantId);
  const url = appendListQuery(tenantPath, {
    cursor,
    limit,
    search: search?.trim() || undefined,
  });
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
  return fetchTenantListPage(EXPENSES_PATH, tenantId, cursor, limit, {
    ...extra,
    includeSummary: extra?.includeSummary ?? false,
  });
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

/** Incremental payment toward remaining expense due (Add Payment modal). */
export async function payExpense(
  tenantId: string,
  id: string,
  input: {
    amount: number;
    method?: string;
    accountId?: string;
    note?: string;
    paidOn?: string;
  },
): Promise<{
  expenseId: string;
  amountApplied: number;
  currency: string;
  remainingDue: number;
  paymentStatus: string;
}> {
  const res = await apiFetch(
    withTenantQuery(`${EXPENSES_PATH}/${id}/pay`, tenantId),
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Failed to record expense payment");
  }
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
  opts?: { includeSummary?: boolean },
): Promise<ListPage<ExpenseCategory>> {
  return fetchTenantListPage(CATEGORIES_PATH, tenantId, cursor, limit, {
    includeSummary: opts?.includeSummary ?? false,
  });
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
    (row) => nameListCursor(row),
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

export async function createExpenseCategory(
  tenantId: string,
  dto: CreateExpenseCategoryRequest,
): Promise<ExpenseCategory> {
  const res = await apiFetch(
    withTenantQuery(CATEGORIES_PATH, tenantId),
    { method: "POST", body: JSON.stringify(dto) },
  );
  if (!res.ok) throw new Error("Failed to create expense category");
  clearExpenseCategoryOptionCache();
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
  clearExpenseCategoryOptionCache();
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
  clearExpenseCategoryOptionCache();
}

/**
 * Expense-category picker — same pattern as sale-form customer/supplier:
 * first 25 on open, scroll for +25, type searches loaded rows then API.
 */
export async function getExpenseCategoriesForPicker(
  tenantId: string,
  search?: string,
): Promise<ExpenseCategory[]> {
  const page = await expenseCategoryPickerFor(tenantId).load(tenantId, search);
  return page.items;
}

/** Next batch while scrolling the category dropdown. */
export async function loadMoreExpenseCategoriesForPicker(
  tenantId: string,
): Promise<{ items: ExpenseCategory[]; appended: ExpenseCategory[]; hasMore: boolean }> {
  return expenseCategoryPickerFor(tenantId).loadMore(tenantId);
}

export function expenseCategoriesPickerHasMore(tenantId: string): boolean {
  return expenseCategoryPickerFor(tenantId).hasMore(tenantId);
}

/** Prefetch first 25 so the form opens with options ready. */
export async function prefetchExpenseCategoriesForPicker(
  tenantId: string,
): Promise<ExpenseCategory[]> {
  const page = await expenseCategoryPickerFor(tenantId).ensureFirst(tenantId);
  return page.items;
}

/**
 * @deprecated Prefer getExpenseCategoriesForPicker + loadMore for dropdowns.
 * Kept for call sites that only need the current loaded/search window.
 */
export async function getExpenseCategories(
  tenantId: string,
  search?: string,
): Promise<ExpenseCategory[]> {
  return getExpenseCategoriesForPicker(tenantId, search);
}
