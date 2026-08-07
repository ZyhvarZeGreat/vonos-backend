import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { HrmEssentialsService } from './hrm-essentials.service';
import type {
  CreatePayrollRequest,
  CreatePayrollGroupRequest,
  CreatePayComponentRequest,
  CreateDesignationRequest,
  CreateEmployeeRequest,
  SyncEmployeeByUserRequest,
  UpdatePayrollDeductionRequest,
  UpdateDesignationRequest,
  UpdatePayrollGroupRequest,
  PayPayrollsRequest,
} from '@vonos/types';

type AuthedRequest = Request & { user: AuthenticatedUser };

@Controller('hrm')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class HrmController {
  constructor(
    private readonly service: HrmService,
    private readonly essentials: HrmEssentialsService,
  ) {}

  @Get('workforce')
  listWorkforce(
    @Req() request: AuthedRequest,
    @Query('allTenants') allTenants?: string,
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    const filters = {
      search,
      cursor,
      limit: limit ? Number(limit) : undefined,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    };
    if (allTenants === 'true') {
      return this.service.listWorkforceAllTenants(request.user.role, filters);
    }
    return this.service.listWorkforce(filters);
  }

  @Get('workforce/stats')
  workforceStats() {
    return this.service.getWorkforceStats();
  }

  @Get('designations')
  listDesignations(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.service.listDesignations({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Post('designations')
  @Roles('admin', 'manager', 'super_admin')
  createDesignation(@Body() dto: CreateDesignationRequest) {
    return this.service.createDesignation(dto);
  }

  @Patch('designations/:id')
  @Roles('admin', 'manager', 'super_admin')
  updateDesignation(
    @Param('id') id: string,
    @Body() dto: UpdateDesignationRequest,
  ) {
    return this.service.updateDesignation(id, dto);
  }

  @Delete('designations/:id')
  @Roles('admin', 'manager', 'super_admin')
  deleteDesignation(@Param('id') id: string) {
    return this.service.deleteDesignation(id);
  }

  @Get('employees')
  listEmployees(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('designationId') designationId?: string,
    @Query('locationCode') locationCode?: string,
    @Query('serviceStaffOnly') serviceStaffOnly?: string,
  ) {
    return this.service.listEmployees({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      designationId,
      locationCode,
      serviceStaffOnly: serviceStaffOnly === 'true',
    });
  }

  @Post('employees')
  @Roles('admin', 'manager', 'super_admin')
  createEmployee(@Body() dto: CreateEmployeeRequest) {
    return this.service.createEmployee(dto);
  }

  @Get('employees/by-user/:userId')
  getEmployeeByUser(@Param('userId') userId: string) {
    return this.service.getEmployeeByUserId(userId);
  }

  @Patch('employees/by-user/:userId/locations')
  @Roles('admin', 'manager', 'super_admin')
  syncEmployeeLocations(
    @Param('userId') userId: string,
    @Body() body: SyncEmployeeByUserRequest,
  ) {
    return this.service.syncEmployeeLocationsByUserId({
      userId,
      ...body,
    });
  }

  @Get('payroll')
  listPayrolls(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('payrollGroupId') payrollGroupId?: string,
    @Query('employeeRecordId') employeeRecordId?: string,
    @Query('locationCode') locationCode?: string,
    @Query('designationId') designationId?: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('includeSummary') includeSummary?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.service.listPayrolls({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      payrollGroupId,
      employeeRecordId,
      locationCode,
      designationId,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      status,
      paymentStatus,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
      sortBy,
      sortDir: sortDir === 'asc' || sortDir === 'desc' ? sortDir : undefined,
    });
  }

  @Post('payroll')
  @Roles('admin', 'manager', 'super_admin')
  createPayroll(@Body() dto: CreatePayrollRequest) {
    return this.service.createPayroll(dto);
  }

  @Post('payroll/pay')
  @Roles('admin', 'manager', 'super_admin')
  payPayrolls(@Body() dto: PayPayrollsRequest) {
    return this.service.payPayrolls(dto);
  }

  @Patch('payroll/:id/deduction')
  @Roles('admin', 'manager', 'super_admin')
  addPayrollDeduction(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollDeductionRequest,
  ) {
    return this.service.addPayrollDeduction(id, dto);
  }

  @Get('payroll-groups')
  listPayrollGroups(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.service.listPayrollGroups({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Post('payroll-groups')
  @Roles('admin', 'manager', 'super_admin')
  createPayrollGroup(@Body() dto: CreatePayrollGroupRequest) {
    return this.service.createPayrollGroup(dto);
  }

  @Patch('payroll-groups/:id')
  @Roles('admin', 'manager', 'super_admin')
  updatePayrollGroup(
    @Param('id') id: string,
    @Body() dto: UpdatePayrollGroupRequest,
  ) {
    return this.service.updatePayrollGroup(id, dto);
  }

  @Delete('payroll-groups/:id')
  @Roles('admin', 'manager', 'super_admin')
  deletePayrollGroup(@Param('id') id: string) {
    return this.service.deletePayrollGroup(id);
  }

  @Get('pay-components')
  listPayComponents(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.service.listPayComponents({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Post('pay-components')
  @Roles('admin', 'manager', 'super_admin')
  createPayComponent(@Body() dto: CreatePayComponentRequest) {
    return this.service.createPayComponent(dto);
  }

  /* —— Essentials / HQ6 HRM screens —— */

  @Get('leave-types')
  listLeaveTypes(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.essentials.listLeaveTypes({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Post('leave-types')
  @Roles('admin', 'manager', 'super_admin')
  createLeaveType(
    @Body() dto: { name: string; maxLeaveCount?: number },
  ) {
    return this.essentials.createLeaveType(dto);
  }

  @Patch('leave-types/:id')
  @Roles('admin', 'manager', 'super_admin')
  updateLeaveType(
    @Param('id') id: string,
    @Body() dto: { name?: string; maxLeaveCount?: number },
  ) {
    return this.essentials.updateLeaveType(id, dto);
  }

  @Delete('leave-types/:id')
  @Roles('admin', 'manager', 'super_admin')
  deleteLeaveType(@Param('id') id: string) {
    return this.essentials.deleteLeaveType(id);
  }

  @Get('leaves')
  listLeaves(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('designationId') designationId?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.essentials.listLeaves({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      designationId,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Post('leaves')
  @Roles('admin', 'manager', 'super_admin')
  createLeave(
    @Body()
    dto: {
      referenceNo?: string;
      leaveTypeId?: string;
      employeeName: string;
      employeeRecordId?: string;
      designationId?: string;
      leaveDate: string;
      reason?: string;
      status?: string;
    },
  ) {
    return this.essentials.createLeave(dto);
  }

  @Delete('leaves/:id')
  @Roles('admin', 'manager', 'super_admin')
  deleteLeave(@Param('id') id: string) {
    return this.essentials.deleteLeave(id);
  }

  @Get('holidays')
  listHolidays(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.essentials.listHolidays({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Post('holidays')
  @Roles('admin', 'manager', 'super_admin')
  createHoliday(
    @Body()
    dto: {
      name: string;
      date: string;
      locationCode?: string;
      note?: string;
    },
  ) {
    return this.essentials.createHoliday(dto);
  }

  @Delete('holidays/:id')
  @Roles('admin', 'manager', 'super_admin')
  deleteHoliday(@Param('id') id: string) {
    return this.essentials.deleteHoliday(id);
  }

  @Get('attendance/shifts')
  listShifts(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.essentials.listShifts({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Post('attendance/shifts')
  @Roles('admin', 'manager', 'super_admin')
  createShift(@Body() dto: { name: string }) {
    return this.essentials.createShift(dto);
  }

  @Get('attendance')
  listAttendances(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.essentials.listAttendances({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      date,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Get('attendance/by-shift')
  attendanceByShift(@Query('date') date?: string) {
    return this.essentials.attendanceByShift(date ?? new Date().toISOString().slice(0, 10));
  }

  @Post('attendance/clock-in')
  @Roles('admin', 'manager', 'staff', 'super_admin')
  clockIn(
    @Body() dto: { employeeName: string; shiftId?: string; date?: string },
  ) {
    return this.essentials.clockIn(dto);
  }

  @Get('sales-targets')
  listSalesTargets(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeSummary') includeSummary?: string,
  ) {
    return this.essentials.listSalesTargets({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
      includeSummary: includeSummary !== '0' && includeSummary !== 'false',
    });
  }

  @Post('sales-targets')
  @Roles('admin', 'manager', 'super_admin')
  upsertSalesTarget(
    @Body() dto: { userName: string; userId?: string; note?: string },
  ) {
    return this.essentials.upsertSalesTarget(dto);
  }
}
