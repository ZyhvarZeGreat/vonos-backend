import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CreateTenantRoleRequest,
  ImportTenantRolesRequest,
  TenantRole,
  UpdateTenantRoleRequest,
} from '@vonos/types';
import { TENANT_ROLE_DEMO_NAMES } from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { invalidateTenantDashboardCache } from '../../common/cache/cacheInvalidation';
import { ensureOperatingTenant, OPERATING_TENANTS } from '../../common/tenants/ensureOperatingTenant';
import { toIso } from '../../common/utils/serializers';

type LegacyRoleSeed = {
  name: string;
  permissions: string[];
  isServiceStaff: boolean;
  locked: boolean;
};

function loadLegacyRolePermissions(): Map<string, LegacyRoleSeed> {
  try {
    const raw = readFileSync(
      join(__dirname, 'legacyRolePermissions.json'),
      'utf8',
    );
    const rows = JSON.parse(raw) as LegacyRoleSeed[];
    return new Map(
      rows.map((row) => [row.name.trim().toLowerCase(), row] as const),
    );
  } catch {
    return new Map();
  }
}

const LEGACY_ROLE_BY_NAME = loadLegacyRolePermissions();

/** Full HQ6 role catalog (demo names + any legacy-only names). */
function roleCatalogEntries(): Array<{
  name: string;
  permissions: string[];
  isServiceStaff: boolean;
  locked: boolean;
}> {
  const byKey = new Map<string, string>();
  for (const name of TENANT_ROLE_DEMO_NAMES) {
    byKey.set(name.trim().toLowerCase(), name);
  }
  for (const [key, legacy] of LEGACY_ROLE_BY_NAME) {
    if (!byKey.has(key)) byKey.set(key, legacy.name);
  }

  return [...byKey.entries()].map(([key, name]) => {
    const legacy = LEGACY_ROLE_BY_NAME.get(key);
    const permissions = legacy?.permissions ?? [];
    return {
      name,
      permissions,
      isServiceStaff:
        Boolean(legacy?.isServiceStaff) ||
        name === 'Service Staff' ||
        permissions.includes('is_service_staff'),
      locked: Boolean(legacy?.locked) || name === 'Admin',
    };
  });
}

@Injectable()
export class TenantRolesService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(filters: { search?: string } = {}): Promise<TenantRole[]> {
    const tenantId = this.tenantDb.requireTenantId();
    // Keep the same role catalog available in every operating app.
    await this.ensureDefaultsForAllOperatingTenants();
    await this.backfillEmptyLegacyPermissions(tenantId);

    const rows = await this.tenantDb.db.tenantRole.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.search?.trim()
          ? {
              name: {
                contains: filters.search.trim(),
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toRole(row));
  }

  async getById(id: string): Promise<TenantRole> {
    const tenantId = this.tenantDb.requireTenantId();
    await this.backfillEmptyLegacyPermissions(tenantId);
    const row = await this.tenantDb.db.tenantRole.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Role not found');
    return this.toRole(row);
  }

