/**
 * Map payroll / work-location codes onto operating tenant URL codes.
 * Admin assigns VW|VM|VP|VISP|VSP on the user form; staff switch among those
 * entities in the header.
 */
const LOCATION_TO_TENANT: Record<string, string> = {
  VW: 'VW',
  VA: 'VA',
  VM: 'VA',
  VMS: 'VA',
  VP: 'VP',
  VISP: 'VISP',
  VSS: 'VISP',
  VSP: 'VSP',
  VC: 'VC',
  VS: 'VS',
  VKW: 'VKW',
};

export function normalizeWorkLocationToTenantCode(
  code: string | null | undefined,
): string | null {
  const raw = code?.trim().toUpperCase();
  if (!raw) return null;
  return LOCATION_TO_TENANT[raw] ?? null;
}

export function uniqueTenantCodesFromWorkLocations(
  codes: string[] | null | undefined,
  homeTenantCode?: string | null,
): string[] {
  const out = new Set<string>();
  for (const code of codes ?? []) {
    const mapped = normalizeWorkLocationToTenantCode(code);
    if (mapped) out.add(mapped);
  }
  const home = normalizeWorkLocationToTenantCode(homeTenantCode);
  if (home) out.add(home);
  return [...out].sort();
}
