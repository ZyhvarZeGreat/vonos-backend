import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type {
  GroupOverviewDashboard,
  GroupOverviewDetails,
  GroupOverviewSummary,
  OverviewDashboard,
  OverviewPanel,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { refreshTenantEntitySnapshots } from '../../common/utils/tenantEntitySnapshot';
import {
  buildGroupOverview,
  buildGroupOverviewDetails,
  buildGroupOverviewSummary,
  groupOverviewCacheWindowKey,
} from './groupOverview';
import { warmHotPathsCache } from '../../common/utils/warmHotPathsCache';
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

const ENTITY_CACHE_TTL_S = 900;

@Injectable()
export class OverviewService implements OnModuleInit {
  private readonly logger = new Logger(OverviewService.name);

  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  onModuleInit(): void {
    // Warm snapshots + group overview in background so first VAG visit hits L1 (~ms).
    const delayMs = Number(process.env.GROUP_OVERVIEW_BOOTSTRAP_DELAY_MS ?? 3_000);
    setTimeout(() => {
      void this.bootstrapGroupOverviewCache();
    }, delayMs);
  }

  private async bootstrapGroupOverviewCache(): Promise<void> {
    const startedAt = Date.now();
    try {
      await refreshTenantEntitySnapshots(this.prisma);
      await warmHotPathsCache(this.prisma, this.cache);
      this.logger.log(
        `hot-paths bootstrap ${Date.now() - startedAt}ms (snapshots + cache warm)`,
      );
    } catch (err) {
      this.logger.warn(
        `group-overview bootstrap failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async dashboard(from?: string, to?: string): Promise<OverviewDashboard> {
    const startedAt = Date.now();
    const tenantId = this.tenantDb.requireTenantId();

    const cacheKey = await this.cache.tenantScopedKey(
      tenantId,
      `entity-overview:${tenantId}:${groupOverviewCacheWindowKey(from, to)}`,
    );
    const cached = await this.cache.get<OverviewDashboard>(cacheKey);
    if (cached) {
      this.logger.log(
        `entity-overview ${Date.now() - startedAt}ms cache=hit tenant=${tenantId}`,
      );
      return cached;
    }

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
    this.logger.log(
      `entity-overview ${Date.now() - startedAt}ms cache=miss tenant=${tenantId} archetype=${archetype}`,
    );
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
    const startedAt = Date.now();
    const cacheKey = `group-overview:${groupOverviewCacheWindowKey(from, to)}`;
    const cached = await this.cache.get<GroupOverviewDashboard>(cacheKey);
    if (cached) {
      this.logger.log(
        `group-overview ${Date.now() - startedAt}ms cache=hit`,
      );
      return cached;
    }
    const result = await buildGroupOverview(this.prisma, from, to, this.cache);
    this.logger.log(
      `group-overview ${Date.now() - startedAt}ms cache=miss`,
    );
    return result;
  }

  async groupSummary(
    from?: string,
    to?: string,
  ): Promise<GroupOverviewSummary> {
    const startedAt = Date.now();
    const cacheKey = `group-overview:summary:${groupOverviewCacheWindowKey(from, to)}`;
    const cached = await this.cache.get<GroupOverviewSummary>(cacheKey);
    if (cached) {
      this.logger.log(
        `group-overview-summary ${Date.now() - startedAt}ms cache=hit`,
      );
      return cached;
    }
    const result = await buildGroupOverviewSummary(
      this.prisma,
      from,
      to,
      this.cache,
    );
    this.logger.log(
      `group-overview-summary ${Date.now() - startedAt}ms cache=miss`,
    );
    return result;
  }

  async groupDetails(
    from?: string,
    to?: string,
  ): Promise<GroupOverviewDetails> {
    const startedAt = Date.now();
    const cacheKey = `group-overview:details:${groupOverviewCacheWindowKey(from, to)}`;
    const cached = await this.cache.get<GroupOverviewDetails>(cacheKey);
    if (cached) {
      this.logger.log(
        `group-overview-details ${Date.now() - startedAt}ms cache=hit`,
      );
      return cached;
    }
    const result = await buildGroupOverviewDetails(
      this.prisma,
      from,
      to,
      this.cache,
    );
    this.logger.log(
      `group-overview-details ${Date.now() - startedAt}ms cache=miss`,
    );
    return result;
  }

  async warmGroupCache(from?: string, to?: string): Promise<{ warmed: true }> {
    const startedAt = Date.now();
    await warmHotPathsCache(this.prisma, this.cache, from, to);
    this.logger.log(`hot-paths-warm ${Date.now() - startedAt}ms`);
    return { warmed: true };
  }
}
