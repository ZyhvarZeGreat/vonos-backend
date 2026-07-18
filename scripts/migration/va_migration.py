"""Composite Vonos Automotive (VA) migration — VM Quotation + VMS OPS → tenant_va_001."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from migration.run_entity import run_entity_migration
from migration.types import TransformResult
from migration_registry import (
    VA_LEGACY_ID_OFFSET,
    VA_OPS_DUMP,
    VA_QUOTATION_DUMP,
    VA_TENANT_ID,
    get_entity,
)

if TYPE_CHECKING:
    from migration.progress import ProgressReporter


def apply_legacy_id_offset(result: TransformResult, offset: int) -> None:
    """Namespace VMS legacy IDs before merging into VA (matches merge-vm-vms-into-va.ts)."""
    if offset <= 0:
        return
    for row in result.legacy_ids:
        legacy_id = row.get("legacyId")
        if isinstance(legacy_id, int):
            row["legacyId"] = legacy_id + offset
    for row in result.audit_logs:
        log_id = row.get("legacyLogId")
        if isinstance(log_id, int):
            row["legacyLogId"] = log_id + offset


def retarget_tenant(result: TransformResult, tenant_id: str) -> None:
    """Rewrite tenantId on all transformed rows."""
    list_fields = (
        "items", "customers", "suppliers", "sales", "sale_lines", "stock_movements",
        "jobs", "job_materials", "job_labours", "ledger_entries", "payment_accounts",
        "account_transactions", "payments", "product_categories", "brands",
        "product_units", "warranties", "selling_price_groups", "expense_categories",
        "expenses", "payroll_groups", "pay_components", "payrolls", "legacy_ids",
        "audit_logs",
    )
    for field_name in list_fields:
        rows: list[dict[str, Any]] = getattr(result, field_name)
        for row in rows:
            if "tenantId" in row:
                row["tenantId"] = tenant_id


def run_va_migration(
    quotation_dump: Path,
    ops_dump: Path,
    progress: ProgressReporter | None = None,
    *,
    since: str | None = None,
    until: str | None = None,
    existing_legacy: dict[str, dict[int, str]] | None = None,
    hrm_only: bool = False,
) -> tuple[dict[str, int], TransformResult]:
    """Import both automotive legacy DBs into tenant_va_001."""
    vm_entity = get_entity("VM")
    vms_entity = get_entity("VMS")
    merged = TransformResult()
    loaded: dict[str, int] = {}

    sources = [
        ("VM", vm_entity, quotation_dump, 0),
        ("VMS", vms_entity, ops_dump, VA_LEGACY_ID_OFFSET),
    ]

    cumulative_legacy = existing_legacy

    for label, entity, dump_path, offset in sources:
        if progress:
            progress.message(f"\n  VA source: {label} from `{entity.source_db}` ({dump_path.name})")

        if hrm_only:
            from migration.hrm_transforms import transform_hrm_records
            from migration.load_dump import load_tables
            from migration.pos_common import build_legacy_user_name_map

            tables = load_tables(dump_path, entity.source_db, entity.tables_to_load, progress=progress)
            source_loaded = {name: len(td.rows) for name, td in tables.items() if td.rows}
            for key, val in source_loaded.items():
                loaded[f"{label}:{key}"] = val

            user_names = build_legacy_user_name_map(tables)
            result = transform_hrm_records(
                tables,
                VA_TENANT_ID,
                user_names=user_names,
                since=since,
                until=until,
                existing_group_legacy=cumulative_legacy.get("payroll_group") if cumulative_legacy else None,
                existing_payroll_legacy=cumulative_legacy.get("payroll") if cumulative_legacy else None,
                existing_component_legacy=cumulative_legacy.get("pay_component") if cumulative_legacy else None,
            )
        else:
            source_loaded, result = run_entity_migration(
                entity,
                dump_path,
                progress=progress,
                since=since,
                until=until,
                existing_legacy=cumulative_legacy,
                include_purchases=True,
                include_sales=True,
            )
            for key, val in source_loaded.items():
                loaded[f"{label}:{key}"] = val

        retarget_tenant(result, VA_TENANT_ID)
        apply_legacy_id_offset(result, offset)
        merged.merge(result)

        if cumulative_legacy is not None:
            from migration.pos_common import legacy_map

            for entity_type in (
                "item", "customer", "supplier", "job", "sale", "stock_movement",
                "payment_account", "payment", "expense_category", "payroll_group",
                "payroll", "pay_component",
            ):
                cumulative_legacy[entity_type] = {
                    **cumulative_legacy.get(entity_type, {}),
                    **legacy_map(merged.legacy_ids, entity_type),
                }

    return loaded, merged


def build_va_summary(
    loaded: dict[str, int],
    result: TransformResult,
    *,
    dry_run: bool,
    quotation_dump: Path,
    ops_dump: Path,
) -> dict[str, Any]:
    return {
        "entityCode": "VA",
        "entityName": "Vonos Automotive",
        "sourceDatabases": ["vonomglk_Quotation", "vonomglk_OPS"],
        "dumpFiles": {
            "quotation": str(quotation_dump),
            "ops": str(ops_dump),
        },
        "tenantId": VA_TENANT_ID,
        "archetype": "job",
        "mapDoc": "docs/migration-audits/VA_MIGRATION_MAP.md",
        "dryRun": dry_run,
        "loadedTables": loaded,
        "counts": result.counts(),
        "warnings": result.warnings[:50],
    }


def resolve_va_dump(path: Path | None, default_name: str, fallback: Path) -> Path:
    if path is not None and path.exists():
        return path
    candidate = Path(default_name)
    if candidate.exists():
        return candidate
    if fallback.exists():
        return fallback
    raise FileNotFoundError(
        f"Dump not found: tried {path}, {default_name}, and fallback {fallback}"
    )


DEFAULT_QUOTATION_DUMP = Path(VA_QUOTATION_DUMP)
DEFAULT_OPS_DUMP = Path(VA_OPS_DUMP)
DEFAULT_FALLBACK_DUMP = Path("localhost.sql")
