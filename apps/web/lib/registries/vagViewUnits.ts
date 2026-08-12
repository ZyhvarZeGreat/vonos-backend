/**
 * VAG admin viewing units — what the entity switcher / overview cards show.
 * Autos Group only (VW, VA, VP, VISP, VSP). Cafe / Saloon / Kids Wear live
 * under Operations and are not VAG picker targets.
 */
import {
  getTenantByCode,
  type TenantCode,
} from "@/lib/registries/tenants";

export type VagViewUnitId =
  | "VA"
  | "VP"
  | "VW"
  | "VISP"
  | "VSP";

/** @deprecated Combined SP was split into VISP + VSP — kept for persisted-store migration. */
export const VAG_COMBINED_SP_ID = "SP" as const;

export interface VagViewUnit {
  id: VagViewUnitId;
  /** Short badge code shown in UI */
  badge: string;
  name: string;
  description?: string;
  /** Underlying tenant codes (one per unit) */
  tenantCodes: TenantCode[];
  /** Primary workspace to Enter */
  enterCode: TenantCode;
}

export const VAG_VIEW_UNITS: readonly VagViewUnit[] = [
  {
    id: "VA",
    badge: "VA",
    name: "Vonos Mechanic",
    tenantCodes: ["VA"],
    enterCode: "VA",
  },
  {
    id: "VP",
    badge: "VP",
    name: "Vonos Painting",
    tenantCodes: ["VP"],
    enterCode: "VP",
  },
  {
    id: "VW",
    badge: "VW",
    name: "Vonos Warehouse",
    tenantCodes: ["VW"],
    enterCode: "VW",
  },
  {
    id: "VISP",
    badge: "VISP",
    name: "Vonos Institute Spare Parts",
    description: "Institute / high-volume POS",
    tenantCodes: ["VISP"],
    enterCode: "VISP",
  },
  {
    id: "VSP",
    badge: "VSP",
    name: "Vonos SP Marketplace",
    description: "Marketplace catalog",
    tenantCodes: ["VSP"],
    enterCode: "VSP",
  },
] as const;

export function isVagViewUnitId(value: string | null | undefined): value is VagViewUnitId {
  return (
    value === "VA" ||
    value === "VP" ||
    value === "VW" ||
    value === "VISP" ||
    value === "VSP"
  );
}

export function getVagViewUnit(id: VagViewUnitId): VagViewUnit {
  const unit = VAG_VIEW_UNITS.find((u) => u.id === id);
  if (!unit) throw new Error(`Unknown VAG view unit: ${id}`);
  return unit;
}

/** Map a raw tenant code (e.g. from a ledger row) → VAG view unit id. */
export function vagViewUnitIdForTenantCode(code: string): VagViewUnitId | null {
  if (
    code === "VA" ||
    code === "VP" ||
    code === "VW" ||
    code === "VISP" ||
    code === "VSP"
  ) {
    return code;
  }
  // Legacy combined scope → marketplace (primary) when migrating old prefs
  if (code === "SP") return "VSP";
  return null;
}

export function tenantIdsForVagUnit(id: VagViewUnitId): string[] {
  return getVagViewUnit(id).tenantCodes.map((code) => {
    const tenant = getTenantByCode(code);
    if (!tenant) throw new Error(`Missing tenant ${code}`);
    return tenant.tenantId;
  });
}

export function accentTenantCodeForVagUnit(id: VagViewUnitId): TenantCode {
  return getVagViewUnit(id).enterCode;
}
