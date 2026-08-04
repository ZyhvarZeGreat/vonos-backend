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
  HQ6_LIST_WARM_LIMITS,
  hq6WarmSorts,
} from '../../common/utils/hq6ListWarm';
import {
  breakdownFromOnHand,
  reservedQtyBySku,
} from '../../common/utils/availableStock';
import { serializeItem } from '../items/items.mapper';
import { applyLastPurchasePrices } from '../../common/utils/lastPurchasePrices';
import {
  itemTextSearchWhere,
  relationStringOr,
} from '../../common/utils/listSearch';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDb: TenantDbService,
    private readonly cache: CacheService,
  ) {}

  /**
   * VISP/VSP share Warehouse (VW) retail stock — one catalog, not local copies.
   * Local VISP/VSP Item rows are migration duplicates of the same SKUs; the old
   * "local ∪ VW" OR made every product appear twice (~8.9k vs ~4.3k).
   */
  private async catalogScope(requestTenantId: string): Promise<{
    tenantIds: string[];
    sharedRetailOnly: boolean;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: requestTenantId },
      select: { code: true },
    });
    if (tenant?.code !== 'VISP' && tenant?.code !== 'VSP') {
      return { tenantIds: [requestTenantId], sharedRetailOnly: false };
    }
    const warehouse = await this.prisma.tenant.findUnique({
      where: { code: 'VW' },
      select: { id: true },
    });
    if (!warehouse) {
      return { tenantIds: [requestTenantId], sharedRetailOnly: false };
    }
    return { tenantIds: [warehouse.id], sharedRetailOnly: true };
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
    tenantIds: string[],
    filters: ItemFilters,
    sharedRetailOnly: boolean,
  ) {
    return {
      tenantId: { in: tenantIds },
      deletedAt: null,
      ...(sharedRetailOnly ? { availableForRetail: true } : {}),
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
      ...(filters.availableForRetail !== undefined && !sharedRetailOnly
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
                    // Prefer indexed name/sku (btree + trigram); brand/carModel only on fuzzy path.
                    itemTextSearchWhere(filters.search, {
                      extraFuzzyFields: (_token, contains) => [
                        { carModel: contains },
                        { category: contains },
                        relationStringOr('brand', 'name', contains),
                      ],
                    })!,
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
      'catalog:v2',
      filterKey,
      () => this.listUncached(filters, requestTenantId),
    );
  }

  private async listUncached(
    filters: ItemFilters,
    requestTenantId: string,
  ): Promise<PaginatedList<Item>> {
    const { tenantIds, sharedRetailOnly } =
      await this.catalogScope(requestTenantId);
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

    const pagination = buildCompositeCursorQuery({
      sortField: sort.sortField,
      sortDir: sort.sortDir,
      cursor: filters.cursor,
      limit,
      sortValueType: sort.sortValueType,
    });
    const baseWhere = this.catalogBaseWhere(
      tenantIds,
      filters,
      sharedRetailOnly,
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
    const { tenantIds, sharedRetailOnly } =
      await this.catalogScope(requestTenantId);

    const row = await this.prisma.item.findFirst({
      where: {
        id,
        tenantId: { in: tenantIds },
        deletedAt: null,
        ...(sharedRetailOnly ? { availableForRetail: true } : {}),
      },
    });
    if (!row) throw new NotFoundException('Catalog item not found');
    const [withAvailable] = await this.withAvailableQuantity([
      serializeItem(row),
    ]);
    return withAvailable!;
  }
}

/** Boot/cron: seed HQ6 products list (catalog resource, name/asc, limit 25). */
export async function warmDefaultCatalogListPages(
  prisma: import('@prisma/client').PrismaClient,
  cache: CacheService,
  tenantId: string,
): Promise<void> {

  for (const limit of HQ6_LIST_WARM_LIMITS) {
    for (const sort of hq6WarmSorts({ sortBy: 'name', sortDir: 'asc' })) {
      for (const includeSummary of [false, true] as const) {
        const filterKey = listPageFilterKey({
          search: undefined,
          status: undefined,
          category: undefined,
          locationCode: undefined,
          unit: undefined,
          brandName: undefined,
          availableForRetail: '',
          cursor: undefined,
          limit,
          sortBy: sort.sortBy,
          sortDir: sort.sortDir,
          sum: includeSummary ? 1 : 0,
        });
        await withListPageCache(
          cache,
          tenantId,
          'catalog:v2',
          filterKey,
          async () => {
            const tenant = await prisma.tenant.findUnique({
              where: { id: tenantId },
              select: { code: true },
            });
            let scopeTenantId = tenantId;
            let sharedRetailOnly = false;
            if (tenant?.code === 'VISP' || tenant?.code === 'VSP') {
              const warehouse = await prisma.tenant.findUnique({
                where: { code: 'VW' },
                select: { id: true },
              });
              if (warehouse) {
                scopeTenantId = warehouse.id;
                sharedRetailOnly = true;
              }
            }
            const baseWhere = {
              tenantId: scopeTenantId,
              deletedAt: null as null,
              ...(sharedRetailOnly ? { availableForRetail: true } : {}),
            };
            const [rows, totalCount] = await Promise.all([
              prisma.item.findMany({
                where: baseWhere,
                include: { brand: { select: { name: true } } },
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
                take: limit,
              }),
              includeSummary
                ? prisma.item.count({ where: baseWhere })
                : Promise.resolve(undefined as number | undefined),
            ]);
            const items = await applyLastPurchasePrices(
              prisma,
              tenantId,
              rows.map(serializeItem),
            );
            if (!includeSummary || totalCount == null) {
              return { items };
            }
            return { items, totalCount };
          },
          600,
        );
      }
    }
  }
}
