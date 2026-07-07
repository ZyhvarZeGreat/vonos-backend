import type { TenantCode } from "@/lib/registries/tenants";

export interface TenantMigrationSource {
  /** Postgres tenant id (seed). */
  tenantId: string;
  /** Primary legacy MySQL database in localhost.sql */
  legacyDatabase: string;
  /** Expected phpMyAdmin dump file(s) for ETL */
  dumpFiles: string[];
  /** Human label from the old POS business table */
  legacyBusinessName: string;
  /** What record types live in this tenant in Vonos */
  dataInApp: string[];
  /** Extra context for operators / migration */
  operatorNotes?: string;
  /** Shell/Python wrapper for one-tenant import */
  importWrapper?: string;
}

export const TENANT_MIGRATION_SOURCES: Record<TenantCode, TenantMigrationSource> = {
  VW: {
    tenantId: "tenant_vw_001",
    legacyDatabase: "vonomglk_audit",
    dumpFiles: ["Vonos warehouse.sql"],
    legacyBusinessName: "Vonos Audit Warehouse",
    dataInApp: ["Inventory items", "Stock movements (outbound)", "Finance ledger (sells)"],
    importWrapper: "./scripts/migrate.sh --entities VW",
    operatorNotes:
      "Canonical app: audit.vonosautos.com. SQL: Vonos warehouse.sql. Legacy vonomglk_hq2 is archive-only (not imported).",
  },
  VKW: {
    tenantId: "tenant_vkw_001",
    legacyDatabase: "—",
    dumpFiles: [],
    legacyBusinessName: "New build (no legacy DB)",
    dataInApp: ["Variant inventory", "Sales", "Collections"],
    operatorNotes: "No WordPress/Ultimate POS migration — seed data only until go-live.",
  },
  VISP: {
    tenantId: "tenant_visp_001",
    legacyDatabase: "vonomglk_vsp",
    dumpFiles: ["vonomglk_vsp.sql"],
    legacyBusinessName: "Vonos Institute Spare Parts",
    dataInApp: ["Sales & receipts", "Customers", "Retail catalog", "Finance ledger", "Payroll groups"],
    importWrapper: "./scripts/migrate_visp_from_vsp.py",
    operatorNotes:
      "Legacy site visp.vonosautomarket.com. Payroll employee rows require transactions.type=payroll in dump.",
  },
  VSP: {
    tenantId: "tenant_vsp_001",
    legacyDatabase: "vonomglk_spmarket",
    dumpFiles: ["vonomglk_spmarket.sql"],
    legacyBusinessName: "Vonos SP Marketplace",
    dataInApp: ["Marketplace orders", "Customers", "Catalog listings", "Finance ledger"],
    importWrapper: "./scripts/migrate_vsp_from_spmarket.py",
    operatorNotes: "Legacy site vsp.vonosautomarket.com — separate from VISP institute install.",
  },
  VC: {
    tenantId: "tenant_vc_001",
    legacyDatabase: "vonomglk_cafe",
    dumpFiles: ["vonomglk_cafe.sql", "localhost.sql"],
    legacyBusinessName: "Vonos Cafe",
    dataInApp: ["Orders (sales)", "Customers", "Finance ledger"],
    importWrapper: "./scripts/migrate_vc.sh",
  },
  VA: {
    tenantId: "tenant_va_001",
    legacyDatabase: "vonomglk_Quotation + vonomglk_OPS",
    dumpFiles: ["vonomglk_Quotation.sql", "vonomglk_OPS.sql", "localhost.sql"],
    legacyBusinessName: "Vonos Automotive (merged Mechanics + Mech Shop)",
    dataInApp: [
      "Jobs",
      "Job materials",
      "Customers",
      "Vehicles",
      "Parts requisitions",
      "Finance ledger",
      "Expenses",
      "Payroll",
      "Payroll groups",
      "Pay components",
    ],
    importWrapper: "./scripts/migrate_va.sh",
    operatorNotes:
      "HQ6 reference (automotive only). Composite import: Quotation (VM-) then OPS (VMS-). HRM: --hrm-only flag.",
  },
  VS: {
    tenantId: "tenant_vs_001",
    legacyDatabase: "—",
    dumpFiles: [],
    legacyBusinessName: "New build (no legacy DB)",
    dataInApp: ["Appointments", "Customer profiles", "Stylist schedule"],
    operatorNotes: "Saloon is a fresh entity — no legacy import yet.",
  },
};

export function getMigrationSource(tenantCode: TenantCode): TenantMigrationSource {
  return TENANT_MIGRATION_SOURCES[tenantCode];
}
