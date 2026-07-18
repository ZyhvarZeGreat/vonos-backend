import { BadRequestException, Injectable } from '@nestjs/common';
import type { GroupOverviewDashboard, OverviewDashboard, OverviewPanel } from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { buildGroupOverview, groupOverviewCacheWindowKey } from './groupOverview';
import {
  buildAppointmentOverview,
  buildJobOverview,
  buildStockOverview,
  buildTransactionOverview,
} from './overviewAggregators';
import {
  buildPurchasePaymentDuesPanel,
  buildSalesPaymentDuesPanel,
  buildStockAlertPanel,
} from './overviewPanels';

const ENTITY_CACHE_TTL_S = 300;

@Injectable()
export class OverviewService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async dashboard(from?: string, to?: string): Promise<OverviewDashboard> {
    const tenantId = this.tenantDb.requireTenantId();

    const cacheKey = await this.cache.tenantScopedKey(
      tenantId,
      `entity-overview:${tenantId}:${groupOverviewCacheWindowKey(from, to)}`,
    );
    const cached = await this.cache.get<OverviewDashboard>(cacheKey);
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { archetype: true, code: true },
    });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const db = this.tenantDb.db;
    const archetype = tenant.archetype;

    let result: OverviewDashboard;
    switch (archetype) {
      case 'stock':
        result = await buildStockOverview(db, tenantId, tenant.code, from, to);
        break;
      case 'transaction':
        result = await buildTransactionOverview(
          db,
          tenantId,
          tenant.code,
          from,
          to,
        );
        break;
      case 'job':
        result = await buildJobOverview(db, tenantId, tenant.code, from, to);
        break;
      case 'appointment':
        result = await buildAppointmentOverview(db, tenantId, from, to);
        break;
      default: {
        const _exhaustive: never = archetype;
        return _exhaustive;
      }
    }

    await this.cache.set(cacheKey, result, ENTITY_CACHE_TTL_S);
    return result;
  }

  async stockAlertPanel(): Promise<OverviewPanel> {
    const tenantId = this.tenantDb.requireTenantId();
    return buildStockAlertPanel(this.tenantDb.db, tenantId);
  }

  async purchasePaymentDuesPanel(): Promise<OverviewPanel> {
    const tenantId = this.tenantDb.requireTenantId();
    return buildPurchasePaymentDuesPanel(this.tenantDb.db, tenantId);
  }

  async salesPaymentDuesPanel(): Promise<OverviewPanel> {
    const tenantId = this.tenantDb.requireTenantId();
    return buildSalesPaymentDuesPanel(this.tenantDb.db, tenantId);
  }

  async group(from?: string, to?: string): Promise<GroupOverviewDashboard> {
    return buildGroupOverview(this.prisma, from, to, this.cache);
  }
}
