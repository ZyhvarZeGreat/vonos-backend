import type { TenantCode } from "@/lib/registries/tenants";

export interface TenantMigrationSource {
  /** Postgres tenant id (seed). */
  tenantId: string;
  /** Primary legacy MySQL database in localhost.sql */
  legacyDatabase: string;
  /** Human label from the old POS business table */
  legacyBusinessName: string;
  /** What record types live in this tenant in Vonos */
  dataInApp: string[];
  /** Extra context for operators / migration */
  operatorNotes?: string;
}

export const TENANT_MIGRATION_SOURCES: Record<TenantCode, TenantMigrationSource> = {
  VW: {
    tenantId: "tenant_vw_001",
    legacyDatabase: "vonomglk_audit",
    legacyBusinessName: "Vonos Audit Warehouse",
    dataInApp: ["Inventory items", "Stock movements (outbound)", "Finance ledger (sells)"],
    operatorNotes:
      "Canonical app: audit.vonosautos.com. SQL: Vonos warehouse.sql. Legacy vonomglk_hq2 is archive-only (not imported).",
  },
  VKW: {
    tenantId: "tenant_vkw_001",
    legacyDatabase: "—",
    legacyBusinessName: "New build (no legacy DB)",
    dataInApp: ["Variant inventory", "Sales", "Collections"],
    operatorNotes: "No WordPress/Ultimate POS migration — seed data only until go-live.",
  },
  VISP: {
    tenantId: "tenant_visp_001",
    legacyDatabase: "vonomglk_vsp",
    legacyBusinessName: "Vonos Institute Spare Parts",
    dataInApp: ["Sales & receipts", "Customers", "Retail catalog", "Finance ledger"],
    operatorNotes:
      "Legacy site visp.vonosautomarket.com. Formerly mis-imported as VSS — data lives in tenant_visp_001.",
  },
  VSP: {
    tenantId: "tenant_vsp_001",
    legacyDatabase: "vonomglk_spmarket",
    legacyBusinessName: "Vonos SP Marketplace",
    dataInApp: ["Marketplace orders", "Customers", "Catalog listings", "Finance ledger"],
    operatorNotes: "Legacy site vsp.vonosautomarket.com — separate from VISP institute install.",
  },
  VC: {
    tenantId: "tenant_vc_001",
    legacyDatabase: "vonomglk_cafe",
    legacyBusinessName: "Vonos Cafe",
    dataInApp: ["Orders (sales)", "Customers", "Finance ledger"],
  },
  VM: {
    tenantId: "tenant_vm_001",
    legacyDatabase: "vonomglk_Quotation",
    legacyBusinessName: "Vonos Mechanics (Quotation)",
    dataInApp: [
      "Jobs",
      "Job materials",
      "Customers",
      "Vehicles",
      "Parts requisitions",
      "Finance ledger",
    ],
    operatorNotes: "Legacy repair / quotation install. Formerly merged into VA — now tenant_vm_001.",
  },
  VMS: {
    tenantId: "tenant_vms_001",
    legacyDatabase: "vonomglk_OPS",
    legacyBusinessName: "Vonos Mech Shop (OPS)",
    dataInApp: [
      "Jobs",
      "Job materials",
      "Customers",
      "Material requisitions",
      "Finance ledger",
    ],
    operatorNotes: "Legacy fabrication / OPS install. Formerly merged into VA — now tenant_vms_001.",
  },
  VS: {
    tenantId: "tenant_vs_001",
    legacyDatabase: "—",
    legacyBusinessName: "New build (no legacy DB)",
    dataInApp: ["Appointments", "Customer profiles", "Stylist schedule"],
    operatorNotes: "Saloon is a fresh entity — no legacy import yet.",
  },
};

export function getMigrationSource(tenantCode: TenantCode): TenantMigrationSource {
  return TENANT_MIGRATION_SOURCES[tenantCode];
}
