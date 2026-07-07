import type { ReportsDashboard } from '@vonos/types';
import { AUTOS_GROUP_CODES, reportEntryById } from '@vonos/types';
import type { PrismaClient } from '@prisma/client';
import type { TenantDbService } from '../../common/prisma/tenant-db.service';
import { AuditService } from '../audit/audit.service';
import { buildStockReports } from './aggregators/stockReports';
import { buildTransactionReports } from './aggregators/transactionReports';
import {
  buildContactsSummaryReport,
  buildCustomerGroupsReport,
  buildItemsReport,
  buildProductPurchaseReport,
  buildProductSellReport,
  buildPurchasePaymentReport,
  buildPurchaseSaleReport,
  buildRegisterReport,
  buildSalesRepReport,
  buildSellPaymentReport,
  buildServiceStaffReport,
  buildStockDetailsReport,
  buildStockExpiryReport,
  buildTaxReport,
  buildTrendingProductsReport,
} from './aggregators/transactionReportHandlers';
import { buildGroupReports } from './aggregators/groupReports';
import { buildEntityRollupForReport } from './aggregators/groupReportRollups';
import {
  buildExpenseReport,
  buildProfitLossReport,
} from './aggregators/financeReportHandlers';
import {
  buildBalanceSheetReport,
  buildCashFlowReport,
  buildPaymentAccountReport,
  buildTrialBalanceReport,
} from './aggregators/paymentAccountReportHandlers';

type ScopedDb = TenantDbService['db'];

export async function runReportForTenant(
  reportId: string,
  deps: {
    db: ScopedDb;
    prisma: PrismaClient;
    tenantId: string;
    archetype: string;
    auditService?: AuditService;
  },
  from?: string,
  to?: string,
): Promise<ReportsDashboard> {
  const entry = reportEntryById(reportId);
  if (!entry) {
    throw new Error(`Unknown report: ${reportId}`);
  }

  const { db, prisma, tenantId, archetype } = deps;
  const source = entry.source;

  switch (source.kind) {
    case 'ledger':
      return source.handler === 'pl'
        ? buildProfitLossReport(db, from, to)
        : buildExpenseReport(db, from, to);
    case 'payment-accounts': {
      const handler = source.handler;
      if (handler === 'balance-sheet')
        return buildBalanceSheetReport(db, from, to);
      if (handler === 'trial-balance')
        return buildTrialBalanceReport(db, from, to);
      if (handler === 'cash-flow') return buildCashFlowReport(db, from, to);
      return buildPaymentAccountReport(db, from, to);
    }
    case 'reports':
      if (archetype === 'stock') {
        return buildStockReports(
          db,
          tenantId,
          source.tab as 'valuation' | 'movement' | 'lowstock',
          from,
          to,
        );
      }
      return buildTransactionReports(
        db,
        tenantId,
        source.tab as 'sales' | 'closeout',
        from,
        to,
      );
    case 'stock':
      if (source.handler === 'expiry') {
        return buildStockExpiryReport(db);
      }
      if (source.handler === 'details') {
        return buildStockDetailsReport(db);
      }
      return buildStockReports(
        db,
        tenantId,
        source.handler === 'lowstock'
          ? 'lowstock'
          : source.handler === 'movement'
            ? 'movement'
            : 'valuation',
        from,
        to,
      );
    case 'product': {
      const handler = source.handler;
      if (handler === 'trending')
        return buildTrendingProductsReport(db, from, to);
      if (handler === 'items') return buildItemsReport(db, from, to);
      if (handler === 'purchase')
        return buildProductPurchaseReport(db, from, to);
      return buildProductSellReport(db, from, to);
    }
    case 'sales': {
      const handler = source.handler;
      if (handler === 'purchase-sale')
        return buildPurchaseSaleReport(db, from, to);
      if (handler === 'tax') return buildTaxReport(db, from, to);
      if (handler === 'register') return buildRegisterReport(db, from, to);
      if (handler === 'service-staff') {
        return buildServiceStaffReport(db, from, to);
      }
      return buildSalesRepReport(db, from, to);
    }
    case 'payments':
      return source.handler === 'purchase'
        ? buildPurchasePaymentReport(db, from, to)
        : buildSellPaymentReport(db, from, to);
    case 'contacts':
      return source.handler === 'customer-groups'
        ? buildCustomerGroupsReport(db, from, to)
        : buildContactsSummaryReport(db, from, to);
    case 'audit': {
      const logs = await prisma.auditLog.findMany({
        where: {
          tenantId,
          ...(from || to
            ? {
                occurredAt: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
        orderBy: { occurredAt: 'desc' },
        take: 200,
      });
      return {
        kpis: [
          {
            label: 'Log entries',
            icon: 'activity',
            metricKey: 'logs',
            color: '#2563eb',
            value: logs.length,
          },
        ],
        charts: [],
        table: {
          columns: [
            { key: 'occurredAt', header: 'When' },
            { key: 'actorName', header: 'User' },
            { key: 'summary', header: 'Summary' },
          ],
          rows: logs.map((log) => ({
            occurredAt: log.occurredAt.toISOString(),
            actorName: log.actorName ?? '—',
            summary: log.summary,
          })),
        },
      };
    }
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export async function runGroupReport(
  prisma: PrismaClient,
  reportId: string,
  from?: string,
  to?: string,
): Promise<
  ReportsDashboard & {
    byEntity?: Array<{ code: string; rows: Record<string, string | number>[] }>;
  }
> {
  const entry = reportEntryById(reportId);
  if (!entry?.groupRollup) {
    return buildGroupReports(prisma, from, to);
  }

  const tenants = await prisma.tenant.findMany({
    where: { code: { in: [...AUTOS_GROUP_CODES] }, deletedAt: null },
    select: { id: true, code: true, archetype: true },
    orderBy: { code: 'asc' },
  });

  const byEntity = entry.groupRollup
    ? await buildEntityRollupForReport(prisma, entry, tenants, from, to)
    : undefined;

  const groupDashboard = await buildGroupReports(prisma, from, to);
  return { ...groupDashboard, byEntity };
}
