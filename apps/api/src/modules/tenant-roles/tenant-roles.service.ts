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
import { TENANT_ROLE_DEMO_NAMES, HR_ROLE_DEFAULT_PERMISSIONS, isHrRoleName } from '@vonos/types';
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
    let permissions = legacy?.permissions ?? [];
    // HR roles get a safe default matrix (users + payroll, no finance) when
    // the legacy seed has nothing checked.
    if (permissions.length === 0 && isHrRoleName(name)) {
      permissions = [...HR_ROLE_DEFAULT_PERMISSIONS];
    }
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

  /**
   * Job-role catalogs live on operating entities (VA, VW, …), not VAG.
   * When the request is scoped to VAG, read/write against the first operating tenant.
   */
  private resolveCatalogTenantId(tenantId: string): string {
    if (tenantId !== 'tenant_vag_001') return tenantId;
    const first = OPERATING_TENANTS.find((t) => t.code !== 'VAG');
    if (!first) {
      throw new BadRequestException('No operating tenant available for roles');
    }
    return first.id;
  }

  private operatingEntityTenants() {
    return OPERATING_TENANTS.filter((t) => t.code !== 'VAG');
  }

  async list(filters: { search?: string } = {}): Promise<TenantRole[]> {
    const requestTenantId = this.tenantDb.requireTenantId();
    const tenantId = this.resolveCatalogTenantId(requestTenantId);

    // Keep every entity's role catalog identical (definitions, not user assignments).
    await this.syncSharedRoleCatalog();
    await this.backfillEmptyLegacyPermissions(tenantId);

    const rows = await this.prisma.tenantRole.findMany({
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
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.toRole(row));
  }

  async getById(id: string): Promise<TenantRole> {
    const requestTenantId = this.tenantDb.requireTenantId();
    const tenantId = this.resolveCatalogTenantId(requestTenantId);
    await this.backfillEmptyLegacyPermissions(tenantId);

    // Prefer this tenant's copy; fall back to any peer copy of the same id
    // (legacy) or same name after catalog sync.
    let row = await this.prisma.tenantRole.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) {
      const any = await this.prisma.tenantRole.findFirst({
        where: { id, deletedAt: null },
      });
      if (any) {
        await this.syncSharedRoleCatalog();
        row = await this.prisma.tenantRole.findFirst({
          where: {
            tenantId,
            deletedAt: null,
            name: { equals: any.name, mode: 'insensitive' },
          },
        });
      }
    }
    if (!row) throw new NotFoundException('Role not found');
    return this.toRole(row);
  }

  async create(dto: CreateTenantRoleRequest): Promise<TenantRole> {
    const requestTenantId = this.tenantDb.requireTenantId();
    const tenantId = this.resolveCatalogTenantId(requestTenantId);
    await ensureOperatingTenant(this.prisma, tenantId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Role name is required');

    const clash = await this.prisma.tenantRole.findFirst({
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

    const row = await this.prisma.tenantRole.create({
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
    this.catalogSyncAt = 0; // force peers to pick up on next list
    void invalidateTenantDashboardCache(this.cache, tenantId);
    return this.toRole(row);
  }

  async update(id: string, dto: UpdateTenantRoleRequest): Promise<TenantRole> {
    const requestTenantId = this.tenantDb.requireTenantId();
    const tenantId = this.resolveCatalogTenantId(requestTenantId);
    let existing = await this.prisma.tenantRole.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      // Id may belong to a peer tenant after entity switch — resolve by syncing.
      const any = await this.prisma.tenantRole.findFirst({
        where: { id, deletedAt: null },
      });
      if (!any) throw new NotFoundException('Role not found');
      await this.syncSharedRoleCatalog();
      existing = await this.prisma.tenantRole.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          name: { equals: any.name, mode: 'insensitive' },
        },
      });
    }
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
      const clash = await this.prisma.tenantRole.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          name: { equals: name, mode: 'insensitive' },
          NOT: { id: existing.id },
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

    const row = await this.prisma.tenantRole.update({
      where: { id: existing.id },
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
    this.catalogSyncAt = 0;
    void invalidateTenantDashboardCache(this.cache, tenantId);
    return this.toRole(row);
  }

  async remove(id: string): Promise<void> {
    const requestTenantId = this.tenantDb.requireTenantId();
    const tenantId = this.resolveCatalogTenantId(requestTenantId);
    let existing = await this.prisma.tenantRole.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) {
      const any = await this.prisma.tenantRole.findFirst({
        where: { id, deletedAt: null },
      });
      if (!any) throw new NotFoundException('Role not found');
      await this.syncSharedRoleCatalog();
      existing = await this.prisma.tenantRole.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          name: { equals: any.name, mode: 'insensitive' },
        },
      });
    }
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.locked || existing.name.toLowerCase() === 'admin') {
      throw new BadRequestException(`“${existing.name}” cannot be deleted`);
    }

    await this.prisma.tenantRole.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    });
    await this.prisma.user.updateMany({
      where: { tenantRoleId: existing.id },
      data: { tenantRoleId: null },
    });
    await this.propagateRoleDeleteToOtherTenants({
      name: existing.name,
      sourceTenantId: tenantId,
    });
    this.catalogSyncAt = 0;
    void invalidateTenantDashboardCache(this.cache, tenantId);
  }

  /**
   * One-shot import for migrating browser localStorage roles into the DB.
   * Skips names that already exist (case-insensitive).
   */
  async importRoles(dto: ImportTenantRolesRequest): Promise<TenantRole[]> {
    const requestTenantId = this.tenantDb.requireTenantId();
    const tenantId = this.resolveCatalogTenantId(requestTenantId);
    await ensureOperatingTenant(this.prisma, tenantId);
    if (!Array.isArray(dto.roles) || dto.roles.length === 0) {
      throw new BadRequestException('roles array is required');
    }

    const existing = await this.prisma.tenantRole.findMany({
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
          const updated = await this.prisma.tenantRole.update({
            where: { id: match.id },
            data: {
              permissions:
                permissions.length > 0 ? permissions : match.permissions,
              isServiceStaff,
              locked: match.locked || locked,
            },
          });
          byName.set(name.toLowerCase(), updated);
          await this.propagateRoleToOtherTenants({
            name: updated.name,
            permissions: updated.permissions,
            isServiceStaff: updated.isServiceStaff,
            locked: updated.locked,
            sourceTenantId: tenantId,
          });
        }
        continue;
      }

      const row = await this.prisma.tenantRole.create({
        data: {
          tenantId,
          name,
          permissions,
          isServiceStaff,
          locked,
        },
      });
      byName.set(name.toLowerCase(), row);
      await this.propagateRoleToOtherTenants({
        name,
        permissions,
        isServiceStaff,
        locked,
        sourceTenantId: tenantId,
      });
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
    for (const tenant of this.operatingEntityTenants()) {
      if (tenant.id === args.sourceTenantId) continue;
      await ensureOperatingTenant(this.prisma, tenant.id);

      const existing = await this.prisma.tenantRole.findFirst({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          name: { equals: matchName, mode: 'insensitive' },
        },
      });

      if (existing) {
        if (existing.locked || existing.name.toLowerCase() === 'admin') {
          // Never overwrite locked Admin roles on peer tenants.
          continue;
        }
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

  /** Soft-delete matching role names on peer tenants (skips locked Admin). */
  private async propagateRoleDeleteToOtherTenants(args: {
    name: string;
    sourceTenantId: string;
  }): Promise<void> {
    const matchName = args.name.trim().toLowerCase();
    if (!matchName || matchName === 'admin') return;

    for (const tenant of this.operatingEntityTenants()) {
      if (tenant.id === args.sourceTenantId) continue;

      const peers = await this.prisma.tenantRole.findMany({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          name: { equals: matchName, mode: 'insensitive' },
        },
        select: { id: true, locked: true, name: true },
      });
      for (const peer of peers) {
        if (peer.locked || peer.name.toLowerCase() === 'admin') continue;
        await this.prisma.tenantRole.update({
          where: { id: peer.id },
          data: { deletedAt: new Date() },
        });
        await this.prisma.user.updateMany({
          where: { tenantRoleId: peer.id },
          data: { tenantRoleId: null },
        });
      }
      void invalidateTenantDashboardCache(this.cache, tenant.id);
    }
  }

  private catalogSyncAt = 0;

  /**
   * Ensure every operating entity has the same role *definitions* (by name).
   * Canonical copy = newest updatedAt for that name. Does not move users.
   * Debounced so Roles list stays snappy across rapid navigations.
   */
  private async syncSharedRoleCatalog(): Promise<void> {
    const now = Date.now();
    if (now - this.catalogSyncAt < 30_000) return;
    this.catalogSyncAt = now;

    const entities = this.operatingEntityTenants();
    for (const tenant of entities) {
      await this.ensureDefaults(tenant.id);
    }

    const all = await this.prisma.tenantRole.findMany({
      where: {
        deletedAt: null,
        tenantId: { in: entities.map((t) => t.id) },
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        permissions: true,
        isServiceStaff: true,
        locked: true,
        updatedAt: true,
      },
    });

    type Canon = (typeof all)[number];
    const byName = new Map<string, Canon>();
    for (const row of all) {
      const key = row.name.trim().toLowerCase();
      const prev = byName.get(key);
      if (!prev || row.updatedAt > prev.updatedAt) {
        byName.set(key, row);
      }
    }

    for (const tenant of entities) {
      const existing = all.filter((r) => r.tenantId === tenant.id);
      const existingByName = new Map(
        existing.map((r) => [r.name.trim().toLowerCase(), r] as const),
      );

      for (const [key, canon] of byName) {
        const local = existingByName.get(key);
        if (!local) {
          await this.prisma.tenantRole.create({
            data: {
              tenantId: tenant.id,
              name: canon.name,
              permissions: canon.permissions,
              isServiceStaff: canon.isServiceStaff,
              locked: canon.locked,
            },
          });
          continue;
        }
        if (local.locked || local.name.toLowerCase() === 'admin') continue;
        if (local.id === canon.id) continue;

        const samePerms =
          local.permissions.length === canon.permissions.length &&
          local.permissions.every((p, i) => p === canon.permissions[i]);
        if (
          samePerms &&
          local.isServiceStaff === canon.isServiceStaff &&
          local.name === canon.name &&
          local.locked === canon.locked
        ) {
          continue;
        }

        await this.prisma.tenantRole.update({
          where: { id: local.id },
          data: {
            name: canon.name,
            permissions: canon.permissions,
            isServiceStaff: canon.isServiceStaff,
            locked: canon.locked || local.locked,
          },
        });
      }
    }
  }

  /**
   * Ensure every operating entity (VA, VP, VW, …) has the full HQ6 role catalog.
   * Skips VAG (no entity-scoped job roles). Idempotent — only inserts missing names.
   */
  async ensureDefaultsForAllOperatingTenants(): Promise<void> {
    for (const tenant of this.operatingEntityTenants()) {
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
      let permissions = legacy?.permissions ?? [];
      if (permissions.length === 0 && isHrRoleName(row.name)) {
        permissions = [...HR_ROLE_DEFAULT_PERMISSIONS];
      }
      if (permissions.length === 0) continue;
      await this.prisma.tenantRole.update({
        where: { id: row.id },
        data: {
          permissions,
          isServiceStaff:
            Boolean(legacy?.isServiceStaff) ||
            permissions.includes('is_service_staff'),
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
