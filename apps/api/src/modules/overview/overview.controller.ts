import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  TenantGuard,
} from '../../common/guards/auth.guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { OverviewService } from './overview.service';
import { CacheService } from '../../common/cache/cache.service';

@Controller('overview')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class OverviewController {
  constructor(
    private readonly overviewService: OverviewService,
    private readonly cache: CacheService,
  ) {}

  @Get('dashboard')
  dashboard(@Query('from') from?: string, @Query('to') to?: string) {
    return this.overviewService.dashboard(from, to);
  }

  @Get('panels/stock-alert')
  stockAlertPanel() {
    return this.overviewService.stockAlertPanel();
  }

  @Get('panels/purchase-payment-dues')
  purchasePaymentDuesPanel() {
    return this.overviewService.purchasePaymentDuesPanel();
  }

  @Get('panels/sales-payment-dues')
  salesPaymentDuesPanel() {
    return this.overviewService.salesPaymentDuesPanel();
  }

  /** Fast path: KPIs + entity cards (no monthly trend / alerts). */
  @Get('group/summary')
  @Roles('super_admin')
  groupSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.overviewService.groupSummary(from, to);
  }

  /** Deferred: charts + alerts. */
  @Get('group/details')
  @Roles('super_admin')
  groupDetails(@Query('from') from?: string, @Query('to') to?: string) {
    return this.overviewService.groupDetails(from, to);
  }

  @Get('group')
  @Roles('super_admin')
  group(@Query('from') from?: string, @Query('to') to?: string) {
    return this.overviewService.group(from, to);
  }

  @Get('cache/stats')
  @Roles('super_admin')
  cacheStats() {
    return this.cache.stats();
  }

  @Post('cache/flush')
  @Roles('super_admin')
  async cacheFlush() {
    await this.cache.invalidatePrefix('');
    return { flushed: true };
  }
}
