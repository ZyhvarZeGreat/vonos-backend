"""Vonos legacy entity → tenant migration registry."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

# Vonos Automotive — merged target (VM Quotation + VMS OPS)
VA_TENANT_ID = "tenant_va_001"
VA_LEGACY_ID_OFFSET = 10_000_000
HQ3_LEGACY_ID_OFFSET = 20_000_000
HQ2_LEGACY_ID_OFFSET = 30_000_000
VA_QUOTATION_DUMP = "vonomglk_Quotation.sql"
VA_OPS_DUMP = "vonomglk_OPS.sql"
HQ3_DUMP = "vonomglk_hq3temp"
HQ2_DUMP = "vonomglk_hq2"

Archetype = Literal["stock", "transaction", "job"]

POS_TABLES = frozenset({
    "business",
    "business_locations",
    "categories",
    "brands",
    "units",
    "warranties",
    "selling_price_groups",
    "invoice_layouts",
    "invoice_schemes",
    "account_types",
    "accounts",
    "account_transactions",
    "transaction_payments",
    "products",
    "variations",
    "product_variations",
    "variation_location_details",
    "contacts",
    "transactions",
    "transaction_sell_lines",
    "purchase_lines",
    "product_racks",
    "expense_categories",
    "essentials_payroll_groups",
    "essentials_payroll_group_transactions",
    "essentials_allowances_and_deductions",
    "users",
    "activity_log",
})

STOCK_TABLES = POS_TABLES

TRANSACTION_TABLES = POS_TABLES

JOB_TABLES = POS_TABLES


@dataclass(frozen=True)
class EntityMigration:
    code: str
    name: str
    tenant_id: str
    source_db: str
    archetype: Archetype
    map_doc: str
    tables_to_load: frozenset[str]
    available_for_retail: bool
    reference_prefix: str = ""


ENTITIES: dict[str, EntityMigration] = {
    "VW": EntityMigration(
        code="VW",
        name="Vonos Warehouse",
        tenant_id="tenant_vw_001",
        source_db="vonomglk_audit",
        archetype="stock",
        map_doc="docs/migration-audits/VW_MIGRATION_MAP.md",
        tables_to_load=STOCK_TABLES,
        available_for_retail=False,
    ),
    "VISP": EntityMigration(
        code="VISP",
        name="Vonos Institute Spare Parts",
        tenant_id="tenant_visp_001",
        source_db="vonomglk_vsp",
        archetype="transaction",
        map_doc="docs/migration-audits/VISP_MIGRATION_MAP.md",
        tables_to_load=TRANSACTION_TABLES,
        available_for_retail=True,
    ),
    "VSP": EntityMigration(
        code="VSP",
        name="Vonos SP Marketplace",
        tenant_id="tenant_vsp_001",
        source_db="vonomglk_spmarket",
        archetype="transaction",
        map_doc="docs/migration-audits/VSP_MIGRATION_MAP.md",
        tables_to_load=TRANSACTION_TABLES,
        available_for_retail=True,
    ),
    "VA": EntityMigration(
        code="VA",
        name="Vonos Automotive",
        tenant_id=VA_TENANT_ID,
        source_db="vonomglk_Quotation+vonomglk_OPS",
        archetype="job",
        map_doc="docs/migration-audits/VA_MIGRATION_MAP.md",
        tables_to_load=JOB_TABLES,
        available_for_retail=False,
    ),
    # Staging-only — production imports use VA composite (tenant_va_001).
    "VM": EntityMigration(
        code="VM",
        name="Vonos Mechanics (staging)",
        tenant_id="tenant_vm_001",
        source_db="vonomglk_Quotation",
        archetype="job",
        map_doc="docs/migration-audits/VM_MIGRATION_MAP.md",
        tables_to_load=JOB_TABLES,
        available_for_retail=False,
        reference_prefix="VM-",
    ),
    "VMS": EntityMigration(
        code="VMS",
        name="Vonos Mech Shop (staging)",
        tenant_id="tenant_vms_001",
        source_db="vonomglk_OPS",
        archetype="job",
        map_doc="docs/migration-audits/VMS_MIGRATION_MAP.md",
        tables_to_load=JOB_TABLES,
        available_for_retail=False,
        reference_prefix="VMS-",
    ),
    # VA delta sources — import into tenant_va_001 with legacy ID offsets (not separate tenants).
    "HQ3": EntityMigration(
        code="HQ3",
        name="Vonos Autos HQ (hq3temp 2026 delta)",
        tenant_id=VA_TENANT_ID,
        source_db=HQ3_DUMP,
        archetype="job",
        map_doc="docs/migration-audits/VA_MIGRATION_MAP.md",
        tables_to_load=JOB_TABLES,
        available_for_retail=False,
        reference_prefix="HQ3-",
    ),
    "HQ2": EntityMigration(
        code="HQ2",
        name="Vonos Autos HQ archive (hq2 2025 backfill)",
        tenant_id=VA_TENANT_ID,
        source_db=HQ2_DUMP,
        archetype="job",
        map_doc="docs/migration-audits/VA_MIGRATION_MAP.md",
        tables_to_load=JOB_TABLES,
        available_for_retail=False,
        reference_prefix="HQ2-",
    ),
    "VC": EntityMigration(
        code="VC",
        name="Vonos Cafe",
        tenant_id="tenant_vc_001",
        source_db="vonomglk_cafe",
        archetype="transaction",
        map_doc="docs/migration-audits/VC_MIGRATION_MAP.md",
        tables_to_load=TRANSACTION_TABLES,
        available_for_retail=True,
    ),
}

# Production import order (--entities all). VM/VMS are staging-only.
MIGRATION_ENTITY_CODES: tuple[str, ...] = ("VC", "VA", "VISP", "VSP", "VW")

STAGING_ENTITY_CODES: tuple[str, ...] = ("VM", "VMS")

DELTA_ENTITY_CODES: tuple[str, ...] = ("HQ3", "HQ2")

LEGACY_ENTITY_CODES: tuple[str, ...] = MIGRATION_ENTITY_CODES + STAGING_ENTITY_CODES + DELTA_ENTITY_CODES

PHASED_ENTITY_ORDER: tuple[str, ...] = MIGRATION_ENTITY_CODES


def get_entity(code: str) -> EntityMigration:
    key = code.upper()
    if key not in ENTITIES:
        raise KeyError(f"Unknown entity code: {code}. Valid: {', '.join(LEGACY_ENTITY_CODES)}")
    return ENTITIES[key]


def parse_entity_list(raw: str, *, phased_order: bool = False) -> list[EntityMigration]:
    if raw.strip().lower() == "all":
        order = PHASED_ENTITY_ORDER if phased_order else MIGRATION_ENTITY_CODES
        return [ENTITIES[c] for c in order]
    codes = [p.strip().upper() for p in raw.split(",") if p.strip()]
    entities = [get_entity(c) for c in codes]
    if phased_order:
        order_index = {c: i for i, c in enumerate(PHASED_ENTITY_ORDER)}
        entities.sort(key=lambda e: order_index.get(e.code, 999))
    return entities
