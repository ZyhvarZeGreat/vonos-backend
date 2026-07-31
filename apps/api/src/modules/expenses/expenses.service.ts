import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Expense,
  ExpenseCategory,
  CreateExpenseRequest,
  CreateExpenseCategoryRequest,
  UpdateExpenseRequest,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { CacheService } from '../../common/cache/cache.service';
import { invalidateTenantDashboardCache } from '../../common/cache/cacheInvalidation';
import { applyDailyFinanceDelta } from '../../common/utils/dailyFinanceRollup';
import {
  listPageFilterKey,
  withListPageCache,
} from '../../common/utils/listPageCache';
import { buildCompositeCursorQuery } from '../../common/utils/pagination';
import type { PaginatedList } from '../../common/utils/paginatedList';
import { toIso, toNumber } from '../../common/utils/serializers';
import { InvoiceHubService } from '../invoices/invoice-hub.service';
import {
  relationStringOr,
  tokenizedSearchWhere,
} from '../../common/utils/listSearch';
import {
  softDeleteExpenseAccountTxns,
  syncExpenseAccountDebit,
} from '../../common/utils/recordPaymentAccountTxn';

type ExpenseRow = {
  id: string;
  tenantId: string;
  refNo: string | null;
  categoryId: string | null;
  subCategory: string | null;
  locationCode: string | null;
  expenseForCustomerId: string | null;
  expenseFor: string | null;
  contactCustomerId: string | null;
  contactName: string | null;
  totalAmount: import('@prisma/client').Prisma.Decimal;
  taxAmount: import('@prisma/client').Prisma.Decimal;
  paymentStatus: string;
  paymentDue: import('@prisma/client').Prisma.Decimal;
  note: string | null;
  accountId: string | null;
  isRecurring: boolean;
  recurInterval: number | null;
  recurIntervalType: string | null;
  expenseDate: Date;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { name: string } | null;
  expenseForCustomer?: { name: string } | null;
  contactCustomer?: { name: string } | null;
  account?: { name: string } | null;
};

