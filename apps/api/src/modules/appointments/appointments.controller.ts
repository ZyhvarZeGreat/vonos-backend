import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  TenantGuard,
} from '../../common/guards/auth.guards';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.appointmentsService.list({
      cursor,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Post()
  create(
    @Body()
    body: {
      customerName?: string;
      stylistName: string;
      serviceName: string;
      servicePrice?: number;
      currency?: string;
      startTime: string;
      endTime: string;
      status?: string;
      notes?: string;
    },
  ) {
    return this.appointmentsService.create(body);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.appointmentsService.getById(id);
  }
}