  async create(dto: CreateTenantRoleRequest): Promise<TenantRole> {
    const tenantId = this.tenantDb.requireTenantId();
    await ensureOperatingTenant(this.prisma, tenantId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Role name is required');

    const clash = await this.tenantDb.db.tenantRole.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (clash) {
      throw new ConflictException(`Role “${name}” already exists`);
    }

    const locked = Boolean(dto.locked) || name.toLowerCase() === 'admin';
    const permissions = Array.isArray(dto.permissions)
      ? dto.permissions.map(String)
      : [];
    const isServiceStaff =
      Boolean(dto.isServiceStaff) || permissions.includes('is_service_staff');

    const row = await this.tenantDb.db.tenantRole.create({
      data: {
        tenantId,
        name,
        permissions,
        isServiceStaff,
        locked,
      },
    });
    await this.propagateRoleToOtherTenants({
      name,
      permissions,
      isServiceStaff,
      locked,
      sourceTenantId: tenantId,
    });
    void invalidateTenantDashboardCache(this.cache, tenantId);
    return this.toRole(row);
  }

  async update(id: string, dto: UpdateTenantRoleRequest): Promise<TenantRole> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.tenantRole.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Role not found');

    const data: {
      name?: string;
      permissions?: string[];
      isServiceStaff?: boolean;
      locked?: boolean;
    } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Role name is required');
      if (existing.locked && name.toLowerCase() !== 'admin') {
        throw new BadRequestException('Cannot rename a locked Admin role');
      }
      const clash = await this.tenantDb.db.tenantRole.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          name: { equals: name, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (clash) {
        throw new ConflictException(`Role “${name}” already exists`);
      }
      data.name = name;
      if (name.toLowerCase() === 'admin') data.locked = true;
    }

    if (dto.permissions !== undefined) {
      data.permissions = dto.permissions.map(String);
      data.isServiceStaff = data.permissions.includes('is_service_staff');
    }

    if (dto.isServiceStaff !== undefined) {
      data.isServiceStaff = Boolean(dto.isServiceStaff);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const row = await this.tenantDb.db.tenantRole.update({
      where: { id },
      data,
    });
    await this.propagateRoleToOtherTenants({
      name: row.name,
      permissions: row.permissions,
      isServiceStaff: row.isServiceStaff,
      locked: row.locked,
      sourceTenantId: tenantId,
      previousName: existing.name,
    });
    void invalidateTenantDashboardCache(this.cache, tenantId);
    return this.toRole(row);
  }

  async remove(id: string): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.tenantRole.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.locked || existing.name.toLowerCase() === 'admin') {
      throw new BadRequestException(`“${existing.name}” cannot be deleted`);
    }

