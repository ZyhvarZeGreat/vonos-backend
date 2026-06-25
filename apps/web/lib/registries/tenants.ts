/** URL tenant code → backend tenant id. All 6 operating entities are active in the shell. */
export const TENANT_REGISTRY = {
  VW: {
    tenantId: "tenant_vw_001",
    code: "VW",
    name: "Vonos Warehouse",
    archetype: "stock" as const,
    status: "active" as const,
  },
  VKW: {
    tenantId: "tenant_vkw_001",
    code: "VKW",
    name: "Vonos Kids Wear",
    archetype: "stock" as const,
    status: "active" as const,
  },
  VISP: {
    tenantId: "tenant_visp_001",
    code: "VISP",
    name: "Vonos Institute Spare Parts",
    archetype: "transaction" as const,
    status: "active" as const,
  },
  VSP: {
    tenantId: "tenant_vsp_001",
    code: "VSP",
    name: "Vonos SP Marketplace",
    archetype: "transaction" as const,
    status: "active" as const,
  },
  VC: {
    tenantId: "tenant_vc_001",
    code: "VC",
    name: "Vonos Cafe",
    archetype: "transaction" as const,
    status: "active" as const,
  },
  VM: {
    tenantId: "tenant_vm_001",
    code: "VM",
    name: "Vonos Mechanics",
    archetype: "job" as const,
    status: "active" as const,
  },
  VMS: {
    tenantId: "tenant_vms_001",
    code: "VMS",
    name: "Vonos Mech Shop",
    archetype: "job" as const,
    status: "active" as const,
  },
  VS: {
    tenantId: "tenant_vs_001",
    code: "VS",
    name: "Vonos Saloon",
    archetype: "appointment" as const,
    status: "active" as const,
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

/** Retired entity codes — redirect in next.config. */
export const RETIRED_TENANT_CODES = ["VA", "VSS"] as const;
