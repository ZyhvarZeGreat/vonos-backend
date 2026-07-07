import { Injectable, NotFoundException } from '@nestjs/common';
import type { CustomerGroup, CreateCustomerGroupRequest } from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { buildCursorQuery } from '../../common/utils/pagination';
import { toIso, toNumber } from '../../common/utils/serializers';

@Injectable()
export class CustomerGroupsService {
  constructor(private readonly tenantDb: TenantDbService) {}

  async list(filters: {
    cursor?: string;
    limit?: number;
    search?: string;
  } = {}): Promise<CustomerGroup[]> {
    const rows = await this.tenantDb.db.customerGroup.findMany({
      where: {
        tenantId: this.tenantDb.requireTenantId(),
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...buildCursorQuery(filters.cursor, filters.limit ?? 25),
    });
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      discountPercent: toNumber(row.discountPercent),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
  }

  async create(dto: CreateCustomerGroupRequest): Promise<CustomerGroup> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.customerGroup.create({
      data: {
        tenantId,
        name: dto.name,
        discountPercent: dto.discountPercent ?? 0,
      },
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      discountPercent: toNumber(row.discountPercent),
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  async remove(id: string): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.customerGroup.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Customer group not found');
    await this.tenantDb.db.customerGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
