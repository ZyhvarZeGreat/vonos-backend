import { Injectable } from '@nestjs/common';
import type {
  Brand,
  ProductCategory,
  ProductUnit,
  SellingPriceGroup,
  Warranty,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { CacheService } from '../../common/cache/cache.service';
import { buildCursorQuery } from '../../common/utils/pagination';
import { toIso } from '../../common/utils/serializers';

const META_CACHE_TTL_S = 300;

type MetaListFilters = {
  cursor?: string;
  limit?: number;
  search?: string;
};

function isPaginated(filters: MetaListFilters): boolean {
  return filters.cursor !== undefined || filters.limit !== undefined;
}

@Injectable()
export class CatalogMetaService {
  constructor(
    private readonly tenantDb: TenantDbService,
    private readonly cache: CacheService,
  ) {}

  private cacheKey(kind: string): string {
    return `catalog-meta:${this.tenantDb.requireTenantId()}:${kind}`;
  }

  async listCategories(filters: MetaListFilters = {}): Promise<ProductCategory[]> {
    if (!isPaginated(filters)) {
      const key = this.cacheKey('categories');
      const cached = await this.cache.get<ProductCategory[]>(key);
      if (cached) return cached;
    }

    const rows = await this.tenantDb.db.productCategory.findMany({
      where: {
        tenantId: this.tenantDb.requireTenantId(),
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...(isPaginated(filters)
        ? buildCursorQuery(filters.cursor, filters.limit ?? 25)
        : {}),
    });
    const result = rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      shortCode: row.shortCode,
      parentId: row.parentId,
      categoryType: row.categoryType,
      description: row.description,
      slug: row.slug,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
    if (!isPaginated(filters)) {
      await this.cache.set(this.cacheKey('categories'), result, META_CACHE_TTL_S);
    }
    return result;
  }

  async listBrands(filters: MetaListFilters = {}): Promise<Brand[]> {
    if (!isPaginated(filters)) {
      const key = this.cacheKey('brands');
      const cached = await this.cache.get<Brand[]>(key);
      if (cached) return cached;
    }

    const rows = await this.tenantDb.db.brand.findMany({
      where: {
        tenantId: this.tenantDb.requireTenantId(),
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...(isPaginated(filters)
        ? buildCursorQuery(filters.cursor, filters.limit ?? 25)
        : {}),
    });
    const result = rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
    if (!isPaginated(filters)) {
      await this.cache.set(this.cacheKey('brands'), result, META_CACHE_TTL_S);
    }
    return result;
  }

  async listUnits(filters: MetaListFilters = {}): Promise<ProductUnit[]> {
    if (!isPaginated(filters)) {
      const key = this.cacheKey('units');
      const cached = await this.cache.get<ProductUnit[]>(key);
      if (cached) return cached;
    }

    const rows = await this.tenantDb.db.productUnit.findMany({
      where: {
        tenantId: this.tenantDb.requireTenantId(),
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...(isPaginated(filters)
        ? buildCursorQuery(filters.cursor, filters.limit ?? 25)
        : {}),
    });
    const result = rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      shortName: row.shortName,
      allowDecimal: row.allowDecimal,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
    if (!isPaginated(filters)) {
      await this.cache.set(this.cacheKey('units'), result, META_CACHE_TTL_S);
    }
    return result;
  }

  async listWarranties(filters: MetaListFilters = {}): Promise<Warranty[]> {
    if (!isPaginated(filters)) {
      const key = this.cacheKey('warranties');
      const cached = await this.cache.get<Warranty[]>(key);
      if (cached) return cached;
    }

    const rows = await this.tenantDb.db.warranty.findMany({
      where: {
        tenantId: this.tenantDb.requireTenantId(),
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...(isPaginated(filters)
        ? buildCursorQuery(filters.cursor, filters.limit ?? 25)
        : {}),
    });
    const result = rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      duration: row.duration,
      durationType: row.durationType as Warranty['durationType'],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
    if (!isPaginated(filters)) {
      await this.cache.set(this.cacheKey('warranties'), result, META_CACHE_TTL_S);
    }
    return result;
  }

  async listPriceGroups(filters: MetaListFilters = {}): Promise<SellingPriceGroup[]> {
    if (!isPaginated(filters)) {
      const key = this.cacheKey('price-groups');
      const cached = await this.cache.get<SellingPriceGroup[]>(key);
      if (cached) return cached;
    }

    const rows = await this.tenantDb.db.sellingPriceGroup.findMany({
      where: {
        tenantId: this.tenantDb.requireTenantId(),
        deletedAt: null,
        ...(filters.search
          ? { name: { contains: filters.search, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
      ...(isPaginated(filters)
        ? buildCursorQuery(filters.cursor, filters.limit ?? 25)
        : {}),
    });
    const result = rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
    if (!isPaginated(filters)) {
      await this.cache.set(this.cacheKey('price-groups'), result, META_CACHE_TTL_S);
    }
    return result;
  }
}
