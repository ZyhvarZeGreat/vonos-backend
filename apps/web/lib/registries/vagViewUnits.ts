/**
 * VAG admin viewing units — what the entity switcher / overview cards show.
 * VISP + VSP are one "Spare Parts" unit for group oversight (still separate
 * workspaces at /VISP and /VSP).
 */
import {
  getTenantByCode,
  type TenantCode,
} from "@/lib/registries/tenants";

export const VAG_COMBINED_SP_ID = "SP" as const;

export type VagViewUnitId = "VA" | "VW" | typeof VAG_COMBINED_SP_ID;

export interface VagViewUnit {
  id: VagViewUnitId;
  /** Short badge code shown in UI */
  badge: string;
  name: string;
  description?: string;
  /** Underlying tenant codes (1 for single, 2 for combined SP) */
  tenantCodes: TenantCode[];
  /** Primary workspace to Enter (first listed) */
  enterCode: TenantCode;
}

export const VAG_VIEW_UNITS: readonly VagViewUnit[] = [
  {
    id: "VA",
    badge: "VA",
    name: "Vonos Automotive",
    tenantCodes: ["VA"],
    enterCode: "VA",
  },
  {
    id: "VW",
    badge: "VW",
    name: "Vonos Warehouse",
    tenantCodes: ["VW"],
    enterCode: "VW",
  },
  {
    id: "SP",
    badge: "SP",
    name: "Vonos Spare Parts",
    description: "Institute (VISP) + Marketplace (VSP)",
    tenantCodes: ["VISP", "VSP"],
    enterCode: "VISP",
  },
] as const;

export function isVagViewUnitId(value: string | null | undefined): value is VagViewUnitId {
  return value === "VA" || value === "VW" || value === "SP";
}

export function getVagViewUnit(id: VagViewUnitId): VagViewUnit {
  const unit = VAG_VIEW_UNITS.find((u) => u.id === id);
  if (!unit) throw new Error(`Unknown VAG view unit: ${id}`);
  return unit;
}

/** Map a raw tenant code (e.g. from a ledger row) → VAG view unit id. */
export function vagViewUnitIdForTenantCode(code: string): VagViewUnitId | null {
  if (code === "VA" || code === "VW") return code;
  if (code === "VISP" || code === "VSP") return "SP";
  return null;
}

export function tenantIdsForVagUnit(id: VagViewUnitId): string[] {
  return getVagViewUnit(id).tenantCodes.map((code) => {
    const tenant = getTenantByCode(code);
    if (!tenant) throw new Error(`Missing tenant ${code}`);
    return tenant.tenantId;
  });
}

/** Accent: use VISP teal for combined SP. */
export function accentTenantCodeForVagUnit(id: VagViewUnitId): TenantCode {
  return getVagViewUnit(id).enterCode;
}
