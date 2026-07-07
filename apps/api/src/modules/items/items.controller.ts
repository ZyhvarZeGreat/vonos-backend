import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  ItemFilters,
  ItemLocationStockInput,
  StockStatus,
} from '@vonos/types';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  RolesGuard,
  TenantGuard,
} from '../../common/guards/auth.guards';
import { ItemsService } from './items.service';

@Controller('items')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('kpi-summary')
  kpiSummary() {
    return this.itemsService.kpiSummary();
  }

  @Get('stock-availability')
  stockAvailability(@Query('search') search?: string) {
    return this.itemsService.stockAvailability(search);
  }

  @Get()
  list(
    @Query('status') status?: StockStatus,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('locationCode') locationCode?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('availableForRetail') availableForRetail?: string,
  ) {
    const filters: ItemFilters & { availableForRetail?: boolean } = {
      status,
      category,
      search,
      locationCode,
      cursor,
      limit: limit ? Number(limit) : undefined,
    };
    if (availableForRetail === 'true') {
      filters.availableForRetail = true;
    }
    return this.itemsService.list(filters);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.itemsService.getById(id);
  }

  @Post()
  @Roles('staff', 'manager', 'admin', 'super_admin')
  create(
    @Body()
    body: {
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
    },
  ) {
    return this.itemsService.create(body);
  }

  @Patch(':id')
  @Roles('staff', 'manager', 'admin', 'super_admin')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      sku: string;
      name: string;
      category: string;
      quantity: number;
      binLocation: string;
      locationCode: string;
      reorderPoint: number;
      costPrice: number;
      currency: string;
      status: StockStatus;
      availableForRetail: boolean;
      locationStock: ItemLocationStockInput[];
    }>,
  ) {
    return this.itemsService.update(id, body);
  }
}
