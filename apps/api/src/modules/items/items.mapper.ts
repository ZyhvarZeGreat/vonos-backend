import type {
  Item as PrismaItem,
  ItemLocationStock as PrismaItemLocationStock,
} from '@prisma/client';
import type { Item, KpiSummary } from '@vonos/types';
import { toIso, toNumber } from '../../common/utils/serializers';

type ItemWithStock = PrismaItem & {
  locationStock?: PrismaItemLocationStock[];
};

export function serializeItem(row: ItemWithStock): Item {
  const locationStock = (row.locationStock ?? []).map((entry) => ({
    locationCode: entry.locationCode,
    binLocation: entry.binLocation === '' ? null : entry.binLocation,
    quantity: entry.quantity,
  }));

  return {
    id: row.id,
    tenantId: row.tenantId,
    sku: row.sku,
    name: row.name,
    category: row.category,
    subCategory: row.subCategory ?? null,
    description: row.description ?? null,
    barcodeType: row.barcodeType ?? null,
    unit: row.unit ?? null,
    weight: row.weight ?? null,
    carModel: row.carModel ?? null,
    enableImei: row.enableImei ?? false,
    preparationMinutes: row.preparationMinutes ?? null,
    quantity: row.quantity,
    binLocation: row.binLocation,
    locationCode: row.locationCode,
    reorderPoint: row.reorderPoint,
    costPrice: toNumber(row.costPrice),
    sellPrice: row.sellPrice != null ? toNumber(row.sellPrice) : null,
    currency: row.currency,
    status: row.status,
    availableForRetail: row.availableForRetail,
    brandId: row.brandId ?? null,
    locationStock,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

export function emptyKpiSummary(currency = 'NGN'): KpiSummary {
  return {
    totalSku: 0,
    todayInbound: 0,
    todayOutbound: 0,
    stockValue: 0,
    currency,
  };
}
