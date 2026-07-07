import { Injectable } from '@nestjs/common';
import type {
  LedgerEntry,
  LedgerEntryType,
  LedgerListRow,
  LedgerSummary,
} from '@vonos/types';
import { AUTOS_GROUP_CODES } from '@vonos/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { AuditService } from '../audit/audit.service';
import { buildCursorQuery } from '../../common/utils/pagination';
import {
  buildLedgerSummaryFromGroups,
  ledgerDateFilter,
} from '../../common/utils/ledgerAggregates';
import { computeOutstandingReceivables } from '../../common/utils/outstandingReceivables';
import { computeSalesRevenueTotal } from '../../common/utils/salesRevenue';
import { toIso, toNumber } from '../../common/utils/serializers';
import {
  buildGroupLedgerByEntity,
  buildGroupLedgerCategories,
  buildGroupLedgerList,
  buildGroupLedgerSummary,
} from './groupLedger';
import {
  buildGroupLedgerCharts,
  buildTenantLedgerCharts,
} from './ledgerCharts';
import { CacheService } from '../../common/cache/cache.service';

const LEDGER_CACHE_TTL_S = 300;

@Injectable()
export class LedgerService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  async list(filters: {
    type?: LedgerEntryType;
    category?: string;
    from?: string;
    to?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<LedgerEntry[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const rows = await this.tenantDb.db.ledgerEntry.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.search
          ? {
              OR: [
                {
                  description: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
                {
                  category: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
        ...(filters.from || filters.to
          ? {
              date: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'desc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 50),
    });

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      type: row.type,
      amount: toNumber(row.amount),
      currency: row.currency,
      category: row.category,
      description: row.description,
      linkedRecordType: row.linkedRecordType,
      linkedRecordId: row.linkedRecordId,
      date: toIso(row.date),
      createdAt: toIso(row.createdAt),
    }));
  }

  async summary(from?: string, to?: string): Promise<LedgerSummary> {
    const tenantId = this.tenantDb.requireTenantId();
    const cacheKey = `ledger-summary:${tenantId}:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<LedgerSummary>(cacheKey);
    if (cached) return cached;

    const dateFilter = ledgerDateFilter(from, to);

    const [groups, currencyRow, outstanding] = await Promise.all([
      this.tenantDb.db.ledgerEntry.groupBy({
        by: ['type'],
        where: { tenantId, deletedAt: null, ...dateFilter },
        _sum: { amount: true },
      }),
      this.tenantDb.db.ledgerEntry.findFirst({
        where: { tenantId, deletedAt: null, ...dateFilter },
        select: { currency: true },
        orderBy: { date: 'desc' },
      }),
      computeOutstandingReceivables(this.tenantDb.db, from, to),
    ]);

    const summary = buildLedgerSummaryFromGroups(
      groups.map((group) => ({
        type: group.type,
        _sum: { amount: group._sum.amount },
      })),
      currencyRow?.currency ?? 'NGN',
    );
    summary.outstanding = outstanding;

    if (summary.revenue === 0) {
      const salesRevenue = await computeSalesRevenueTotal(
        this.tenantDb.db,
        from,
        to,
      );
      if (salesRevenue.revenue > 0) {
        summary.revenue = salesRevenue.revenue;
        summary.currency = salesRevenue.currency;
        summary.net = salesRevenue.revenue - summary.costs;
      }
    } else {
      summary.net = summary.revenue - summary.costs;
    }

    await this.cache.set(cacheKey, summary, LEDGER_CACHE_TTL_S);
    return summary;
  }

  async charts(from?: string, to?: string) {
    const tenantId = this.tenantDb.requireTenantId();
    const cacheKey = `ledger-charts:${tenantId}:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<Awaited<ReturnType<typeof buildTenantLedgerCharts>>>(cacheKey);
    if (cached) return cached;

    const result = await buildTenantLedgerCharts(
      this.tenantDb.db,
      tenantId,
      from,
      to,
    );
    await this.cache.set(cacheKey, result, LEDGER_CACHE_TTL_S);
    return result;
  }

  async categories(from?: string, to?: string): Promise<string[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const dateFilter = ledgerDateFilter(from, to);
    const rows = await this.tenantDb.db.ledgerEntry.groupBy({
      by: ['category'],
      where: { tenantId, deletedAt: null, ...dateFilter },
      orderBy: { category: 'asc' },
    });
    return rows.map((row) => row.category);
  }

  async createManual(body: {
    type: 'expense';
    amount: number;
    category: string;
    description: string;
    date?: string;
    currency?: string;
  }): Promise<LedgerEntry> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.ledgerEntry.create({
      data: {
        tenantId,
        type: 'expense',
        amount: body.amount,
        currency: body.currency ?? 'NGN',
        category: body.category,
        description: body.description,
        date: body.date ? new Date(body.date) : new Date(),
      },
    });

    await this.auditService.log({
      action: 'created',
      entityType: 'ledgerEntry',
      entityId: row.id,
      summary: `Manual expense: ${body.description}`,
      metadata: { category: body.category, amount: body.amount },
    });

    return {
      id: row.id,
      tenantId: row.tenantId,
      type: row.type,
      amount: toNumber(row.amount),
      currency: row.currency,
      category: row.category,
      description: row.description,
      linkedRecordType: row.linkedRecordType,
      linkedRecordId: row.linkedRecordId,
      date: toIso(row.date),
      createdAt: toIso(row.createdAt),
    };
  }

  groupList(filters: {
    type?: LedgerEntryType;
    category?: string;
    from?: string;
    to?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }): Promise<LedgerListRow[]> {
    return buildGroupLedgerList(this.prisma, filters);
  }

  groupCategories(from?: string, to?: string): Promise<string[]> {
    return buildGroupLedgerCategories(this.prisma, from, to);
  }

  groupSummary(from?: string, to?: string): Promise<LedgerSummary> {
    return this.cachedGroupSummary(from, to);
  }

  groupByEntity(from?: string, to?: string) {
    return this.cachedGroupByEntity(from, to);
  }

  async groupCharts(from?: string, to?: string) {
    const cacheKey = `ledger-group-charts:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<Awaited<ReturnType<typeof buildGroupLedgerCharts>>>(cacheKey);
    if (cached) return cached;

    const tenants = await this.prisma.tenant.findMany({
      where: {
        code: { in: [...AUTOS_GROUP_CODES] },
        deletedAt: null,
      },
      select: { id: true },
    });
    const result = await buildGroupLedgerCharts(
      this.prisma,
      tenants.map((t) => t.id),
      from,
      to,
    );
    await this.cache.set(cacheKey, result, LEDGER_CACHE_TTL_S);
    return result;
  }

  private async cachedGroupSummary(
    from?: string,
    to?: string,
  ): Promise<LedgerSummary> {
    const cacheKey = `ledger-group-summary:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<LedgerSummary>(cacheKey);
    if (cached) return cached;
    const result = await buildGroupLedgerSummary(this.prisma, from, to);
    await this.cache.set(cacheKey, result, LEDGER_CACHE_TTL_S);
    return result;
  }

  private async cachedGroupByEntity(from?: string, to?: string) {
    const cacheKey = `ledger-group-by-entity:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<Awaited<ReturnType<typeof buildGroupLedgerByEntity>>>(cacheKey);
    if (cached) return cached;
    const result = await buildGroupLedgerByEntity(this.prisma, from, to);
    await this.cache.set(cacheKey, result, LEDGER_CACHE_TTL_S);
    return result;
  }
}
