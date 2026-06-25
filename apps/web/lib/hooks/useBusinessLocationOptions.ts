import { useMemo } from "react";
import type { BusinessLocation, TenantConfig } from "@vonos/types";

export function businessLocationOptions(
  locations: BusinessLocation[] | undefined,
): Array<{ value: string; label: string }> {
  const rows = locations ?? [];
  return [
    { value: "", label: rows.length === 0 ? "No locations configured" : "Select location…" },
    ...rows.map((row) => ({
      value: row.code,
      label: `${row.code} — ${row.name}`,
    })),
  ];
}

export function useBusinessLocationOptions(config: TenantConfig | null | undefined) {
  return useMemo(
    () => ({
      locations: config?.businessLocations ?? [],
      options: businessLocationOptions(config?.businessLocations),
      required: (config?.businessLocations?.length ?? 0) > 0,
    }),
    [config?.businessLocations],
  );
}

export function assertBusinessLocationSelected(
  required: boolean,
  locationCode: string,
): void {
  if (required && !locationCode.trim()) {
    throw new Error("Business location is required");
  }
}