    await this.tenantDb.db.tenantRole.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.user.updateMany({
      where: { tenantRoleId: id },
      data: { tenantRoleId: null },
    });
    void invalidateTenantDashboardCache(this.cache, tenantId);
  }

  /**
   * One-shot import for migrating browser localStorage roles into the DB.
   * Skips names that already exist (case-insensitive).
   */
  async importRoles(dto: ImportTenantRolesRequest): Promise<TenantRole[]> {
    const tenantId = this.tenantDb.requireTenantId();
    await ensureOperatingTenant(this.prisma, tenantId);
    if (!Array.isArray(dto.roles) || dto.roles.length === 0) {
      throw new BadRequestException('roles array is required');
    }

    const existing = await this.tenantDb.db.tenantRole.findMany({
      where: { tenantId, deletedAt: null },
    });
    const byName = new Map(
      existing.map((r) => [r.name.trim().toLowerCase(), r]),
    );

    for (const incoming of dto.roles) {
      const name = String(incoming.name ?? '').trim();
      if (!name) continue;
      const permissions = Array.isArray(incoming.permissions)
        ? incoming.permissions.map(String)
        : [];
      const locked =
        Boolean(incoming.locked) || name.toLowerCase() === 'admin';
      const isServiceStaff =
        Boolean(incoming.isServiceStaff) ||
        permissions.includes('is_service_staff');

      const match = byName.get(name.toLowerCase());
      if (match) {
        if (permissions.length > 0 || incoming.isServiceStaff !== undefined) {
          await this.tenantDb.db.tenantRole.update({
            where: { id: match.id },
            data: {
              permissions:
                permissions.length > 0 ? permissions : match.permissions,
              isServiceStaff,
              locked: match.locked || locked,
            },
          });
        }
        continue;
      }

      const row = await this.tenantDb.db.tenantRole.create({
        data: {
          tenantId,
          name,
          permissions,
          isServiceStaff,
          locked,
        },
      });
      byName.set(name.toLowerCase(), row);
    }

    void invalidateTenantDashboardCache(this.cache, tenantId);
    return this.list();
  }

  /**
   * Keep custom / edited roles aligned across every operating entity so the
   * Create User form sees the same role names everywhere.
   */
  private async propagateRoleToOtherTenants(args: {
    name: string;
    permissions: string[];
    isServiceStaff: boolean;
    locked: boolean;
    sourceTenantId: string;
    previousName?: string;
  }): Promise<void> {
    const matchName = (args.previousName ?? args.name).trim().toLowerCase();
    for (const tenant of OPERATING_TENANTS) {
      if (tenant.code === 'VAG' || tenant.id === args.sourceTenantId) continue;
      await ensureOperatingTenant(this.prisma, tenant.id);

      const existing = await this.prisma.tenantRole.findFirst({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          name: { equals: matchName, mode: 'insensitive' },
        },
      });

      if (existing) {
        await this.prisma.tenantRole.update({
          where: { id: existing.id },
          data: {
            name: args.name,
            permissions: args.permissions,
            isServiceStaff: args.isServiceStaff,
            locked: args.locked || existing.locked,
          },
        });
      } else {
        await this.prisma.tenantRole.create({
          data: {
            tenantId: tenant.id,
            name: args.name,
            permissions: args.permissions,
            isServiceStaff: args.isServiceStaff,
            locked: args.locked,
          },
        });
      }
      void invalidateTenantDashboardCache(this.cache, tenant.id);
    }
  }

  /**
   * Ensure every operating entity (VA, VP, VW, …) has the full HQ6 role catalog.
   * Skips VAG (no entity-scoped job roles). Idempotent — only inserts missing names.
   */
  async ensureDefaultsForAllOperatingTenants(): Promise<void> {
    for (const tenant of OPERATING_TENANTS) {
      if (tenant.code === 'VAG') continue;
      await this.ensureDefaults(tenant.id);
    }
  }

  /**
   * Insert any missing catalog roles for a tenant (does not overwrite existing).
   */
  async ensureDefaults(tenantId: string): Promise<void> {
    await ensureOperatingTenant(this.prisma, tenantId);

    const existing = await this.prisma.tenantRole.findMany({
      where: { tenantId, deletedAt: null },
      select: { name: true },
    });
    const existingNames = new Set(
      existing.map((row) => row.name.trim().toLowerCase()),
    );

    const missing = roleCatalogEntries().filter(
      (role) => !existingNames.has(role.name.trim().toLowerCase()),
    );
    if (missing.length === 0) return;

    await this.prisma.tenantRole.createMany({
      data: missing.map((role) => ({
        tenantId,
        name: role.name,
        permissions: role.permissions,
        isServiceStaff: role.isServiceStaff,
        locked: role.locked,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Roles were seeded with empty permission arrays. Fill from the Ultimate POS
   * `role_has_permissions` dump when a matching role name still has zero perms.
   * Does not overwrite roles that already have privileges (or Admin — full via locked).
   */
  private async backfillEmptyLegacyPermissions(
    tenantId: string,
  ): Promise<void> {
    if (LEGACY_ROLE_BY_NAME.size === 0) return;

    const empty = await this.prisma.tenantRole.findMany({
      where: {
        tenantId,
        deletedAt: null,
        permissions: { isEmpty: true },
      },
      select: { id: true, name: true, locked: true },
    });
    if (empty.length === 0) return;

    let changed = false;
    for (const row of empty) {
      if (row.locked || row.name.trim().toLowerCase() === 'admin') continue;
      const legacy = LEGACY_ROLE_BY_NAME.get(row.name.trim().toLowerCase());
      if (!legacy || legacy.permissions.length === 0) continue;
      await this.prisma.tenantRole.update({
        where: { id: row.id },
        data: {
          permissions: legacy.permissions,
          isServiceStaff:
            legacy.isServiceStaff ||
            legacy.permissions.includes('is_service_staff'),
        },
      });
      changed = true;
    }
    if (changed) {
      void invalidateTenantDashboardCache(this.cache, tenantId);
    }
  }

  private toRole(row: {
    id: string;
    tenantId: string;
    name: string;
    permissions: string[];
    isServiceStaff: boolean;
    locked: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): TenantRole {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      permissions: row.permissions ?? [],
      isServiceStaff: row.isServiceStaff,
      locked: row.locked,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }
}
