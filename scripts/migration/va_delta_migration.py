"""VA delta imports — hq3temp (2026) and hq2 (2025) → tenant_va_001."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any, Literal

from migration.run_entity import run_entity_migration
from migration.types import TransformResult
from migration.va_migration import apply_legacy_id_offset, retarget_tenant
from migration_registry import (
    HQ2_LEGACY_ID_OFFSET,
    HQ3_LEGACY_ID_OFFSET,
    VA_TENANT_ID,
    get_entity,
)

if TYPE_CHECKING:
    from migration.progress import ProgressReporter

DeltaCode = Literal["HQ3", "HQ2"]

_OFFSET_BY_CODE: dict[DeltaCode, int] = {
    "HQ3": HQ3_LEGACY_ID_OFFSET,
    "HQ2": HQ2_LEGACY_ID_OFFSET,
}


def existing_legacy_for_delta_import(
    existing_legacy: dict[str, dict[int, str]] | None,
    offset: int,
) -> dict[str, dict[int, str]] | None:
    """Remap Postgres legacy IDs to raw MySQL ids for this delta source only.

    Without this, hq3/hq2 payroll rows collide with Quotation/OPS ids that share
    the same raw transaction id (e.g. payroll #500).
    """
    if not existing_legacy or offset <= 0:
        return existing_legacy
    remapped: dict[str, dict[int, str]] = {}
    for entity_type, mapping in existing_legacy.items():
        remapped[entity_type] = {
            legacy_id - offset: new_id
            for legacy_id, new_id in mapping.items()
            if legacy_id >= offset
        }
    return remapped


def run_va_delta_migration(
    entity_code: DeltaCode,
    dump_path: Path,
    progress: ProgressReporter | None = None,
    *,
    since: str | None = None,
    until: str | None = None,
    existing_legacy: dict[str, dict[int, str]] | None = None,
) -> tuple[dict[str, int], TransformResult]:
    """Import one HQ delta source into tenant_va_001 with a namespaced legacy ID offset."""
    entity = get_entity(entity_code)
    offset = _OFFSET_BY_CODE[entity_code]
    scoped_existing = existing_legacy_for_delta_import(existing_legacy, offset)

    loaded, result = run_entity_migration(
        entity,
        dump_path,
        progress=progress,
        since=since,
        until=until,
        existing_legacy=scoped_existing,
        include_purchases=True,
    )
    retarget_tenant(result, VA_TENANT_ID)
    apply_legacy_id_offset(result, offset)
    return loaded, result


def build_va_delta_summary(
    entity_code: DeltaCode,
    loaded: dict[str, int],
    result: TransformResult,
    *,
    dry_run: bool,
    dump_path: Path,
    since: str | None,
    until: str | None,
) -> dict[str, Any]:
    entity = get_entity(entity_code)
    return {
        "entityCode": entity_code,
        "entityName": entity.name,
        "sourceDatabase": entity.source_db,
        "dumpFile": str(dump_path),
        "tenantId": VA_TENANT_ID,
        "archetype": entity.archetype,
        "referencePrefix": entity.reference_prefix,
        "legacyIdOffset": _OFFSET_BY_CODE[entity_code],
        "since": since,
        "until": until,
        "dryRun": dry_run,
        "loadedTables": loaded,
        "counts": result.counts(),
        "warnings": result.warnings[:50],
    }


def resolve_delta_dump(path: Path | None, fallback: Path) -> Path:
    if path is not None and path.exists():
        return path
    if fallback.exists():
        return fallback
    raise FileNotFoundError(f"Dump not found: tried {path} and fallback {fallback}")


DEFAULT_FALLBACK_DUMP = Path.home() / "Downloads" / "localhost.sql"
