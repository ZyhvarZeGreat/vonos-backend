import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  RolesGuard,
  TenantGuard,
} from '../../common/guards/auth.guards';
import { CatalogMetaService } from './catalog-meta.service';

function listFilters(
  cursor?: string,
  limit?: string,
  search?: string,
) {
  return {
    cursor,
    limit: limit ? Number(limit) : undefined,
    search,
  };
}

@Controller('catalog-meta')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class CatalogMetaController {
  constructor(private readonly service: CatalogMetaService) {}

  @Get('categories')
  categories(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listCategories(listFilters(cursor, limit, search));
  }

  @Get('brands')
  brands(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listBrands(listFilters(cursor, limit, search));
  }

  @Get('units')
  units(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listUnits(listFilters(cursor, limit, search));
  }

  @Get('warranties')
  warranties(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listWarranties(listFilters(cursor, limit, search));
  }

  @Get('price-groups')
  priceGroups(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPriceGroups(listFilters(cursor, limit, search));
  }
}
