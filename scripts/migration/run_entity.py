"""Per-entity migration runner."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any

from migration.account_transforms import transform_accounts
from migration.catalog_transforms import transform_catalog_meta
from migration.hrm_transforms import transform_hrm_records
from migration.job_transforms import run_job_migration
from migration.load_dump import load_tables
from migration.pos_common import build_legacy_user_name_map, legacy_map
from migration.stock_transforms import run_stock_migration
from migration.transaction_transforms import run_transaction_migration
from migration.types import TransformResult
from migration_registry import EntityMigration

if TYPE_CHECKING:
    from migration.progress import ProgressReporter


def run_entity_migration(
    entity: EntityMigration,
    dump_path: Path,
    progress: ProgressReporter | None = None,
    *,
    since: str | None = None,
    until: str | None = None,
    existing_legacy: dict[str, dict[int, str]] | None = None,
    include_purchases: bool = False,
) -> tuple[dict[str, int], TransformResult]:
    if progress:
        progress.phase(1, 3, f"Load MySQL tables from `{entity.source_db}`")

    tables = load_tables(dump_path, entity.source_db, entity.tables_to_load, progress=progress)
    loaded = {name: len(td.rows) for name, td in tables.items() if td.rows}

    if progress:
        loaded_summary = ", ".join(f"{k}={v:,}" for k, v in sorted(loaded.items()) if v)
        progress.phase(2, 3, f"Transform → Vonos ({entity.archetype} archetype)")
        if loaded_summary:
            progress.message(f"      tables: {loaded_summary}")

    if entity.archetype == "stock":
        result = run_stock_migration(
            tables,
            entity.tenant_id,
            since=since,
            existing_legacy=existing_legacy,
        )
    elif entity.archetype == "transaction":
        result = run_transaction_migration(
            tables,
            entity.tenant_id,
            available_for_retail=entity.available_for_retail,
            reference_prefix=entity.reference_prefix or f"{entity.code}-",
            since=since,
            existing_legacy=existing_legacy,
        )
    elif entity.archetype == "job":
        result = run_job_migration(
            tables,
            entity.tenant_id,
            entity.code,  # type: ignore[arg-type]
            reference_prefix=entity.reference_prefix or f"{entity.code}-",
            since=since,
            until=until,
            existing_legacy=existing_legacy,
            include_purchases=include_purchases,
        )
    else:
        raise ValueError(f"Unsupported archetype: {entity.archetype}")

    user_names = build_legacy_user_name_map(tables)

    account_existing: dict[str, dict[int, str]] = {
        entity: dict(mapping) for entity, mapping in (existing_legacy or {}).items()
    }
    for entity_type in ("sale", "supplier", "payment_account", "payment"):
        account_existing[entity_type] = {
            **account_existing.get(entity_type, {}),
            **legacy_map(result.legacy_ids, entity_type),
        }

    account_result = transform_accounts(
        tables,
        entity.tenant_id,
        user_names=user_names,
        since=since,
        until=until,
        existing_legacy=account_existing,
    )
    result.merge(account_result)

    catalog_result = transform_catalog_meta(
        tables,
        entity.tenant_id,
        existing_legacy=existing_legacy,
    )
    result.merge(catalog_result)

    hrm_result = transform_hrm_records(
        tables,
        entity.tenant_id,
        user_names=user_names,
        since=since,
        until=until,
        existing_group_legacy=existing_legacy.get("payroll_group") if existing_legacy else None,
        existing_payroll_legacy=existing_legacy.get("payroll") if existing_legacy else None,
        existing_component_legacy=existing_legacy.get("pay_component") if existing_legacy else None,
    )
    result.merge(hrm_result)

    if progress:
        counts = result.counts()
        non_zero = ", ".join(f"{k}={v:,}" for k, v in counts.items() if v)
        progress.message(f"  Transform complete: {non_zero}")

    return loaded, result


def build_summary(
    entity: EntityMigration,
    loaded: dict[str, int],
    result: TransformResult,
    *,
    dry_run: bool,
) -> dict[str, Any]:
    return {
        "entityCode": entity.code,
        "entityName": entity.name,
        "sourceDatabase": entity.source_db,
        "tenantId": entity.tenant_id,
        "archetype": entity.archetype,
        "mapDoc": entity.map_doc,
        "dryRun": dry_run,
        "loadedTables": loaded,
        "counts": result.counts(),
        "warnings": result.warnings[:50],
    }
