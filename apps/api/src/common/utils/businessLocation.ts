import { BadRequestException } from '@nestjs/common';
import type { TenantConfig } from '@vonos/types';
import {
  catalogPresetsForCode,
  isProductStockTenant,
  PRODUCT_STOCK_BUSINESS_LOCATIONS,
} from '@vonos/types';

const ENTITY_LOCATION_CODES = new Set([
  'VA',
  'VW',
  'VISP',
  'VSP',
  'VC',
  'VS',
  'VP',
  'VKW',
  'VAG',
  'VM',
  'VMS',
]);

export function businessLocationsFromConfig(config: unknown) {
  const typed = config as TenantConfig | null | undefined;
  const fromConfig = typed?.businessLocations ?? [];
  if (fromConfig.length > 0) return fromConfig;
  const code = typed?.code?.trim();
  if (!code) return [];
  if (isProductStockTenant(code)) {
    return [...PRODUCT_STOCK_BUSINESS_LOCATIONS];
  }
  return catalogPresetsForCode(code).businessLocations ?? [];
}

/**
 * Locations allowed on product stock (VW/VISP/VSP for stock tenants).
 * Sales/expenses still use entityOwnBusinessLocations.
 */
export function productStockBusinessLocations(config: unknown) {
  const typed = config as TenantConfig | null | undefined;
  const code = typed?.code?.trim();
  if (isProductStockTenant(code)) {
    return [...PRODUCT_STOCK_BUSINESS_LOCATIONS];
  }
  return businessLocationsFromConfig(config);
}

/** Entity-owned branches only (e.g. VA → Vonos Mechanic, not VW/VISP). */
export function entityOwnBusinessLocations(config: unknown) {
  const typed = config as TenantConfig | null | undefined;
  const locs = businessLocationsFromConfig(config);
  const code = typed?.code?.trim().toUpperCase();
  if (!code || locs.length === 0) return locs;
  const foreign = new Set(
    [...ENTITY_LOCATION_CODES].filter((c) => c !== code),
  );
  const own = locs.filter(
    (loc) => !foreign.has(loc.code.trim().toUpperCase()),
  );
  return own.length > 0 ? own : locs;
}

/**
 * Resolve a business location from a CSV code or display name.
 * Product imports: allow VW/VISP/VSP on stock tenants.
 * Returns null when blank; throws when a value is given but unmatched.
 */
export function resolveBusinessLocationCode(
  config: unknown,
  locationNameOrCode?: string | null,
): string | null {
  const raw = locationNameOrCode?.trim();
  if (!raw) return null;

  const locations = productStockBusinessLocations(config);
  if (locations.length === 0) return raw;

  const lower = raw.toLowerCase();
  const match = locations.find(
    (row) =>
      row.code.toLowerCase() === lower || row.name.toLowerCase() === lower,
  );
  if (!match) {
    throw new BadRequestException(`Unknown business location: ${raw}`);
  }
  return match.code;
}

/** Sale/expense location: entity-owned branch only. */
export function assertBusinessLocation(
  config: unknown,
  locationCode?: string | null,
): string | null {
  const locations = entityOwnBusinessLocations(config);
  if (locations.length === 0) {
    return locationCode?.trim() || null;
  }

  const code = locationCode?.trim();
  if (!code) {
    throw new BadRequestException('Business location is required');
  }
  if (!locations.some((row) => row.code === code)) {
    throw new BadRequestException('Unknown business location');
  }
  return code;
}

/** Product stock location: VW / VISP / VSP on stock tenants. */
export function assertProductStockLocation(
  config: unknown,
  locationCode?: string | null,
): string | null {
  const locations = productStockBusinessLocations(config);
  if (locations.length === 0) {
    return locationCode?.trim() || null;
  }

  const code = locationCode?.trim();
  if (!code) {
    throw new BadRequestException('Business location is required');
  }
  if (!locations.some((row) => row.code === code)) {
    throw new BadRequestException('Unknown business location');
  }
  return code;
}
