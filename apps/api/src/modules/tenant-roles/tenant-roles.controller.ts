import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ForbiddenException,
  UseGuards,
  Req,
} from '@nestjs/common';
import type {
  CreateTenantRoleRequest,
  ImportTenantRolesRequest,
  UpdateTenantRoleRequest,
} from '@vonos/types';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/decorators/roles.decorator';
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
  @Roles('admin', 'manager', 'staff', 'super_admin')
  create(
    @Body() dto: CreateTenantRoleRequest,
    @Req()
    req: {
      user: AuthenticatedUser;
      tenantScope: string | null;
    },
  ) {
    const perms = req.user.tenantRolePermissions ?? [];
    const canCreate = perms.includes('*') || perms.includes('roles.create');
    if (!canCreate) throw new ForbiddenException('Missing roles.create');
    if (req.tenantScope !== 'tenant_vag_001') {
      throw new ForbiddenException('VAG only');
    }
    return this.service.create(dto);
  }

  @Post('import')
  @Roles('admin', 'manager', 'staff', 'super_admin')
  importRoles(
    @Body() dto: ImportTenantRolesRequest,
    @Req()
    req: {
      user: AuthenticatedUser;
      tenantScope: string | null;
    },
  ) {
    const perms = req.user.tenantRolePermissions ?? [];
    const canImport = perms.includes('*') || perms.includes('roles.create');
    if (!canImport) throw new ForbiddenException('Missing roles.create');
    if (req.tenantScope !== 'tenant_vag_001') {
      throw new ForbiddenException('VAG only');
    }
    return this.service.importRoles(dto);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'staff', 'super_admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantRoleRequest,
    @Req()
    req: {
      user: AuthenticatedUser;
      tenantScope: string | null;
    },
  ) {
    const perms = req.user.tenantRolePermissions ?? [];
    const canUpdate = perms.includes('*') || perms.includes('roles.update');
    if (!canUpdate) throw new ForbiddenException('Missing roles.update');
    if (req.tenantScope !== 'tenant_vag_001') {
      throw new ForbiddenException('VAG only');
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'manager', 'staff', 'super_admin')
  remove(
    @Param('id') id: string,
    @Req()
    req: {
      user: AuthenticatedUser;
      tenantScope: string | null;
    },
  ) {
    const perms = req.user.tenantRolePermissions ?? [];
    const canDelete = perms.includes('*') || perms.includes('roles.delete');
    if (!canDelete) throw new ForbiddenException('Missing roles.delete');
    if (req.tenantScope !== 'tenant_vag_001') {
      throw new ForbiddenException('VAG only');
    }
    return this.service.remove(id);
  }
}
