/**
 * Vonos Group (VAG) membership.
 *
 * All operating entities roll up into the group admin surfaces
 * (group overview, entity switcher, invites, group finance/reports).
 */
export const AUTOS_GROUP_CODES = [
  "VW",
  "VA",
  "VP",
  "VISP",
  "VSP",
  "VC",
  "VS",
  "VKW",
] as const;

export type AutosGroupCode = (typeof AUTOS_GROUP_CODES)[number];

export function isAutosGroupCode(code: string | null | undefined): boolean {
  return code != null && (AUTOS_GROUP_CODES as readonly string[]).includes(code);
}
