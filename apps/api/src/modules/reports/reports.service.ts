import { BadRequestException, Injectable } from '@nestjs/common';
import type { ReportsDashboard } from '@vonos/types';
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

const REPORT_CACHE_TTL_S = 60;

@Injectable()
export class ReportsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly itemsService: ItemsService,
    private readonly cache: CacheService,
  ) {}

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
  ): Promise<ReportsDashboard> {
    const tenantId = this.tenantDb.requireTenantId();
    const cacheKey = `report-run:${tenantId}:${reportId}:${from ?? ''}:${to ?? ''}`;
    const cached = await this.cache.get<ReportsDashboard>(cacheKey);
    if (cached) return cached;

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
