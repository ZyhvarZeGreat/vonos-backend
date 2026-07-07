import { BadRequestException, Injectable } from '@nestjs/common';
import type { ProfitLossBreakdownTab, ReportsDashboard } from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { ItemsService } from '../items/items.service';
import { buildAppointmentReports } from './aggregators/appointmentReports';
import { buildGroupReports } from './aggregators/groupReports';
import { buildJobReports } from './aggregators/jobReports';
import { buildStockReports } from './aggregators/stockReports';
import { buildTransactionReports } from './aggregators/transactionReports';
import { runGroupReport, runReportForTenant } from './reportRunner';
import {
  buildProfitLossBreakdownSection,
  buildProfitLossCore,
  buildProfitLossShell,
  buildProfitLossSummarySection,
} from './aggregators/financeReportHandlers';
import {
  deserializeProfitLossContext,
  loadProfitLossContext,
  serializeProfitLossContext,
  type ProfitLossLoadContext,
  type ProfitLossLoadContextCached,
} from './aggregators/profitLossQueries';

export interface ReportsSummary {
  totalSku: number;
  todayInbound: number;
  todayOutbound: number;
  stockValue: number;
  currency: string;
  totalUnits: number;
  avgTurnover: number;
  stockValuesLabel: string;
}

const REPORT_CACHE_TTL_S = 300;
const PROFIT_LOSS_CACHE_TTL_S = 300;

const PROFIT_LOSS_BREAKDOWN_TABS = new Set<ProfitLossBreakdownTab>([
  'product',
  'category',
  'brand',
  'location',
  'invoice',
  'date',
  'customer',
  'day',
  'service-staff',
]);

export type ReportRunMode =
  | 'shell'
  | 'pl-core'
  | 'pl-summary'
  | 'pl-breakdown'
  | 'full';

