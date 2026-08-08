import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateTenantRoleRequest,
  ImportTenantRolesRequest,
  UpdateTenantRoleRequest,
} from '@vonos/types';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  RolesGuard,
  TenantGuard,
} from '../../common/guards/auth.guards';
import { TenantRolesService } from './tenant-roles.service';

@Controller('tenant-roles')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TenantRolesController {
  constructor(private readonly service: TenantRolesService) {}

  @Get()
  list(@Query('search') search?: string) {
    return this.service.list({ search });
  }

  /** Role definitions are VAG-only — tenant admins may list/assign, not edit. */
  @Post()
  @Roles('super_admin')
  create(@Body() dto: CreateTenantRoleRequest) {
    return this.service.create(dto);
  }

  @Post('import')
  @Roles('super_admin')
  importRoles(@Body() dto: ImportTenantRolesRequest) {
    return this.service.importRoles(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @Roles('super_admin')
  update(@Param('id') id: string, @Body() dto: UpdateTenantRoleRequest) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
