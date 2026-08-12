/**
 * URL tenant code → backend tenant id.
 * Autos-group entities roll up on VAG; operations (VC/VS/VKW) are separate mounts.
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
    group: "operations" as const,
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
    name: "Vonos Mechanic",
    archetype: "job" as const,
    status: "active" as const,
    group: "autos" as const,
  },
  VP: {
    tenantId: "tenant_vp_001",
    code: "VP",
    name: "Vonos Painting",
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
    group: "operations" as const,
  },
  VS: {
    tenantId: "tenant_vs_001",
    code: "VS",
    name: "Vonos Saloon",
    archetype: "appointment" as const,
    status: "active" as const,
    group: "operations" as const,
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
export const AUTOS_GROUP_ORDER = [
  "VA",
  "VP",
  "VW",
  "VISP",
  "VSP",
] as const satisfies ReadonlyArray<
  Extract<(typeof TENANT_REGISTRY)[TenantCode]["code"], TenantCode>
>;

/** Cafe / Saloon / Kids Wear — not in VAG roll-ups. */
export const OPERATIONS_GROUP_ORDER = [
  "VC",
  "VS",
  "VKW",
] as const satisfies ReadonlyArray<
  Extract<(typeof TENANT_REGISTRY)[TenantCode]["code"], TenantCode>
>;

/** Entities that belong to the Vonos Autos Group (VAG) admin roll-up. */
export const AUTOS_GROUP_ENTITIES = AUTOS_GROUP_ORDER.map(
  (code) => TENANT_REGISTRY[code],
);

export const OPERATIONS_GROUP_ENTITIES = OPERATIONS_GROUP_ORDER.map(
  (code) => TENANT_REGISTRY[code],
);

export function isAutosGroupEntity(code: string): boolean {
  const entry = getTenantByCode(code);
  return entry?.group === "autos" && entry.status === "active";
}

export function isOperationsGroupEntity(code: string): boolean {
  const entry = getTenantByCode(code);
  return entry?.group === "operations" && entry.status === "active";
}

/** Retired entity codes — redirect in next.config. VSS → VISP. */
export const RETIRED_TENANT_CODES = ["VM", "VMS", "VSS"] as const;
