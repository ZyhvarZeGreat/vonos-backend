import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  Brand,
  CreateBrandInput,
  CreateProductCategoryInput,
  CreateProductUnitInput,
  CreateSellingPriceGroupInput,
  CreateWarrantyInput,
  ProductCategory,
  ProductUnit,
  SellingPriceGroup,
  Warranty,
} from '@vonos/types';
import { TenantDbService } from '../../common/prisma/tenant-db.service';
import { CacheService } from '../../common/cache/cache.service';
import { buildCompositeCursorQuery } from '../../common/utils/pagination';
import { toIso } from '../../common/utils/serializers';

const META_CACHE_TTL_S = 300;
const WARRANTY_DURATION_TYPES = new Set(['days', 'months', 'years']);

type MetaListFilters = {
  cursor?: string;
  limit?: number;
  search?: string;
};

function isPaginated(filters: MetaListFilters): boolean {
  return filters.cursor !== undefined || filters.limit !== undefined;
}

function metaPagination(filters: MetaListFilters) {
  if (!isPaginated(filters)) return { where: undefined, take: undefined };
  return buildCompositeCursorQuery({
    sortField: 'name',
    sortDir: 'asc',
    cursor: filters.cursor,
    limit: filters.limit ?? 10,
    sortValueType: 'string',
  });
}

function requireName(name: string | undefined, label = 'Name'): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) throw new BadRequestException(`${label} is required`);
  return trimmed;
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

  private async invalidateMetaCache(kind: string): Promise<void> {
    await this.cache.invalidatePrefix(
      `catalog-meta:${this.tenantDb.requireTenantId()}:${kind}`,
    );
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
        ...(metaPagination(filters).where ?? {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: metaPagination(filters).take,
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

  async createCategory(
    body: CreateProductCategoryInput,
  ): Promise<ProductCategory> {
    const tenantId = this.tenantDb.requireTenantId();
    const name = requireName(body.name);
    const row = await this.tenantDb.db.productCategory.create({
      data: {
        tenantId,
        name,
        shortCode: body.shortCode?.trim() || null,
        description: body.description?.trim() || null,
        categoryType: body.categoryType?.trim() || null,
      },
    });
    await this.invalidateMetaCache('categories');
    return {
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
    };
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
        ...(metaPagination(filters).where ?? {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: metaPagination(filters).take,
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

  async createBrand(body: CreateBrandInput): Promise<Brand> {
    const tenantId = this.tenantDb.requireTenantId();
    const name = requireName(body.name);
    const row = await this.tenantDb.db.brand.create({
      data: {
        tenantId,
        name,
        description: body.description?.trim() || null,
      },
    });
    await this.invalidateMetaCache('brands');
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
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
        ...(metaPagination(filters).where ?? {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: metaPagination(filters).take,
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

  async createUnit(body: CreateProductUnitInput): Promise<ProductUnit> {
    const tenantId = this.tenantDb.requireTenantId();
    const name = requireName(body.name);
    const shortName = requireName(body.shortName, 'Short name');
    const row = await this.tenantDb.db.productUnit.create({
      data: {
        tenantId,
        name,
        shortName,
        allowDecimal: Boolean(body.allowDecimal),
      },
    });
    await this.invalidateMetaCache('units');
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      shortName: row.shortName,
      allowDecimal: row.allowDecimal,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
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
        ...(metaPagination(filters).where ?? {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: metaPagination(filters).take,
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

  async createWarranty(body: CreateWarrantyInput): Promise<Warranty> {
    const tenantId = this.tenantDb.requireTenantId();
    const name = requireName(body.name);
    const duration = Number(body.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new BadRequestException('Duration must be a positive number');
    }
    if (!WARRANTY_DURATION_TYPES.has(body.durationType)) {
      throw new BadRequestException('Duration type must be days, months, or years');
    }
    const row = await this.tenantDb.db.warranty.create({
      data: {
        tenantId,
        name,
        duration: Math.floor(duration),
        durationType: body.durationType,
        description: body.description?.trim() || null,
      },
    });
    await this.invalidateMetaCache('warranties');
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      duration: row.duration,
      durationType: row.durationType as Warranty['durationType'],
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }

  async listPriceGroups(
    filters: MetaListFilters = {},
  ): Promise<SellingPriceGroup[]> {
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
        ...(metaPagination(filters).where ?? {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: metaPagination(filters).take,
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
      await this.cache.set(
        this.cacheKey('price-groups'),
        result,
        META_CACHE_TTL_S,
      );
    }
    return result;
  }

  async createPriceGroup(
    body: CreateSellingPriceGroupInput,
  ): Promise<SellingPriceGroup> {
    const tenantId = this.tenantDb.requireTenantId();
    const name = requireName(body.name);
    const row = await this.tenantDb.db.sellingPriceGroup.create({
      data: {
        tenantId,
        name,
        description: body.description?.trim() || null,
        isActive: body.isActive ?? true,
      },
    });
    await this.invalidateMetaCache('price-groups');
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    };
  }
}
