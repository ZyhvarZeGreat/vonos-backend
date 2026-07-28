import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InviteUserResponse, User } from '@vonos/types';
import { ROLES } from '@vonos/types';
import type { AuthenticatedUser } from '../../common/decorators/roles.decorator';
import { generateOpaqueToken } from '../../common/utils/auth-token';
import { buildCompositeCursorQuery } from '../../common/utils/pagination';
import {
  listPageFilterKey,
  withListPageCache,
} from '../../common/utils/listPageCache';
import { devPasswordHash, hashPassword } from '../../common/utils/password';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { invalidateTenantDashboardCache } from '../../common/cache/cacheInvalidation';
import { toIso } from '../../common/utils/serializers';
import { resolvePrimaryWebOrigin } from '../../common/utils/webOrigin';
import { AuthMailService } from '../auth/auth-mail.service';
import { INVITE_DAYS } from '../auth/auth.constants';
import {
  relationStringOr,
  tokenizedSearchWhere,
} from '../../common/utils/listSearch';

/** Synthetic scope for unscoped VAG all-tenants user list cache. */
const VAG_USERS_CACHE_SCOPE = '__vag__';

export interface UserListRow extends User {
  tenantCode?: string | null;
  tenantName?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly mail: AuthMailService,
    private readonly cache: CacheService,
  ) {}

  private invalidateUserCaches(tenantId: string | null): void {
    void invalidateTenantDashboardCache(this.cache, VAG_USERS_CACHE_SCOPE);
    if (tenantId) {
      void invalidateTenantDashboardCache(this.cache, tenantId);
    }
  }

  async listForTenant(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  } = {}): Promise<User[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const filterKey = listPageFilterKey({
      search: filters.search,
      role: filters.role,
      status: filters.status,
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
    });
    return withListPageCache(
      this.cache,
      tenantId,
      'users',
      filterKey,
      () => this.listForTenantUncached(filters, tenantId),
    );
  }

  private async listForTenantUncached(
    filters: {
      cursor?: string;
      limit?: number;
      search?: string;
      role?: string;
      status?: string;
    },
    tenantId: string,
  ): Promise<User[]> {
    const legacyLinks = await this.prisma.migrationLegacyId.findMany({
      where: { tenantId, entityType: 'user' },
      select: { newId: true },
    });
    const legacyUserIds = legacyLinks.map((link) => link.newId);

    const pagination = buildCompositeCursorQuery({
      sortField: 'name',
      sortDir: 'asc',
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: 'string',
    });
    const rows = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(filters.role ? { role: filters.role as User['role'] } : {}),
        ...(filters.status ? { status: filters.status as User['status'] } : {}),
        AND: [
          {
            OR: [
              { tenantId },
              ...(legacyUserIds.length > 0
                ? [{ id: { in: legacyUserIds } }]
                : []),
            ],
          },
          ...(filters.search
            ? [
                tokenizedSearchWhere(filters.search, (_token, contains) => [
                  { name: contains },
                  { email: contains },
                ])!,
              ]
            : []),
        ],
        ...(pagination.where ?? {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: pagination.take,
    });

    return rows.map((row) => this.toUser(row));
  }

  /**
   * Single user for detail pages — tenant-scoped, including legacy-linked users.
   */
  async getById(id: string): Promise<User> {
    const tenantId = this.tenantDb.requireTenantId();
    const legacyLink = await this.prisma.migrationLegacyId.findFirst({
      where: { tenantId, entityType: 'user', newId: id },
      select: { newId: true },
    });

    const row = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { tenantId },
          ...(legacyLink ? [{ id }] : []),
        ],
      },
    });
    if (!row) throw new NotFoundException('User not found');
    if (row.tenantId !== tenantId && !legacyLink) {
      throw new NotFoundException('User not found');
    }
    return this.toUser(row);
  }

  async listAllTenants(
    requestRole: string,
    filters: {
      cursor?: string;
      limit?: number;
      search?: string;
      role?: string;
      status?: string;
    } = {},
  ): Promise<UserListRow[]> {
    if (requestRole !== 'super_admin') {
      throw new ForbiddenException('Super admin access required');
    }

    const filterKey = listPageFilterKey({
      search: filters.search,
      role: filters.role,
      status: filters.status,
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
    });
    return withListPageCache(
      this.cache,
      VAG_USERS_CACHE_SCOPE,
      'users-all',
      filterKey,
      () => this.listAllTenantsUncached(filters),
    );
  }

  private async listAllTenantsUncached(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<UserListRow[]> {
    const pagination = buildCompositeCursorQuery({
      sortField: 'name',
      sortDir: 'asc',
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortValueType: 'string',
    });
    const rows = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(filters.role ? { role: filters.role as User['role'] } : {}),
        ...(filters.status ? { status: filters.status as User['status'] } : {}),
        ...(filters.search
          ? tokenizedSearchWhere(filters.search, (_token, contains) => [
              { name: contains },
              { email: contains },
              relationStringOr('tenant', 'name', contains),
              relationStringOr('tenant', 'code', contains),
            ])
          : {}),
        ...(pagination.where ?? {}),
      },
      include: { tenant: { select: { code: true, name: true } } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: pagination.take,
    });

    const unscopedIds = rows
      .filter((row) => row.tenantId === null)
      .map((row) => row.id);
    const legacyOrigins =
      unscopedIds.length > 0
        ? await this.prisma.migrationLegacyId.findMany({
            where: { entityType: 'user', newId: { in: unscopedIds } },
            include: { tenant: { select: { code: true, name: true } } },
          })
        : [];
    const homeTenantByUserId = new Map(
      legacyOrigins.map((link) => [link.newId, link.tenant]),
    );

    return rows.map((row) => {
      const homeTenant = row.tenant ?? homeTenantByUserId.get(row.id) ?? null;
      const isGroupOnly =
        row.tenantId === null && row.role === 'super_admin' && !homeTenant;

      return {
        ...this.toUser(row),
        tenantCode: homeTenant?.code ?? (isGroupOnly ? 'VAG' : null),
        tenantName:
          homeTenant?.name ?? (isGroupOnly ? 'Vonos Autos Group' : null),
      };
    });
  }

  async inviteUser(
    actor: AuthenticatedUser,
    body: {
      email: string;
      name: string;
      role: User['role'];
      tenantId?: string | null;
    },
  ): Promise<InviteUserResponse> {
    const assignment = await this.resolveUserAssignment(actor, body);

    const existing = await this.prisma.user.findFirst({
      where: {
        email: { equals: assignment.email, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const { raw, hash } = generateOpaqueToken();
    const user = await this.prisma.user.create({
      data: {
        email: assignment.email,
        name: assignment.name,
        role: assignment.role,
        status: 'invited',
        tenantId: assignment.targetTenantId,
        passwordHash: devPasswordHash('invite-placeholder-not-for-login'),
      },
    });

    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        type: 'invite',
        tokenHash: hash,
        expiresAt: this.daysFromNow(INVITE_DAYS),
      },
    });

    const webOrigin = resolvePrimaryWebOrigin();
    const inviteUrl = `${webOrigin}/invite/${raw}`;
    this.mail.sendInvite(assignment.email, inviteUrl);

    this.invalidateUserCaches(assignment.targetTenantId);

    const response: InviteUserResponse = { user: this.toUser(user) };
    if (process.env.NODE_ENV !== 'production') {
      response.devInviteUrl = inviteUrl;
    }
    return response;
  }

  async createUser(
    actor: AuthenticatedUser,
    body: {
      email: string;
      name: string;
      role: User['role'];
      password: string;
      tenantId?: string | null;
    },
  ): Promise<{ user: User }> {
    const assignment = await this.resolveUserAssignment(actor, body);

    if (!body.password || body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        email: { equals: assignment.email, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await hashPassword(body.password);
    const user = await this.prisma.user.create({
      data: {
        email: assignment.email,
        name: assignment.name,
        role: assignment.role,
        status: 'active',
        tenantId: assignment.targetTenantId,
        passwordHash,
      },
    });

    this.invalidateUserCaches(assignment.targetTenantId);
    return { user: this.toUser(user) };
  }

  async updateUser(
    actor: AuthenticatedUser,
    id: string,
    body: {
      email?: string;
      name?: string;
      role?: User['role'];
      status?: User['status'];
      password?: string;
    },
  ): Promise<{ user: User }> {
    const row = await this.findManagedUser(actor, id);

    const data: {
      email?: string;
      name?: string;
      role?: User['role'];
      status?: User['status'];
      passwordHash?: string;
      tokenVersion?: { increment: number };
    } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException('Name is required');
      data.name = name;
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      if (!email) throw new BadRequestException('Email is required');
      const clash = await this.prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
          deletedAt: null,
          NOT: { id: row.id },
        },
      });
      if (clash) {
        throw new ConflictException('A user with this email already exists');
      }
      data.email = email;
    }

    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) {
        throw new BadRequestException('Invalid role');
      }
      if (actor.role === 'admin') {
        const allowed: User['role'][] = ['manager', 'staff', 'viewer'];
        if (!allowed.includes(body.role)) {
          throw new ForbiddenException('Cannot assign this role');
        }
      }
      if (body.role === 'super_admin' && row.tenantId !== null) {
        throw new BadRequestException(
          'Super admin role requires a VAG (unscoped) user',
        );
      }
      data.role = body.role;
    }

    if (body.status !== undefined) {
      if (!['active', 'suspended', 'invited'].includes(body.status)) {
        throw new BadRequestException('Invalid status');
      }
      data.status = body.status;
    }

    if (body.password !== undefined && body.password.length > 0) {
      if (body.password.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters');
      }
      data.passwordHash = await hashPassword(body.password);
      data.tokenVersion = { increment: 1 };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.prisma.user.update({
      where: { id: row.id },
      data,
    });
    this.invalidateUserCaches(row.tenantId);
    return { user: this.toUser(updated) };
  }

  async updateUserStatus(
    actor: AuthenticatedUser,
    id: string,
    status: 'active' | 'suspended',
  ): Promise<{ user: User }> {
    return this.updateUser(actor, id, { status });
  }

  async deactivateUser(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<{ user: User }> {
    const row = await this.findManagedUser(actor, id);
    if (row.id === actor.sub) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    const updated = await this.prisma.user.update({
      where: { id: row.id },
      data: {
        status: 'suspended',
        deletedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });
    this.invalidateUserCaches(row.tenantId);
    return { user: this.toUser(updated) };
  }

  private async findManagedUser(actor: AuthenticatedUser, id: string) {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) {
      throw new NotFoundException('User not found');
    }
    if (actor.role === 'admin') {
      const tenantId = this.tenantDb.requireTenantId();
      if (row.tenantId !== tenantId) {
        throw new ForbiddenException('Cannot manage users outside your entity');
      }
    }
    return row;
  }

  private async resolveUserAssignment(
    actor: AuthenticatedUser,
    body: {
      email: string;
      name: string;
      role: User['role'];
      tenantId?: string | null;
    },
  ): Promise<{
    email: string;
    name: string;
    role: User['role'];
    targetTenantId: string | null;
  }> {
    if (actor.role !== 'admin' && actor.role !== 'super_admin') {
      throw new ForbiddenException('Only admins can manage users');
    }

    const email = body.email.trim().toLowerCase();
    const name = body.name.trim();
    if (!email || !name) {
      throw new BadRequestException('Email and name are required');
    }
    if (!ROLES.includes(body.role)) {
      throw new BadRequestException('Invalid role');
    }

    const adminInvitable: User['role'][] = ['manager', 'staff', 'viewer'];
    const superInvitable: User['role'][] = [
      'admin',
      'manager',
      'staff',
      'viewer',
      'super_admin',
    ];

    let targetTenantId: string | null;

    if (actor.role === 'super_admin') {
      if (!superInvitable.includes(body.role)) {
        throw new BadRequestException('Invalid role');
      }
      if (body.role === 'super_admin') {
        targetTenantId = null;
      } else if (body.tenantId) {
        targetTenantId = body.tenantId;
      } else {
        targetTenantId = this.tenantDb.resolveTenantId();
      }
    } else {
      if (!adminInvitable.includes(body.role)) {
        throw new ForbiddenException(
          'Admins can only add manager, staff, or viewer',
        );
      }
      targetTenantId = this.tenantDb.requireTenantId();
    }

    if (body.role !== 'super_admin' && !targetTenantId) {
      throw new BadRequestException(
        'Entity is required. Select an entity or open Users from that entity.',
      );
    }
    if (body.role === 'super_admin' && targetTenantId !== null) {
      throw new BadRequestException(
        'Super admin users cannot belong to an entity',
      );
    }

    if (targetTenantId) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: targetTenantId, deletedAt: null },
      });
      if (!tenant) {
        throw new BadRequestException('Entity not found');
      }
    }

    return { email, name, role: body.role, targetTenantId };
  }

  private toUser(row: {
    id: string;
    email: string;
    name: string;
    role: User['role'];
    status: User['status'];
    tenantId: string | null;
    createdAt: Date;
    lastLoginAt: Date | null;
  }): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: row.status,
      tenantId: row.tenantId,
      createdAt: toIso(row.createdAt),
      lastLoginAt: row.lastLoginAt ? toIso(row.lastLoginAt) : null,
    };
  }

  private daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
