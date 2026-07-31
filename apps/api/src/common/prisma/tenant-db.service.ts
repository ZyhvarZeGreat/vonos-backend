import { BadRequestException, Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../decorators/roles.decorator';
import {
  assertBusinessLocation,
  assertProductStockLocation,
} from '../utils/businessLocation';
import { PrismaService, type TenantScopedPrisma } from './prisma.service';

type VonosRequest = Request & {
  user?: AuthenticatedUser;
  tenantScope?: string | null;
};

@Injectable({ scope: Scope.REQUEST })
export class TenantDbService {
  private client: TenantScopedPrisma | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: VonosRequest,
  ) {}

  get db(): TenantScopedPrisma {
    if (!this.client) {
      this.client = this.prisma.forTenant(this.resolveTenantId());
    }
    return this.client;
  }

  /** Tenant id for writes and explicit filters (null only for unscoped super-admin). */
  resolveTenantId(): string | null {
    if (this.request.tenantScope !== undefined) {
      return this.request.tenantScope;
    }
    return this.request.user?.tenantId ?? null;
  }

  requireTenantId(): string {
    const tenantId = this.resolveTenantId();
    if (!tenantId) {
      throw new BadRequestException(
        'Tenant context required. Super admins must send X-Viewing-Tenant header.',
      );
    }
    return tenantId;
  }

  getAuthUserId(): string | null {
    return this.request.user?.sub ?? null;
  }

  async resolveBusinessLocation(
    locationCode?: string | null,
  ): Promise<string | null> {
    const tenantId = this.requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { code: true, config: true },
    });
    const config = {
      ...((tenant?.config as object | null) ?? {}),
      code: tenant?.code,
    };
    return assertBusinessLocation(config, locationCode);
  }

  /**
   * Loads the tenant config once and returns a synchronous validator so callers
   * can validate many location codes (e.g. per-location stock rows) without
   * issuing a DB query per row.
   */
  async businessLocationValidator(): Promise<
    (locationCode?: string | null) => string | null
  > {
    const tenantId = this.requireTenantId();
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { code: true, config: true },
    });
    const config = {
      ...((tenant?.config as object | null) ?? {}),
      code: tenant?.code,
    };
    return (locationCode?: string | null) =>
      assertProductStockLocation(config, locationCode);
  }
}
