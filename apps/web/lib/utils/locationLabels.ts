import type { BusinessLocation, Item, TenantConfig } from "@vonos/types";

export function businessLocationName(
  code: string | null | undefined,
  locations: BusinessLocation[] | undefined,
): string | null {
  if (!code?.trim()) return null;
  const match = (locations ?? []).find(
    (row) => row.code.toLowerCase() === code.trim().toLowerCase(),
  );
  return match?.name ?? code;
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
