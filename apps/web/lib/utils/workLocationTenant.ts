import { getTenantByCode, isTenantCode } from "@/lib/registries/tenants";

/**
 * Map payroll / work-location codes onto operating tenant URL codes
 * (mirrors apps/api workLocationTenantCodes).
 */
const LOCATION_TO_TENANT: Record<string, string> = {
  VW: "VW",
  VA: "VA",
  VM: "VA",
  VMS: "VA",
  VP: "VP",
  VISP: "VISP",
  VSS: "VISP",
  VSP: "VSP",
  VC: "VC",
  VS: "VS",
  VKW: "VKW",
};

export function normalizeWorkLocationToTenantCode(
  code: string | null | undefined,
): string | null {
  const raw = code?.trim().toUpperCase();
  if (!raw) return null;
  return LOCATION_TO_TENANT[raw] ?? null;
}

/** Work-location tags that grant clearance for a tenant URL code. */
export function locationCodesForTenantCode(
  tenantCode: string | null | undefined,
): string[] {
  const target = normalizeWorkLocationToTenantCode(tenantCode);
  if (!target) return [];
  const aliases = Object.entries(LOCATION_TO_TENANT)
    .filter(([, mapped]) => mapped === target)
    .map(([loc]) => loc);
  if (!aliases.includes(target)) aliases.push(target);
  return aliases;
}

/** Resolve registry tenantId for a work-location / entity tag. */
export function tenantIdFromWorkLocationCode(
  code: string | null | undefined,
): string | null {
  const tenantCode = normalizeWorkLocationToTenantCode(code);
  if (!tenantCode || !isTenantCode(tenantCode)) return null;
  return getTenantByCode(tenantCode)?.tenantId ?? null;
}

export function primaryTenantIdFromWorkLocations(
  codes: string[] | null | undefined,
): string | null {
  for (const code of codes ?? []) {
    const id = tenantIdFromWorkLocationCode(code);
    if (id) return id;
  }
  return null;
}
