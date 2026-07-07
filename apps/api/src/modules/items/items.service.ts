import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Item,
  ItemFilters,
  ItemLocationStockInput,
  KpiSummary,
  StockAvailabilityResult,
  StockStatus,
} from '@vonos/types';
import { AUTOS_GROUP_CODES, isAutosGroupCode } from '@vonos/types';
import { Prisma } from '@prisma/client';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { buildCursorQuery } from '../../common/utils/pagination';
import { toNumber } from '../../common/utils/serializers';
import { serializeItem } from './items.mapper';

interface CreateItemDto {
  sku: string;
  name: string;
  category?: string;
  quantity?: number;
  binLocation?: string;
  locationCode?: string;
  reorderPoint?: number;
  costPrice: number;
  currency?: string;
  status?: StockStatus;
  availableForRetail?: boolean;
  locationStock?: ItemLocationStockInput[];
}

type UpdateItemDto = Partial<CreateItemDto>;

interface NormalizedLocationRow {
  locationCode: string;
  binLocation: string;
  quantity: number;
}

/** Derive stock status from quantity + reorder point unless explicitly provided. */
function deriveStatus(
  quantity: number,
  reorderPoint: number | null | undefined,
  explicit?: StockStatus,
): StockStatus {
  if (explicit) return explicit;
  if (quantity <= 0) return 'out_of_stock';
  if (reorderPoint != null && quantity <= reorderPoint) return 'low_stock';
  return 'in_stock';
}

/**
 * Merge per-location input into unique (locationCode + binLocation) rows,
 * summing quantities and validating each location against tenant config.
 */
