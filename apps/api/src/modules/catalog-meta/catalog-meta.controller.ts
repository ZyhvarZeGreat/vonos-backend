import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateBrandInput,
  CreateProductCategoryInput,
  CreateProductUnitInput,
  CreateSellingPriceGroupInput,
  CreateWarrantyInput,
} from '@vonos/types';
import { Roles } from '../../common/decorators/roles.decorator';
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

  @Post('categories')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  createCategory(@Body() body: CreateProductCategoryInput) {
    return this.service.createCategory(body);
  }

  @Get('brands')
  brands(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listBrands(listFilters(cursor, limit, search));
  }

  @Post('brands')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  createBrand(@Body() body: CreateBrandInput) {
    return this.service.createBrand(body);
  }

  @Get('units')
  units(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listUnits(listFilters(cursor, limit, search));
  }

  @Post('units')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  createUnit(@Body() body: CreateProductUnitInput) {
    return this.service.createUnit(body);
  }

  @Get('warranties')
  warranties(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listWarranties(listFilters(cursor, limit, search));
  }

  @Post('warranties')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  createWarranty(@Body() body: CreateWarrantyInput) {
    return this.service.createWarranty(body);
  }

  @Get('price-groups')
  priceGroups(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listPriceGroups(listFilters(cursor, limit, search));
  }

  @Post('price-groups')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  createPriceGroup(@Body() body: CreateSellingPriceGroupInput) {
    return this.service.createPriceGroup(body);
  }
}
