import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Expense,
  ExpenseCategory,
  CreateExpenseRequest,
  CreateExpenseCategoryRequest,
  UpdateExpenseRequest,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { buildCursorQuery } from '../../common/utils/pagination';
import { toIso, toNumber } from '../../common/utils/serializers';

@Injectable()
export class ExpensesService {
  constructor(private readonly tenantDb: TenantDbService) {}

  async listExpenses(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
    from?: string;
    to?: string;
  } = {}): Promise<Expense[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const dateFilter =
      filters.from || filters.to
        ? {
            expenseDate: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {};
    const rows = await this.tenantDb.db.expense.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...dateFilter,
        ...(filters.search
          ? {
              OR: [
                { refNo: { contains: filters.search, mode: 'insensitive' } },
                {
                  contactName: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
                { note: { contains: filters.search, mode: 'insensitive' } },
                {
                  category: {
                    name: { contains: filters.search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: { category: true },
      orderBy: { expenseDate: 'desc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 25),
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
    return rows.map((row) =>
      this.serializeExpense(row, userNames.get(row.createdById ?? '') ?? null),
    );
  }

  async createExpense(dto: CreateExpenseRequest): Promise<Expense> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.expense.create({
      data: {
        tenantId,
        categoryId: dto.categoryId ?? null,
        refNo: dto.refNo ?? null,
        subCategory: dto.subCategory ?? null,
        locationCode: dto.locationCode ?? null,
        expenseFor: dto.expenseFor ?? null,
        contactName: dto.contactName ?? null,
        totalAmount: dto.totalAmount,
        taxAmount: dto.taxAmount ?? 0,
        paymentStatus: dto.paymentStatus ?? 'due',
        paymentDue: dto.totalAmount,
        note: dto.note ?? null,
        isRecurring: dto.isRecurring ?? false,
        recurInterval: dto.recurInterval ?? null,
        recurIntervalType: dto.recurIntervalType ?? null,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        createdById: this.tenantDb.getAuthUserId(),
      },
      include: { category: true },
    });
    return this.serializeExpense(row);
  }

  async getExpenseById(id: string): Promise<Expense> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.expense.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { category: true },
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

    const nextTotal =
      dto.totalAmount !== undefined
        ? dto.totalAmount
        : toNumber(existing.totalAmount);
    const paymentStatus = dto.paymentStatus ?? existing.paymentStatus;
    const paymentDue =
      dto.paymentDue !== undefined
        ? dto.paymentDue
        : paymentStatus === 'due' && dto.totalAmount !== undefined
          ? nextTotal
          : toNumber(existing.paymentDue);

    const row = await this.tenantDb.db.expense.update({
      where: { id },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.refNo !== undefined ? { refNo: dto.refNo } : {}),
        ...(dto.subCategory !== undefined ? { subCategory: dto.subCategory } : {}),
        ...(dto.locationCode !== undefined ? { locationCode: dto.locationCode } : {}),
        ...(dto.expenseFor !== undefined ? { expenseFor: dto.expenseFor } : {}),
        ...(dto.contactName !== undefined ? { contactName: dto.contactName } : {}),
        ...(dto.totalAmount !== undefined ? { totalAmount: dto.totalAmount } : {}),
        ...(dto.taxAmount !== undefined ? { taxAmount: dto.taxAmount } : {}),
        ...(dto.paymentStatus !== undefined
          ? { paymentStatus: dto.paymentStatus }
          : {}),
        paymentDue,
        ...(dto.note !== undefined ? { note: dto.note } : {}),
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
      include: { category: true },
    });

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

  async deleteExpense(id: string): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.expense.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Expense not found');
    await this.tenantDb.db.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listCategories(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
  } = {}): Promise<ExpenseCategory[]> {
    const rows = await this.tenantDb.db.expenseCategory.findMany({
      where: {
        tenantId: this.tenantDb.requireTenantId(),
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 25),
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
    row: {
      id: string;
      tenantId: string;
      refNo: string | null;
      categoryId: string | null;
      subCategory: string | null;
      locationCode: string | null;
      expenseFor: string | null;
      contactName: string | null;
      totalAmount: import('@prisma/client').Prisma.Decimal;
      taxAmount: import('@prisma/client').Prisma.Decimal;
      paymentStatus: string;
      paymentDue: import('@prisma/client').Prisma.Decimal;
      note: string | null;
      isRecurring: boolean;
      recurInterval: number | null;
      recurIntervalType: string | null;
      expenseDate: Date;
      createdById: string | null;
      createdAt: Date;
      updatedAt: Date;
      category?: { name: string } | null;
    },
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
      expenseFor: row.expenseFor,
      contactName: row.contactName,
      totalAmount: toNumber(row.totalAmount),
      taxAmount: toNumber(row.taxAmount),
      paymentStatus: row.paymentStatus,
      paymentDue: toNumber(row.paymentDue),
      note: row.note,
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