@Injectable()
export class ReportsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly itemsService: ItemsService,
    private readonly cache: CacheService,
  ) {}

  private profitLossContextKey(
    tenantId: string,
    from?: string,
    to?: string,
  ): string {
    return `pl-ctx:${tenantId}:${from ?? ''}:${to ?? ''}`;
  }

  private async getProfitLossContext(
    tenantId: string,
    from?: string,
    to?: string,
  ): Promise<ProfitLossLoadContext> {
    const key = this.profitLossContextKey(tenantId, from, to);
    const cached = await this.cache.get<ProfitLossLoadContextCached>(key);
    if (cached) return deserializeProfitLossContext(cached);

    const loaded = await loadProfitLossContext(
      this.tenantDb.db,
      tenantId,
      from,
      to,
    );
    await this.cache.set(
      key,
      serializeProfitLossContext(loaded),
      PROFIT_LOSS_CACHE_TTL_S,
    );
    return loaded;
  }

  async summary(): Promise<ReportsSummary> {
    const kpi = await this.itemsService.kpiSummary();
    const totalUnitsResult = await this.tenantDb.db.item.aggregate({
      where: { deletedAt: null },
      _sum: { quantity: true },
    });
    const totalUnits = totalUnitsResult._sum.quantity ?? 0;
    const stockValueM = kpi.stockValue / 1_000_000;
    const stockValuesLabel = `₦ ${stockValueM.toFixed(1)}M`;

    return {
      ...kpi,
      totalUnits,
      avgTurnover:
        totalUnits > 0 ? Number((kpi.totalSku / totalUnits).toFixed(2)) : 0,
      stockValuesLabel,
    };
  }

  async dashboard(
    tab: string,
    from?: string,
    to?: string,
  ): Promise<ReportsDashboard> {
    const tenantId = this.tenantDb.requireTenantId();
    const cacheKey = `report-dash:${tenantId}:${tab}:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<ReportsDashboard>(cacheKey);
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { archetype: true },
    });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const db = this.tenantDb.db;
    const archetype = tenant.archetype;

    let result: ReportsDashboard;
    switch (archetype) {
      case 'stock':
        result = await buildStockReports(
          db,
          tenantId,
          (tab as 'valuation' | 'movement' | 'lowstock') || 'valuation',
          from,
          to,
        );
        break;
      case 'transaction':
        result = await buildTransactionReports(
          db,
          tenantId,
          (tab as 'sales' | 'closeout') || 'sales',
          from,
          to,
        );
        break;
      case 'job':
        result = await buildJobReports(
          db,
          tenantId,
          (tab as 'costing' | 'turnaround') || 'costing',
          from,
          to,
        );
        break;
      case 'appointment':
        result = await buildAppointmentReports(
          db,
          tenantId,
          (tab as 'stylist' | 'noshow') || 'stylist',
          from,
          to,
        );
        break;
      default: {
        const _exhaustive: never = archetype;
        return _exhaustive;
      }
    }

    await this.cache.set(cacheKey, result, REPORT_CACHE_TTL_S);
    return result;
  }

  async group(from?: string, to?: string): Promise<ReportsDashboard> {
    const cacheKey = `report-group:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<ReportsDashboard>(cacheKey);
    if (cached) return cached;

    const result = await buildGroupReports(this.prisma, from, to);
    await this.cache.set(cacheKey, result, REPORT_CACHE_TTL_S);
    return result;
  }

  async run(
    reportId: string,
    from?: string,
    to?: string,
    mode?: ReportRunMode,
    breakdownTab?: ProfitLossBreakdownTab,
  ): Promise<ReportsDashboard> {
    const tenantId = this.tenantDb.requireTenantId();
    const resolvedMode =
      mode ?? (reportId === 'profit-loss' ? 'pl-core' : 'full');
    const cacheKey = `report-run:${tenantId}:${reportId}:${resolvedMode}:${breakdownTab ?? ''}:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<ReportsDashboard>(cacheKey);
    if (cached) return cached;

    if (reportId === 'profit-loss' && resolvedMode !== 'full') {
      const db = this.tenantDb.db;
      let result: ReportsDashboard;
      switch (resolvedMode) {
        case 'shell':
          result = await buildProfitLossShell(db, tenantId, from, to);
          break;
        case 'pl-core': {
          const loaded = await this.getProfitLossContext(tenantId, from, to);
          result = await buildProfitLossCore(db, tenantId, from, to, loaded);
          break;
        }
        case 'pl-summary': {
          const loaded = await this.getProfitLossContext(tenantId, from, to);
          result = await buildProfitLossSummarySection(
            db,
            tenantId,
            from,
            to,
            loaded,
          );
          break;
        }
        case 'pl-breakdown': {
          if (!breakdownTab || !PROFIT_LOSS_BREAKDOWN_TABS.has(breakdownTab)) {
            throw new BadRequestException(
              'breakdownTab is required for pl-breakdown mode',
            );
          }
          const loaded = await this.getProfitLossContext(tenantId, from, to);
          const section = await buildProfitLossBreakdownSection(
            db,
            tenantId,
            breakdownTab,
            from,
            to,
            loaded,
          );
          result = {
            kpis: [],
            charts: [],
            profitLoss: {
              summary: {
                currency: 'NGN',
                debits: [],
                credits: [],
                cogs: 0,
                grossProfit: 0,
                netProfit: 0,
              },
              breakdowns: { [section.tab]: section.breakdown },
            },
          };
          break;
        }
        default: {
          const _exhaustive: never = resolvedMode;
          throw new BadRequestException(`Unknown report mode: ${_exhaustive}`);
        }
      }
      await this.cache.set(cacheKey, result, PROFIT_LOSS_CACHE_TTL_S);
      return result;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { archetype: true },
    });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    const result = await runReportForTenant(
      reportId,
      {
        db: this.tenantDb.db,
        prisma: this.prisma,
        tenantId,
        archetype: tenant.archetype,
      },
      from,
      to,
    );
    await this.cache.set(cacheKey, result, REPORT_CACHE_TTL_S);
    return result;
  }

  async runGroup(reportId: string, from?: string, to?: string) {
    const cacheKey = `report-group-run:${reportId}:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<ReportsDashboard>(cacheKey);
    if (cached) return cached;

    const result = await runGroupReport(this.prisma, reportId, from, to);
    await this.cache.set(cacheKey, result, REPORT_CACHE_TTL_S);
    return result;
  }
}
