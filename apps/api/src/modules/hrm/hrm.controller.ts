import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/decorators/roles.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  RolesGuard,
  TenantGuard,
} from '../../common/guards/auth.guards';
import { HrmService } from './hrm.service';
import type {
  CreatePayrollRequest,
  CreatePayrollGroupRequest,
  CreatePayComponentRequest,
} from '@vonos/types';

type AuthedRequest = Request & { user: AuthenticatedUser };

@Controller('hrm')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class HrmController {
  constructor(private readonly service: HrmService) {}

  @Get('workforce')
  listWorkforce(
    @Req() request: AuthedRequest,
    @Query('allTenants') allTenants?: string,
    @Query('search') search?: string,
  ) {
    if (allTenants === 'true') {
      return this.service.listWorkforceAllTenants(request.user.role, { search });
    }
    return this.service.listWorkforce({ search });
  }

  @Get('payroll')
  listPayrolls(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPayrolls({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Post('payroll')
  @Roles('admin', 'manager')
  createPayroll(@Body() dto: CreatePayrollRequest) {
    return this.service.createPayroll(dto);
  }

  @Get('payroll-groups')
  listPayrollGroups(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPayrollGroups({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Post('payroll-groups')
  @Roles('admin', 'manager')
  createPayrollGroup(@Body() dto: CreatePayrollGroupRequest) {
    return this.service.createPayrollGroup(dto);
  }

  @Get('pay-components')
  listPayComponents(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPayComponents({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Post('pay-components')
  @Roles('admin', 'manager')
  createPayComponent(@Body() dto: CreatePayComponentRequest) {
    return this.service.createPayComponent(dto);
  }
}
