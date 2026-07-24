import { Injectable, NotFoundException } from '@nestjs/common';
import type { AccountTransaction, PaymentRecord } from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { CacheService } from '../../common/cache/cache.service';
import { buildCompositeCursorQuery } from '../../common/utils/pagination';
import {
  listPageFilterKey,
  withListPageCache,
} from '../../common/utils/listPageCache';
import { toIso, toNumber } from '../../common/utils/serializers';
import {
  relationStringOr,
  tokenizedSearchWhere,
} from '../../common/utils/listSearch';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly cache: CacheService,
  ) {}

  async listPayments(filters: {
    accountId?: string;
    cursor?: string;
    limit?: number;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<PaymentRecord[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const filterKey = listPageFilterKey({
      accountId: filters.accountId,
      from: filters.from,
      to: filters.to,
      search: filters.search,
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
    });
    return withListPageCache(
      this.cache,
      tenantId,
      'payments',
      filterKey,
      () => this.listPaymentsUncached(filters, tenantId),
    );
  }

  private async listPaymentsUncached(
    filters: {
      accountId?: string;
      cursor?: string;
      limit?: number;
      from?: string;
      to?: string;
      search?: string;
    },
    tenantId: string,
  ): Promise<PaymentRecord[]> {
    const pagination = buildCompositeCursorQuery({
      sortField: 'createdAt',
      sortDir: 'desc',
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: 'date',
    });
    const rows = await this.tenantDb.db.payment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
        ...(tokenizedSearchWhere(filters.search, (_token, contains) => [
          { paymentRefNo: contains },
          { note: contains },
          { method: contains },
          { paymentFor: contains },
          { createdByName: contains },
          relationStringOr('account', 'name', contains),
          relationStringOr('sale', 'reference', contains),
        ]) ?? {}),
        ...(pagination.where ?? {}),
      },
      include: {
        account: { select: { name: true } },
        sale: { select: { reference: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: pagination.take,
    });

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      amount: toNumber(row.amount),
      currency: row.currency,
      method: row.method,
      paymentRefNo: row.paymentRefNo,
      paidOn: row.paidOn ? toIso(row.paidOn) : null,
      paymentFor: row.paymentFor,
      accountId: row.accountId,
      accountName: row.account?.name ?? null,
      saleId: row.saleId,
      saleReference: row.sale?.reference ?? null,
      isReturn: row.isReturn,
      note: row.note,
      createdByName: row.createdByName,
      createdAt: toIso(row.createdAt),
    }));
  }

  async listAccountBook(
    accountId: string,
    filters: {
      cursor?: string;
      limit?: number;
      from?: string;
      to?: string;
      search?: string;
      type?: string;
    } = {},
  ): Promise<AccountTransaction[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const filterKey = listPageFilterKey({
      accountId,
      from: filters.from,
      to: filters.to,
      search: filters.search,
      type: filters.type,
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
    });
    return withListPageCache(
      this.cache,
      tenantId,
      'payment-account-book',
      filterKey,
      () => this.listAccountBookUncached(accountId, filters, tenantId),
    );
  }

  private async listAccountBookUncached(
    accountId: string,
    filters: {
      cursor?: string;
      limit?: number;
      from?: string;
      to?: string;
      search?: string;
      type?: string;
    },
    tenantId: string,
  ): Promise<AccountTransaction[]> {
    const account = await this.tenantDb.db.paymentAccount.findFirst({
      where: { id: accountId, tenantId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Payment account not found');

    const limit = filters.limit ?? 10;
    const pagination = buildCompositeCursorQuery({
      sortField: 'operationDate',
      sortDir: 'desc',
      cursor: filters.cursor,
      limit,
      sortValueType: 'date',
    });

    const rows = await this.tenantDb.db.accountTransaction.findMany({
      where: {
        accountId,
        tenantId,
        deletedAt: null,
        ...(filters.type
          ? { type: filters.type as 'debit' | 'credit' }
          : {}),
        ...(filters.from || filters.to
          ? {
              operationDate: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
        ...(tokenizedSearchWhere(filters.search, (_token, contains) => [
          { note: contains },
          { refNo: contains },
          { paymentMethod: contains },
        ]) ?? {}),
        ...(pagination.where ?? {}),
      },
      orderBy: [{ operationDate: 'desc' }, { id: 'desc' }],
      take: pagination.take,
    });

    if (rows.length === 0) return [];

    const oldest = rows[rows.length - 1]!;
    const priorRows = await this.tenantDb.db.$queryRaw<
      Array<{ balance: unknown }>
    >`
      SELECT COALESCE(SUM(
        CASE WHEN type = 'credit' THEN amount ELSE -amount END
      ), 0) AS balance
      FROM "AccountTransaction"
      WHERE "accountId" = ${accountId}
        AND "tenantId" = ${tenantId}
        AND "deletedAt" IS NULL
        AND (
          "operationDate" < ${oldest.operationDate}
          OR ("operationDate" = ${oldest.operationDate} AND id < ${oldest.id})
        )
    `;
    let running = toNumber(priorRows[0]?.balance ?? 0);

    const chronological = [...rows].reverse();
    const balances = new Map<string, number>();
    for (const row of chronological) {
      const amount = toNumber(row.amount);
      running = row.type === 'credit' ? running + amount : running - amount;
      balances.set(row.id, running);
    }

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      accountId: row.accountId,
      accountName: account.name,
      type: row.type,
      subType: row.subType,
      amount: toNumber(row.amount),
      refNo: row.refNo,
      operationDate: toIso(row.operationDate),
      note: row.note,
      paymentMethod: row.paymentMethod,
      paymentDetails: row.paymentDetails,
      saleId: row.saleId,
      paymentId: row.paymentId,
      createdByName: row.createdByName,
      createdAt: toIso(row.createdAt),
      ...(balances.has(row.id) ? { accountBalance: balances.get(row.id) } : {}),
    }));
  }
}
