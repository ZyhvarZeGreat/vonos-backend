import { Injectable, NotFoundException } from '@nestjs/common';
import type { Item, ItemFilters } from '@vonos/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { CacheService } from '../../common/cache/cache.service';
import { buildCompositeCursorQuery } from '../../common/utils/pagination';
import { resolveListSort } from '../../common/utils/listSort';
import type { PaginatedList } from '../../common/utils/paginatedList';
import {
  listPageFilterKey,
  withListPageCache,
} from '../../common/utils/listPageCache';
import {
  breakdownFromOnHand,
  reservedQtyBySku,
} from '../../common/utils/availableStock';
import { serializeItem } from '../items/items.mapper';
import { applyLastPurchasePrices } from '../../common/utils/lastPurchasePrices';
import {
  relationStringOr,
  tokenizedSearchWhere,
} from '../../common/utils/listSearch';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDb: TenantDbService,
    private readonly cache: CacheService,
  ) {}

  /** Spare Shop catalog = local retail items + Warehouse (VW) items flagged for retail. */
  private async catalogTenantIds(requestTenantId: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: requestTenantId },
      select: { code: true },
    });
    // VA / VW / cafe / etc. — own tenant only. Skip extra VW lookup.
    if (tenant?.code !== 'VISP' && tenant?.code !== 'VSP') {
      return [requestTenantId];
    }
    const ids = new Set<string>([requestTenantId]);
    const warehouse = await this.prisma.tenant.findUnique({
      where: { code: 'VW' },
      select: { id: true },
    });
    if (warehouse) ids.add(warehouse.id);
    return [...ids];
  }

  private async withAvailableQuantity(rows: Item[]): Promise<Item[]> {
    if (rows.length === 0) return rows;

    const byTenant = new Map<string, string[]>();
    for (const row of rows) {
      const list = byTenant.get(row.tenantId) ?? [];
      list.push(row.sku);
      byTenant.set(row.tenantId, list);
    }

    const reservedByTenant = new Map<string, Map<string, number>>();
    for (const [tenantId, skus] of byTenant) {
      reservedByTenant.set(
        tenantId,
        await reservedQtyBySku(this.prisma, tenantId, [...new Set(skus)]),
      );
    }

    return rows.map((row) => {
      const reserved =
        reservedByTenant.get(row.tenantId)?.get(row.sku.toUpperCase()) ?? 0;
      const { available } = breakdownFromOnHand(row.quantity, reserved);
      return { ...row, availableQuantity: available };
    });
  }

  private catalogBaseWhere(
    requestTenantId: string,
    tenantIds: string[],
    filters: ItemFilters,
  ) {
    return {
      tenantId: { in: tenantIds },
      deletedAt: null,
      OR: [
        { tenantId: requestTenantId },
        { availableForRetail: true },
      ],
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.unit
        ? { unit: { equals: filters.unit, mode: 'insensitive' as const } }
        : {}),
      ...(filters.brandName
        ? {
            brand: {
              name: {
                equals: filters.brandName,
                mode: 'insensitive' as const,
              },
            },
          }
        : {}),
      ...(filters.availableForRetail !== undefined
        ? { availableForRetail: filters.availableForRetail }
        : {}),
      ...(filters.locationCode || filters.search
        ? {
            AND: [
              ...(filters.locationCode
                ? [
                    {
                      OR: [
                        { locationCode: filters.locationCode },
                        { binLocation: filters.locationCode },
                        {
                          locationStock: {
                            some: {
                              OR: [
                                { locationCode: filters.locationCode },
                                { binLocation: filters.locationCode },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  ]
                : []),
              ...(filters.search
                ? [
                    tokenizedSearchWhere(filters.search, (token, contains) => [
                      { name: contains },
                      { sku: contains },
                      { category: contains },
                      { subCategory: contains },
                      { carModel: contains },
                      { description: contains },
                      { unit: contains },
                      { binLocation: contains },
                      { locationCode: contains },
                      relationStringOr('brand', 'name', contains),
                    ])!,
                  ]
                : []),
            ],
          }
        : {}),
    };
  }

  async list(filters: ItemFilters): Promise<PaginatedList<Item>> {
    const requestTenantId = this.tenantDb.requireTenantId();
    const filterKey = listPageFilterKey({
      search: filters.search,
      status: filters.status,
      category: filters.category,
      locationCode: filters.locationCode,
      unit: filters.unit,
      brandName: filters.brandName,
      availableForRetail:
        filters.availableForRetail === undefined
          ? ''
          : filters.availableForRetail
            ? 1
            : 0,
      cursor: filters.cursor,
      limit: filters.limit ?? 10,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
      sum: filters.includeSummary === false ? 0 : 1,
    });

    return withListPageCache(
      this.cache,
      requestTenantId,
      'catalog',
      filterKey,
      () => this.listUncached(filters, requestTenantId),
    );
  }

  private async listUncached(
    filters: ItemFilters,
    requestTenantId: string,
  ): Promise<PaginatedList<Item>> {
    const tenantIds = await this.catalogTenantIds(requestTenantId);
    const limit = filters.limit ?? 10;
    const includeSummary = filters.includeSummary !== false;

    const sort = resolveListSort(
      filters.sortBy,
      filters.sortDir,
      {
        name: { field: 'name', type: 'string' },
        sku: { field: 'sku', type: 'string' },
        quantity: { field: 'quantity', type: 'number' },
        costPrice: { field: 'costPrice', type: 'number' },
        sellPrice: { field: 'sellPrice', type: 'number' },
        sellingPrice: { field: 'sellPrice', type: 'number' },
        createdAt: { field: 'createdAt', type: 'date' },
        category: { field: 'category', type: 'string' },
        status: { field: 'status', type: 'string' },
      },
      {
        sortField: 'name',
        sortDir: 'asc',
        sortValueType: 'string',
      },
    );

    // Own-tenant items always appear. Cross-tenant (VW → VISP/VSP) stock
    // requires availableForRetail so warehouse can gate what retail sees.
    const pagination = buildCompositeCursorQuery({
      sortField: sort.sortField,
      sortDir: sort.sortDir,
      cursor: filters.cursor,
      limit,
      sortValueType: sort.sortValueType,
    });
    const baseWhere = this.catalogBaseWhere(
      requestTenantId,
      tenantIds,
      filters,
    );

    // Summary-only (limit=1 from deferred count) — skip heavy row mapping.
    if (includeSummary && limit <= 1 && !filters.cursor) {
      const totalCount = await this.prisma.item.count({ where: baseWhere });
      return { items: [], totalCount };
    }

    const [rows, totalCount] = await Promise.all([
      this.prisma.item.findMany({
        where: {
          ...baseWhere,
          ...(pagination.where ?? {}),
        },
        include: { brand: { select: { name: true } } },
        orderBy: [
          { [sort.sortField]: sort.sortDir },
          { id: sort.sortDir },
        ],
        take: pagination.take,
      }),
      includeSummary
        ? this.prisma.item.count({ where: baseWhere })
        : Promise.resolve(undefined as number | undefined),
    ]);

    const items = await applyLastPurchasePrices(
      this.prisma,
      requestTenantId,
      rows.map(serializeItem),
    );
    // List UIs use on-hand `quantity` (HQ6 Current Stock). Skip the
    // Approved-requisition JSONB scan — it dominated page-flip latency.
    // Detail/getById still computes availableQuantity.

    if (!includeSummary || totalCount == null) {
      return { items };
    }

    return { items, totalCount };
  }

  async getById(id: string): Promise<Item> {
    const requestTenantId = this.tenantDb.requireTenantId();
    const tenantIds = await this.catalogTenantIds(requestTenantId);

    const row = await this.prisma.item.findFirst({
      where: {
        id,
        tenantId: { in: tenantIds },
        deletedAt: null,
        OR: [
          { tenantId: requestTenantId },
          { availableForRetail: true },
        ],
      },
    });
    if (!row) throw new NotFoundException('Catalog item not found');
    const [withAvailable] = await this.withAvailableQuantity([
      serializeItem(row),
    ]);
    return withAvailable!;
  }
}
