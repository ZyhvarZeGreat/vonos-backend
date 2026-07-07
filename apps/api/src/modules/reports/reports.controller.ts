import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  TenantGuard,
} from '../../common/guards/auth.guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { ReportActionsService } from './report-actions.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportActionsService: ReportActionsService,
  ) {}

  @Get('summary')
  summary() {
    return this.reportsService.summary();
  }

  @Get('dashboard')
  dashboard(
    @Query('tab') tab?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.dashboard(tab ?? 'valuation', from, to);
  }

  @Get('group')
  @Roles('super_admin')
  group(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.group(from, to);
  }

  @Get('run')
  run(
    @Query('reportId') reportId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.run(reportId, from, to);
  }

  @Get('group/run')
  @Roles('super_admin')
  runGroup(
    @Query('reportId') reportId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.runGroup(reportId, from, to);
  }

  /** HQ6 adjustProductStock — fix per-location quantity mismatch. */
  @Patch('actions/fix-location-stock')
  @Roles('manager', 'admin', 'super_admin')
  fixLocationStock(
    @Body()
    body: {
      itemId: string;
      locationCode: string;
      binLocation?: string;
      quantity: number;
    },
  ) {
    return this.reportActionsService.fixLocationStock(body);
  }

  /** HQ6 updateStockExpiryReport — set expiry on inbound movement line. */
  @Patch('actions/movement-line-expiry')
  @Roles('manager', 'admin', 'super_admin')
  updateMovementLineExpiry(
    @Body()
    body: {
      movementId: string;
      lineSku: string;
      expDate: string;
    },
  ) {
    return this.reportActionsService.updateMovementLineExpiry(body);
  }
}
