import { useMemo } from "react";
import type { BusinessLocation, TenantConfig } from "@vonos/types";
import { catalogPresetsForCode } from "@vonos/types";

/** Other operating entity codes — excluded from an entity's own location list. */
const ENTITY_LOCATION_CODES = new Set([
  "VA",
  "VW",
  "VISP",
  "VSP",
  "VC",
  "VS",
  "VP",
  "VKW",
  "VAG",
  "VM",
  "VMS",
]);

/**
 * Prefer configured locations; if the tenant DB row is empty, use catalog presets
 * so sales / expenses / purchases still have the entity's own branch.
 */
export function locationsForTenantConfig(
  config: TenantConfig | null | undefined,
): BusinessLocation[] {
  const fromConfig = config?.businessLocations ?? [];
  if (fromConfig.length > 0) return fromConfig;
  const code = config?.code?.trim();
  if (!code) return [];
  return catalogPresetsForCode(code).businessLocations ?? [];
}

/**
 * Locations that belong to this entity for sales / expenses / purchases:
 * drops sister-entity codes (e.g. VW/VISP on a VA form), keeps own shops.
 */
export function entitySaleLocations(
  config: TenantConfig | null | undefined,
): BusinessLocation[] {
  const locs = locationsForTenantConfig(config);
  const code = config?.code?.trim().toUpperCase();
  if (!code || locs.length === 0) return locs;

  const foreign = new Set(
    [...ENTITY_LOCATION_CODES].filter((c) => c !== code),
  );
  const own = locs.filter((loc) => !foreign.has(loc.code.trim().toUpperCase()));
  return own.length > 0 ? own : locs;
}

/** Prefer the location whose code matches the tenant (e.g. VA → Vonos Mechanic). */
export function defaultEntityLocationCode(
  locations: BusinessLocation[],
  tenantCode?: string | null,
): string {
  if (locations.length === 0) return "";
  const code = tenantCode?.trim().toUpperCase();
  if (code) {
    const match = locations.find(
      (loc) => loc.code.trim().toUpperCase() === code,
    );
    if (match) return match.code;
  }
  return locations[0]?.code ?? "";
}

export function businessLocationOptions(
  locations: BusinessLocation[] | undefined,
): Array<{ value: string; label: string }> {
  const rows = locations ?? [];
  return [
    {
      value: "",
      label: rows.length === 0 ? "No locations configured" : "Select location…",
    },
    ...rows.map((row) => ({
      value: row.code,
      // Show entity / branch name only (not "VA — Vonos Mechanic").
      label: row.name,
    })),
  ];
}

export function useBusinessLocationOptions(
  config: TenantConfig | null | undefined,
) {
  return useMemo(() => {
    const locations = entitySaleLocations(config);
    return {
      locations,
      options: businessLocationOptions(locations),
      required: locations.length > 0,
      defaultCode: defaultEntityLocationCode(locations, config?.code),
    };
  }, [config?.businessLocations, config?.code]);
}

/** Sale/POS/expense/purchase: entity-owned locations only, defaulted to this entity. */
export function useEntitySaleLocationOptions(
  config: TenantConfig | null | undefined,
) {
  return useBusinessLocationOptions(config);
}

export function assertBusinessLocationSelected(
  required: boolean,
  locationCode: string,
): void {
  if (required && !locationCode.trim()) {
    throw new Error("Business location is required");
  }
}