const expenseInclude = {
  category: { select: { id: true, name: true } },
  expenseForCustomer: { select: { name: true } },
  contactCustomer: { select: { name: true } },
  account: { select: { name: true } },
} as const;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly invoiceHub: InvoiceHubService,
    private readonly cache: CacheService,
  ) {}

  async listExpenses(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
    from?: string;
    to?: string;
    locationCode?: string;
    expenseForCustomerId?: string;
    contactCustomerId?: string;
    createdById?: string;
    categoryId?: string;
    paymentStatus?: string;
    includeSummary?: boolean;
  } = {}): Promise<PaginatedList<Expense>> {
    const tenantId = this.tenantDb.requireTenantId();
    const filterKey = listPageFilterKey({
      search: filters.search,
      from: filters.from,
      to: filters.to,
      locationCode: filters.locationCode,
      expenseForCustomerId: filters.expenseForCustomerId,
      contactCustomerId: filters.contactCustomerId,
      createdById: filters.createdById,
      categoryId: filters.categoryId,
      paymentStatus: filters.paymentStatus,
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sum: filters.includeSummary === false ? 0 : 1,
    });

    return withListPageCache(
      this.cache,
      tenantId,
      'expenses',
      filterKey,
      () => this.listExpensesUncached(filters, tenantId),
    );
  }

  private async listExpensesUncached(
    filters: {
      cursor?: string;
      limit?: number;
      search?: string;
      from?: string;
      to?: string;
      locationCode?: string;
      expenseForCustomerId?: string;
      contactCustomerId?: string;
      createdById?: string;
      categoryId?: string;
      paymentStatus?: string;
      includeSummary?: boolean;
    },
    tenantId: string,
  ): Promise<PaginatedList<Expense>> {
    const dateFilter =
      filters.from || filters.to
        ? {
            expenseDate: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {};
    const pagination = buildCompositeCursorQuery({
      sortField: 'expenseDate',
      sortDir: 'desc',
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: 'date',
    });
    const baseWhere = {
      tenantId,
      deletedAt: null as null,
      ...dateFilter,
      ...(filters.locationCode
        ? { locationCode: filters.locationCode }
        : {}),
      ...(filters.expenseForCustomerId
        ? { expenseForCustomerId: filters.expenseForCustomerId }
        : {}),
      ...(filters.contactCustomerId
        ? { contactCustomerId: filters.contactCustomerId }
        : {}),
      ...(filters.createdById ? { createdById: filters.createdById } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.paymentStatus
        ? { paymentStatus: filters.paymentStatus }
        : {}),
      ...(tokenizedSearchWhere(filters.search, (_token, contains) => [
        { refNo: contains },
        { contactName: contains },
        { note: contains },
        { expenseFor: contains },
        { subCategory: contains },
        { locationCode: contains },
        { paymentStatus: contains },
        relationStringOr('category', 'name', contains),
        relationStringOr('expenseForCustomer', 'name', contains),
        relationStringOr('contactCustomer', 'name', contains),
      ]) ?? {}),
    };
    const rows = await this.tenantDb.db.expense.findMany({
      where: {
        ...baseWhere,
        ...(pagination.where ?? {}),
      },
      include: expenseInclude,
      orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
      take: pagination.take,
    });

    const userIds = [
      ...new Set(rows.map((r) => r.createdById).filter((id): id is string => Boolean(id))),
    ];
    const users =
      userIds.length > 0
        ? await this.tenantDb.db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [];
    const userNames = new Map(users.map((u) => [u.id, u.name]));
    const items = rows.map((row) =>
      this.serializeExpense(row, userNames.get(row.createdById ?? '') ?? null),
    );

    if (filters.includeSummary === false) {
      return { items };
    }

    const [totalCount, amountAgg] = await Promise.all([
      this.tenantDb.db.expense.count({ where: baseWhere }),
      this.tenantDb.db.expense.aggregate({
        where: baseWhere,
        _sum: { totalAmount: true, paymentDue: true },
      }),
    ]);

    return {
      items,
      totalCount,
      amountSummary: {
        totalAmount: toNumber(amountAgg._sum.totalAmount),
        totalDue: toNumber(amountAgg._sum.paymentDue),
        currency: 'NGN',
      },
    };
  }

  async createExpense(dto: CreateExpenseRequest): Promise<Expense> {
    const tenantId = this.tenantDb.requireTenantId();
    const paymentStatus = dto.paymentStatus ?? 'due';
    const accountId = dto.accountId?.trim() || null;
    const shouldDebit =
      Boolean(accountId) &&
      paymentStatus !== 'due' &&
      Number(dto.totalAmount) > 0;

    const row = await this.tenantDb.db.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          tenantId,
          categoryId: dto.categoryId ?? null,
          refNo: dto.refNo ?? null,
          subCategory: dto.subCategory ?? null,
          locationCode: dto.locationCode ?? null,
          expenseForCustomerId: dto.expenseForCustomerId ?? null,
          contactCustomerId: dto.contactCustomerId ?? null,
          expenseFor: dto.expenseFor ?? null,
          contactName: dto.contactName ?? null,
          totalAmount: dto.totalAmount,
          taxAmount: dto.taxAmount ?? 0,
          paymentStatus,
          paymentDue:
            paymentStatus === 'paid' ? 0 : dto.totalAmount,
          note: dto.note ?? null,
          accountId,
          isRecurring: dto.isRecurring ?? false,
          recurInterval: dto.recurInterval ?? null,
          recurIntervalType: dto.recurIntervalType ?? null,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          createdById: this.tenantDb.getAuthUserId(),
        },
        include: expenseInclude,
      });

      if (shouldDebit && accountId) {
        await syncExpenseAccountDebit(tx, {
          tenantId,
          expenseId: created.id,
          accountId,
          amount: dto.totalAmount,
          operationDate: created.expenseDate,
          refNo: created.refNo,
          note: dto.note ?? `Expense — ${created.refNo ?? created.id}`,
          paymentMethod: dto.paymentMethod ?? null,
        });
      }

      return created;
    });
    // Defer invoice + rollup so concurrent creates aren't serialized on extra
    // round-trips (bench: 15 writers were ~22s with awaited invoice hub).
    void this.invoiceHub
      .ensureExpenseInvoice(this.tenantDb.db, row)
      .catch((err: unknown) => {
        console.error('[expenses] ensureExpenseInvoice failed', err);
      });
    void applyDailyFinanceDelta(
      this.tenantDb.db,
      tenantId,
      row.expenseDate,
      'expense',
      toNumber(row.totalAmount),
    ).catch((err: unknown) => {
      console.error('[expenses] daily finance rollup failed', err);
    });
    this.invalidateCaches();
    return this.serializeExpense(row);
  }

  private invalidateCaches(): void {
    void invalidateTenantDashboardCache(
      this.cache,
      this.tenantDb.requireTenantId(),
    );
  }

  async getExpenseById(id: string): Promise<Expense> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.expense.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: expenseInclude,
    });
    if (!row) throw new NotFoundException('Expense not found');

    let createdByName: string | null = null;
    if (row.createdById) {
      const user = await this.tenantDb.db.user.findFirst({
        where: { id: row.createdById },
        select: { name: true },
      });
      createdByName = user?.name ?? null;
    }
    return this.serializeExpense(row, createdByName);
  }

  async updateExpense(id: string, dto: UpdateExpenseRequest): Promise<Expense> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.expense.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Expense not found');

    const updatedTotal =
      dto.totalAmount !== undefined
        ? dto.totalAmount
        : toNumber(existing.totalAmount);
    const paymentStatus = dto.paymentStatus ?? existing.paymentStatus;
    const paymentDue =
      dto.paymentDue !== undefined
        ? dto.paymentDue
        : paymentStatus === 'paid'
          ? 0
          : paymentStatus === 'due' && dto.totalAmount !== undefined
            ? updatedTotal
            : toNumber(existing.paymentDue);
    const accountId =
      dto.accountId !== undefined
        ? dto.accountId || null
        : existing.accountId;

    const prevTotal = toNumber(existing.totalAmount);
    const prevDate = existing.expenseDate;

    const row = await this.tenantDb.db.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.refNo !== undefined ? { refNo: dto.refNo } : {}),
          ...(dto.subCategory !== undefined ? { subCategory: dto.subCategory } : {}),
          ...(dto.locationCode !== undefined ? { locationCode: dto.locationCode } : {}),
          ...(dto.expenseForCustomerId !== undefined
            ? { expenseForCustomerId: dto.expenseForCustomerId }
            : {}),
          ...(dto.contactCustomerId !== undefined
            ? { contactCustomerId: dto.contactCustomerId }
            : {}),
          ...(dto.expenseFor !== undefined ? { expenseFor: dto.expenseFor } : {}),
          ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
          ...(dto.totalAmount !== undefined ? { totalAmount: dto.totalAmount } : {}),
          ...(dto.taxAmount !== undefined ? { taxAmount: dto.taxAmount } : {}),
          ...(dto.paymentStatus !== undefined
            ? { paymentStatus: dto.paymentStatus }
            : {}),
          paymentDue,
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          ...(dto.accountId !== undefined
            ? { accountId: dto.accountId || null }
            : {}),
          ...(dto.isRecurring !== undefined ? { isRecurring: dto.isRecurring } : {}),
          ...(dto.recurInterval !== undefined
            ? { recurInterval: dto.recurInterval }
            : {}),
          ...(dto.recurIntervalType !== undefined
            ? { recurIntervalType: dto.recurIntervalType }
            : {}),
          ...(dto.expenseDate !== undefined
            ? { expenseDate: new Date(dto.expenseDate) }
            : {}),
        },
        include: expenseInclude,
      });

      const shouldDebit =
        Boolean(accountId) &&
        paymentStatus !== 'due' &&
        updatedTotal > 0;
      await syncExpenseAccountDebit(tx, {
        tenantId,
        expenseId: updated.id,
        accountId: shouldDebit ? accountId : null,
        amount: updatedTotal,
        operationDate: updated.expenseDate,
        refNo: updated.refNo,
        note: updated.note ?? `Expense — ${updated.refNo ?? updated.id}`,
        paymentMethod: dto.paymentMethod ?? null,
      });

      return updated;
    });

    let createdByName: string | null = null;
    if (row.createdById) {
      const user = await this.tenantDb.db.user.findFirst({
        where: { id: row.createdById },
        select: { name: true },
      });
      createdByName = user?.name ?? null;
    }
    const nextTotal = toNumber(row.totalAmount);
    const amountDelta = nextTotal - prevTotal;
    if (amountDelta !== 0) {
      void applyDailyFinanceDelta(
        this.tenantDb.db,
        tenantId,
        row.expenseDate,
        'expense',
        amountDelta,
      );
    } else if (row.expenseDate.getTime() !== prevDate.getTime()) {
      void applyDailyFinanceDelta(
        this.tenantDb.db,
        tenantId,
        prevDate,
        'expense',
        -prevTotal,
      );
      void applyDailyFinanceDelta(
        this.tenantDb.db,
        tenantId,
        row.expenseDate,
        'expense',
        nextTotal,
      );
    }
    this.invalidateCaches();
    return this.serializeExpense(row, createdByName);
  }

  async deleteExpense(id: string): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.expense.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Expense not found');
    await this.tenantDb.db.$transaction(async (tx) => {
      await softDeleteExpenseAccountTxns(tx, { tenantId, expenseId: id });
      await tx.expense.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
    void applyDailyFinanceDelta(
      this.tenantDb.db,
      tenantId,
      existing.expenseDate,
      'expense',
      -toNumber(existing.totalAmount),
    );
    this.invalidateCaches();
  }

  async listCategories(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
  } = {}): Promise<ExpenseCategory[]> {
    const pagination = buildCompositeCursorQuery({
      sortField: 'name',
      sortDir: 'asc',
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: 'string',
    });
    const rows = await this.tenantDb.db.expenseCategory.findMany({
      where: {
        tenantId: this.tenantDb.requireTenantId(),
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
        ...(pagination.where ?? {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: pagination.take,
    });
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      code: row.code,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
  }

  async createCategory(
    dto: CreateExpenseCategoryRequest,
  ): Promise<ExpenseCategory> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.expenseCategory.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code ?? null,
      },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      code: row.code,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  async updateCategory(
    id: string,
    dto: { name?: string; code?: string },
  ): Promise<ExpenseCategory> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.expenseCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Expense category not found');
    const row = await this.tenantDb.db.expenseCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
      },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      code: row.code,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  async deleteCategory(id: string): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.expenseCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Expense category not found');
    await this.tenantDb.db.expenseCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private serializeExpense(
    row: ExpenseRow,
    createdByName: string | null = null,
  ): Expense {
    return {
      id: row.id,
      tenantId: row.tenantId,
      refNo: row.refNo,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      subCategory: row.subCategory,
      locationCode: row.locationCode,
      expenseForCustomerId: row.expenseForCustomerId,
      expenseFor:
        row.expenseForCustomer?.name ?? row.expenseFor ?? null,
      contactCustomerId: row.contactCustomerId,
      contactName: row.contactCustomer?.name ?? row.contactName ?? null,
      totalAmount: toNumber(row.totalAmount),
      taxAmount: toNumber(row.taxAmount),
      paymentStatus: row.paymentStatus,
      paymentDue: toNumber(row.paymentDue),
      note: row.note,
      accountId: row.accountId,
      accountName: row.account?.name ?? null,
      isRecurring: row.isRecurring,
      recurInterval: row.recurInterval,
      recurIntervalType: row.recurIntervalType,
      expenseDate: toIso(row.expenseDate),
      createdById: row.createdById,
      createdByName,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }
}
