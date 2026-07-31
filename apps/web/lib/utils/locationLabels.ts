import type { BusinessLocation, Item, TenantConfig } from "@vonos/types";
import { PRODUCT_STOCK_BUSINESS_LOCATIONS } from "@vonos/types";

export function resolveBusinessLocation(
  code: string | null | undefined,
  locations: BusinessLocation[] | undefined,
): BusinessLocation | null {
  if (!code?.trim()) return null;
  return (
    (locations ?? []).find(
      (row) => row.code.toLowerCase() === code.trim().toLowerCase(),
    ) ?? null
  );
}

export function businessLocationName(
  code: string | null | undefined,
  locations: BusinessLocation[] | undefined,
): string | null {
  if (!code?.trim()) return null;
  return resolveBusinessLocation(code, locations)?.name ?? code;
}

/** Address line for invoices: landmark, city, state, country. */
export function formatBusinessLocationAddress(
  location: BusinessLocation | null | undefined,
): string | null {
  if (!location) return null;
  const parts = [
    location.landmark,
    location.city,
    location.state,
    location.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(", ") : null;
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
 * e.g. "BL001 · C1: 12 · BL002: 5". Falls back to the flat location line when no
 * per-location rows exist.
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
      const branch = businessLocationName(row.locationCode, locations) ?? row.locationCode;
      const counter = row.binLocation?.trim();
      const label = counter ? `${branch} · ${counter}` : branch;
      return `${label}: ${row.quantity}`;
    })
    .join(" · ");
}

/** Branch / counter options for list filters. ListPageShell prepends "All Location". */
export function locationFilterOptions(
  config: TenantConfig | null | undefined,
): { value: string; label: string }[] {
  const branches = config?.businessLocations ?? [];
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

/** Products page filter: always VW / VISP / VSP (stock homes, not VA/VP). */
export function productStockLocationFilterOptions(): {
  value: string;
  label: string;
}[] {
  return PRODUCT_STOCK_BUSINESS_LOCATIONS.map((loc) => ({
    value: loc.code,
    label: `${loc.code} — ${loc.name}`,
  }));
}

/**
 * Business Location column for products: list stock-holding codes that have qty,
 * e.g. "VW · VISP". Falls back to primary location when no per-location rows.
 */
export function formatProductStockLocations(
  item: Pick<Item, "locationStock" | "locationCode" | "binLocation" | "quantity">,
  locations: BusinessLocation[] = PRODUCT_STOCK_BUSINESS_LOCATIONS,
): string {
  const stockLocs = locations.length > 0 ? locations : PRODUCT_STOCK_BUSINESS_LOCATIONS;
  const rows = item.locationStock ?? [];
  if (rows.length > 0) {
    const withQty = rows.filter((row) => row.quantity > 0);
    const matched = (withQty.length > 0 ? withQty : rows)
      .map((row) => {
        const code = row.locationCode?.trim().toUpperCase();
        if (!code) return null;
        const known = stockLocs.find(
          (loc) => loc.code.toUpperCase() === code,
        );
        return known?.code ?? null;
      })
      .filter((code): code is string => Boolean(code));
    const unique = [...new Set(matched)];
    if (unique.length > 0) return unique.join(" · ");
  }

  const primary = item.locationCode?.trim().toUpperCase();
  if (primary) {
    const known = stockLocs.find((loc) => loc.code.toUpperCase() === primary);
    if (known) return known.code;
  }

  return "—";
}
