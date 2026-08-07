import type { BusinessLocation, Item, TenantConfig } from "@vonos/types";
import {
  BUSINESS_LOCATION_PRESETS,
  PRODUCT_STOCK_BUSINESS_LOCATIONS,
  catalogPresetsForCode,
  productHomeLocationsForTenant,
} from "@vonos/types";

/** Canonical entity / branch names when tenant config locations are empty. */
function knownBusinessLocations(): BusinessLocation[] {
  const byCode = new Map<string, BusinessLocation>();
  for (const loc of PRODUCT_STOCK_BUSINESS_LOCATIONS) {
    byCode.set(loc.code.toUpperCase(), loc);
  }
  for (const locs of Object.values(BUSINESS_LOCATION_PRESETS)) {
    for (const loc of locs) {
      const key = loc.code.toUpperCase();
      if (!byCode.has(key)) byCode.set(key, loc);
    }
  }
  return [...byCode.values()];
}

function findByCode(
  code: string,
  locations: BusinessLocation[] | undefined,
): BusinessLocation | null {
  const needle = code.trim().toLowerCase();
  return (
    (locations ?? []).find((row) => row.code.toLowerCase() === needle) ?? null
  );
}

export function resolveBusinessLocation(
  code: string | null | undefined,
  locations: BusinessLocation[] | undefined,
): BusinessLocation | null {
  if (!code?.trim()) return null;
  return (
    findByCode(code, locations) ?? findByCode(code, knownBusinessLocations())
  );
}

/** Display label for a location code — prefers entity/branch name over raw code. */
export function businessLocationName(
  code: string | null | undefined,
  locations: BusinessLocation[] | undefined,
): string | null {
  if (!code?.trim()) return null;
  return resolveBusinessLocation(code, locations)?.name ?? code;
}

/** Address line for invoices: landmark + city (matches HQ6 letterhead). */
export function formatBusinessLocationAddress(
  location: BusinessLocation | null | undefined,
): string | null {
  if (!location) return null;
  const parts = [location.landmark, location.city]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (parts.length > 0) return parts.join(", ");
  // Fallback when only state/country exist
  const fallback = [location.state, location.country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return fallback.length > 0 ? fallback.join(", ") : null;
}

export function formatItemLocationLine(
  item: Pick<Item, "locationCode" | "binLocation">,
  locations?: BusinessLocation[],
): string {
  const branch = businessLocationName(item.locationCode, locations);
  const counter = item.binLocation?.trim();
  if (branch && counter) return `${branch} · Counter ${counter}`;
  if (branch) return branch;
  if (counter) return `Counter ${counter}`;
  return "—";
}

export function itemMatchesLocationFilter(
  item: Pick<Item, "locationCode" | "binLocation">,
  locationCode: string,
  locations?: BusinessLocation[],
): boolean {
  if (!locationCode) return true;
  if (item.locationCode === locationCode) return true;
  const label = businessLocationName(locationCode, locations)?.toLowerCase();
  if (label && item.binLocation?.toLowerCase().includes(label)) return true;
  return item.binLocation === locationCode;
}

/**
 * Human-readable per-location stock breakdown for search results / detail views,
 * e.g. "Vonos Warehouse · C1: 12 · Vonos Institute Spare Parts: 5".
 */
export function formatLocationStockSummary(
  item: Pick<Item, "locationStock" | "locationCode" | "binLocation">,
  locations?: BusinessLocation[],
): string {
  const rows = item.locationStock ?? [];
  if (rows.length === 0) {
    return formatItemLocationLine(item, locations);
  }
  return rows
    .map((row) => {
      const branch =
        businessLocationName(row.locationCode, locations) ?? row.locationCode;
      const counter = row.binLocation?.trim();
      const label = counter ? `${branch} · ${counter}` : branch;
      return `${label}: ${row.quantity}`;
    })
    .join(" · ");
}

function branchesForConfig(
  config: TenantConfig | null | undefined,
): BusinessLocation[] {
  const fromConfig = config?.businessLocations ?? [];
  if (fromConfig.length > 0) return fromConfig;
  return catalogPresetsForCode(config?.code).businessLocations ?? [];
}

/** Branch / counter options for list filters. ListPageShell prepends "All Location". */
export function locationFilterOptions(
  config: TenantConfig | null | undefined,
): { value: string; label: string }[] {
  const branches = branchesForConfig(config);
  const storage = config?.storageLocations ?? [];
  const options: { value: string; label: string }[] = [];
  for (const branch of branches) {
    options.push({ value: branch.code, label: branch.name });
  }
  for (const slot of storage) {
    if (!options.some((row) => row.value === slot)) {
      options.push({ value: slot, label: `Counter ${slot}` });
    }
  }
  return options;
}

/** Products page filter: this tenant's own product home (VA/VP/VW/VISP/VSP). */
export function productStockLocationFilterOptions(
  tenantCode?: string | null,
): {
  value: string;
  label: string;
}[] {
  const home = productHomeLocationsForTenant(tenantCode);
  const locs = home.length > 0 ? home : PRODUCT_STOCK_BUSINESS_LOCATIONS;
  return locs.map((loc) => ({
    value: loc.code,
    label: loc.name,
  }));
}

/**
 * Business Location column for products: where stock sits, e.g.
 * "Vonos Warehouse · Vonos Institute Spare Parts". Resolves any known entity
 * code (including VA/VP catalog homes).
 */
export function formatProductStockLocations(
  item: Pick<
    Item,
    "locationStock" | "locationCode" | "binLocation" | "quantity"
  >,
  locations: BusinessLocation[] = PRODUCT_STOCK_BUSINESS_LOCATIONS,
  fallbackLocationCode?: string | null,
): string {
  const stockLocs =
    locations.length > 0 ? locations : PRODUCT_STOCK_BUSINESS_LOCATIONS;
  const resolveName = (code: string) =>
    stockLocs.find((loc) => loc.code.toUpperCase() === code)?.name ??
    businessLocationName(code, stockLocs) ??
    null;

  const rows = item.locationStock ?? [];
  if (rows.length > 0) {
    const withQty = rows.filter((row) => row.quantity > 0);
    const matched = (withQty.length > 0 ? withQty : rows)
      .map((row) => {
        const code = row.locationCode?.trim().toUpperCase();
        if (!code) return null;
        return resolveName(code);
      })
      .filter((name): name is string => Boolean(name));
    const unique = [...new Set(matched)];
    if (unique.length > 0) return unique.join(" · ");
  }

  const primary = item.locationCode?.trim().toUpperCase();
  if (primary) {
    return resolveName(primary) ?? "—";
  }

  const fallback = fallbackLocationCode?.trim().toUpperCase();
  if (fallback) {
    return resolveName(fallback) ?? "—";
  }

  return "—";
}
