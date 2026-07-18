/**
 * URL tenant code → backend tenant id. All 8 operating entities are active in the shell.
 * `group: "autos"` entities roll up into the Vonos Autos Group (VAG) admin surfaces;
 * `group: "other"` entities stay in the system but are hidden from the group.
 */
export const TENANT_REGISTRY = {
  VW: {
    tenantId: "tenant_vw_001",
    code: "VW",
    name: "Vonos Warehouse",
    archetype: "stock" as const,
    status: "active" as const,
    group: "autos" as const,
  },
  VKW: {
    tenantId: "tenant_vkw_001",
    code: "VKW",
    name: "Vonos Kids Wear",
    archetype: "stock" as const,
    status: "active" as const,
    group: "other" as const,
  },
  VISP: {
    tenantId: "tenant_visp_001",
    code: "VISP",
    name: "Vonos Institute Spare Parts",
    archetype: "transaction" as const,
    status: "active" as const,
    group: "autos" as const,
  },
  VSP: {
    tenantId: "tenant_vsp_001",
    code: "VSP",
    name: "Vonos SP Marketplace",
    archetype: "transaction" as const,
    status: "active" as const,
    group: "autos" as const,
  },
  VA: {
    tenantId: "tenant_va_001",
    code: "VA",
    name: "Vonos Automotive",
    archetype: "job" as const,
    status: "active" as const,
    group: "autos" as const,
  },
  VC: {
    tenantId: "tenant_vc_001",
    code: "VC",
    name: "Vonos Cafe",
    archetype: "transaction" as const,
    status: "active" as const,
    group: "other" as const,
  },
  VS: {
    tenantId: "tenant_vs_001",
    code: "VS",
    name: "Vonos Saloon",
    archetype: "appointment" as const,
    status: "active" as const,
    group: "other" as const,
  },
} as const;

export type TenantCode = keyof typeof TENANT_REGISTRY;

export function isTenantCode(value: string): value is TenantCode {
  return value in TENANT_REGISTRY;
}

export function getTenantByCode(code: string) {
  if (!isTenantCode(code)) return null;
  return TENANT_REGISTRY[code];
}

export function getTenantCodeFromId(tenantId: string | null): TenantCode | null {
  if (!tenantId) return null;
  const entry = Object.values(TENANT_REGISTRY).find((t) => t.tenantId === tenantId);
  return entry?.code ?? null;
}

export const ENTITY_LIST = Object.values(TENANT_REGISTRY);

/**
 * Display order for Vonos Autos Group surfaces (admin overview, switcher, etc.).
 * VA leads so Automotive is the first card on Group Overview.
 */
export const AUTOS_GROUP_ORDER = ["VA", "VW", "VISP", "VSP"] as const satisfies ReadonlyArray<
  Extract<(typeof TENANT_REGISTRY)[TenantCode]["code"], TenantCode>
>;

/** Entities that belong to the Vonos Autos Group (VAG) admin roll-up. */
export const AUTOS_GROUP_ENTITIES = AUTOS_GROUP_ORDER.map(
  (code) => TENANT_REGISTRY[code],
);

export function isAutosGroupEntity(code: string): boolean {
  const entry = getTenantByCode(code);
  return entry?.group === "autos";
}

/** Retired entity codes — redirect in next.config. */
export const RETIRED_TENANT_CODES = ["VM", "VMS", "VSS"] as const;