function normalizeLocationRows(
  input: ItemLocationStockInput[],
  validate: (locationCode?: string | null) => string | null,
): NormalizedLocationRow[] {
  const merged = new Map<string, NormalizedLocationRow>();
  for (const raw of input) {
    const locationCode = validate(raw.locationCode);
    if (!locationCode) continue;
    const binLocation = raw.binLocation?.trim() || '';
    const quantity = Number.isFinite(raw.quantity) ? Math.trunc(raw.quantity) : 0;
    const key = `${locationCode}::${binLocation}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      merged.set(key, { locationCode, binLocation, quantity });
    }
  }
  return Array.from(merged.values());
}

@Injectable()
export class ItemsService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cache: CacheService,
  ) {}

  private async invalidateItemCaches(): Promise<void> {
    const tenantId = this.tenantDb.requireTenantId();
    await Promise.all([
      this.cache.invalidatePrefix(`entity-overview:${tenantId}`),
      this.cache.invalidatePrefix(`report-dash:${tenantId}`),
      this.cache.invalidatePrefix('group-overview:'),
      this.cache.invalidatePrefix('report-group:'),
    ]);
  }

  async list(
    filters: ItemFilters & { availableForRetail?: boolean },
  ): Promise<Item[]> {
    const tenantId = this.tenantDb.requireTenantId();
    const db = this.tenantDb.db;
    const limit = filters.limit ?? 50;

    const rows = await db.item.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.availableForRetail !== undefined
          ? { availableForRetail: filters.availableForRetail }
          : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
                { category: { contains: filters.search, mode: 'insensitive' } },
                { binLocation: { contains: filters.search, mode: 'insensitive' } },
                { locationCode: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(filters.locationCode
          ? {
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
            }
          : {}),
      },
      orderBy: { id: 'asc' },
      include: { locationStock: true },
      ...buildCursorQuery(filters.cursor, limit),
    });

    return rows.map(serializeItem);
  }

  async getById(id: string): Promise<Item> {
    const tenantId = this.tenantDb.requireTenantId();
    const row = await this.tenantDb.db.item.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { locationStock: true },
    });
    if (!row) throw new NotFoundException('Item not found');
    return serializeItem(row);
  }

  async kpiSummary(): Promise<KpiSummary> {
    const tenantId = this.tenantDb.requireTenantId();
    const cacheKey = `kpi-summary:${tenantId}`;
    const cached = await this.cache.get<KpiSummary>(cacheKey);
    if (cached) return cached;

    const db = this.tenantDb.db;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const itemWhere = { tenantId, deletedAt: null };

    const [totalSku, stockValueRows, currencyRow, todayInbound, todayOutbound] =
      await Promise.all([
        db.item.count({ where: itemWhere }),
        db.$queryRaw<[{ stock_value: Prisma.Decimal | null }]>`
        SELECT COALESCE(SUM(quantity * "costPrice"), 0) AS stock_value
        FROM "Item"
        WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
      `,
        db.item.findFirst({
          where: itemWhere,
          select: { currency: true },
          orderBy: { id: 'asc' },
        }),
        db.stockMovement.count({
          where: {
            tenantId,
            deletedAt: null,
            type: 'inbound',
            date: { gte: startOfDay, lte: endOfDay },
          },
        }),
        db.stockMovement.count({
          where: {
            tenantId,
            deletedAt: null,
            type: 'outbound',
            date: { gte: startOfDay, lte: endOfDay },
          },
        }),
      ]);

    const currency = currencyRow?.currency ?? 'NGN';
    const stockValue = toNumber(stockValueRows[0]?.stock_value ?? 0);

    const result: KpiSummary = {
      totalSku,
      todayInbound,
      todayOutbound,
      stockValue,
      currency,
    };
    await this.cache.set(cacheKey, result, 30);
    return result;
  }

  async create(dto: CreateItemDto): Promise<Item> {
    const tenantId = this.tenantDb.requireTenantId();
    const createdBy = await this.auditService.createdByFields();
    const validate = await this.tenantDb.businessLocationValidator();

    const locationRows =
      dto.locationStock && dto.locationStock.length > 0
        ? normalizeLocationRows(dto.locationStock, validate)
        : [];

    // Primary location/quantity: derived from per-location rows when present,
    // otherwise from the flat fields for backward compatibility.
    const primaryLocation =
      locationRows[0]?.locationCode ?? validate(dto.locationCode);
    const primaryBin =
      locationRows[0]?.binLocation || (dto.binLocation ?? null) || null;
    const quantity =
      locationRows.length > 0
        ? locationRows.reduce((sum, r) => sum + r.quantity, 0)
        : (dto.quantity ?? 0);
    const status = deriveStatus(quantity, dto.reorderPoint, dto.status);

    const row = await this.tenantDb.db.item.create({
      data: {
        tenantId,
        sku: dto.sku,
        name: dto.name,
        category: dto.category ?? null,
        quantity,
        binLocation: primaryBin,
        locationCode: primaryLocation,
        reorderPoint: dto.reorderPoint ?? null,
        costPrice: dto.costPrice,
        currency: dto.currency ?? 'NGN',
        status,
        availableForRetail: dto.availableForRetail ?? false,
        ...createdBy,
        ...(locationRows.length > 0
          ? {
              locationStock: {
                create: locationRows.map((r) => ({
                  tenantId,
                  locationCode: r.locationCode,
                  binLocation: r.binLocation,
                  quantity: r.quantity,
                })),
              },
            }
          : {}),
      },
      include: { locationStock: true },
    });
    await this.auditService.log({
      action: 'created',
      entityType: 'item',
      entityId: row.id,
      summary: `Created item ${row.sku}`,
    });
    void this.invalidateItemCaches();
    return serializeItem(row);
  }

  async update(id: string, dto: UpdateItemDto): Promise<Item> {
    const tenantId = this.tenantDb.requireTenantId();
    const existing = await this.tenantDb.db.item.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Item not found');

    const validate = await this.tenantDb.businessLocationValidator();

    const resolvedLocation =
      dto.locationCode !== undefined ? validate(dto.locationCode) : undefined;

    // When per-location rows are supplied, they become the source of truth:
    // replace the rows and recompute quantity + primary location/bin + status.
    const locationRows =
      dto.locationStock !== undefined
        ? normalizeLocationRows(dto.locationStock, validate)
        : undefined;

    const nextReorderPoint =
      dto.reorderPoint !== undefined ? dto.reorderPoint : existing.reorderPoint;

    let derivedQuantity: number | undefined;
    let derivedPrimaryLocation: string | null | undefined;
    let derivedPrimaryBin: string | null | undefined;
    if (locationRows !== undefined) {
      derivedQuantity = locationRows.reduce((sum, r) => sum + r.quantity, 0);
      derivedPrimaryLocation = locationRows[0]?.locationCode ?? resolvedLocation ?? null;
      derivedPrimaryBin = locationRows[0]?.binLocation || null;
    }

    const nextQuantity =
      derivedQuantity !== undefined
        ? derivedQuantity
        : dto.quantity !== undefined
          ? dto.quantity
          : existing.quantity;

    const nextStatus =
      dto.status !== undefined
        ? dto.status
        : dto.quantity !== undefined ||
            dto.reorderPoint !== undefined ||
            locationRows !== undefined
          ? deriveStatus(nextQuantity, nextReorderPoint)
          : undefined;

    const row = await this.tenantDb.db.$transaction(async (tx) => {
      if (locationRows !== undefined) {
        await tx.itemLocationStock.deleteMany({ where: { itemId: id, tenantId } });
        if (locationRows.length > 0) {
          await tx.itemLocationStock.createMany({
            data: locationRows.map((r) => ({
              tenantId,
              itemId: id,
              locationCode: r.locationCode,
              binLocation: r.binLocation,
              quantity: r.quantity,
            })),
          });
        }
      }

      return tx.item.update({
        where: { id },
        data: {
          ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(derivedQuantity !== undefined
            ? { quantity: derivedQuantity }
            : dto.quantity !== undefined
              ? { quantity: dto.quantity }
              : {}),
          ...(derivedPrimaryBin !== undefined
            ? { binLocation: derivedPrimaryBin }
            : dto.binLocation !== undefined
              ? { binLocation: dto.binLocation }
              : {}),
          ...(derivedPrimaryLocation !== undefined
            ? { locationCode: derivedPrimaryLocation }
            : resolvedLocation !== undefined
              ? { locationCode: resolvedLocation }
              : {}),
          ...(dto.reorderPoint !== undefined
            ? { reorderPoint: dto.reorderPoint }
            : {}),
          ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(nextStatus !== undefined ? { status: nextStatus } : {}),
          ...(dto.availableForRetail !== undefined
            ? { availableForRetail: dto.availableForRetail }
            : {}),
        },
        include: { locationStock: true },
      });
    });
    await this.auditService.log({
      action: 'updated',
      entityType: 'item',
      entityId: id,
      summary: `Updated item ${row.sku}`,
    });
    void this.invalidateItemCaches();
    return serializeItem(row);
  }

  /**
   * Cross-entity stock lookup for the Autos Group. Given a search term, returns
   * matching SKUs and the quantity each auto-group entity holds (with per-location
   * breakdown). Read-only and restricted to auto-group staff + super admins.
   */
  async stockAvailability(search?: string): Promise<StockAvailabilityResult> {
    const requesterTenantId = this.tenantDb.resolveTenantId();
    // Super admin (null tenant) is always allowed; entity users must belong to
    // the auto-group.
    if (requesterTenantId !== null) {
      const requester = await this.prisma.tenant.findUnique({
        where: { id: requesterTenantId },
        select: { code: true },
      });
      if (!requester || !isAutosGroupCode(requester.code)) {
        throw new ForbiddenException(
          'Cross-entity stock is limited to the Autos Group',
        );
      }
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { code: { in: [...AUTOS_GROUP_CODES] }, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    const tenantById = new Map(tenants.map((t) => [t.id, t]));

    const term = search?.trim();
    const items = await this.prisma.item.findMany({
      where: {
        deletedAt: null,
        tenantId: { in: tenants.map((t) => t.id) },
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { sku: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { locationStock: true },
      orderBy: [{ sku: 'asc' }, { tenantId: 'asc' }],
      take: 200,
    });

    const groups = new Map<string, StockAvailabilityResult['groups'][number]>();
    for (const item of items) {
      const tenant = tenantById.get(item.tenantId);
      if (!tenant) continue;
      const key = item.sku;
      const group =
        groups.get(key) ??
        ({
          sku: item.sku,
          name: item.name,
          category: item.category,
          totalQuantity: 0,
          entities: [],
        } satisfies StockAvailabilityResult['groups'][number]);

      group.totalQuantity += item.quantity;
      group.entities.push({
        tenantCode: tenant.code,
        tenantName: tenant.name,
        itemId: item.id,
        quantity: item.quantity,
        reorderPoint: item.reorderPoint,
        status: item.status,
        availableForRetail: item.availableForRetail,
        locations: item.locationStock.map((row) => ({
          locationCode: row.locationCode,
          binLocation: row.binLocation === '' ? null : row.binLocation,
          quantity: row.quantity,
        })),
      });
      groups.set(key, group);
    }

    return {
      query: term ?? '',
      groups: Array.from(groups.values()),
    };
  }
}
