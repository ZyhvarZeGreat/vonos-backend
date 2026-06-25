"""Legacy activity_log and created_by helpers for Vonos migration."""

from __future__ import annotations

import json
from typing import Any

from migration.pos_common import new_cuid, parse_int, parse_tx_date, row_date_on_or_after, table_rows
from migration.types import TableData, TransformResult

DESCRIPTION_TO_ACTION = {
    "added": "created",
    "edited": "updated",
    "deleted": "deleted",
    "payment_edited": "payment_edited",
}

SUBJECT_ENTITY_CANDIDATES: dict[str, list[str]] = {
    "App\\Transaction": ["job", "sale", "stock_movement"],
    "App\\Contact": ["customer", "supplier"],
    "App\\Product": ["product", "item"],
    "App\\Variation": ["item"],
    "App\\User": ["user"],
}


def build_legacy_user_name_map(tables: dict[str, TableData]) -> dict[int, str]:
    names: dict[int, str] = {}
    for row in table_rows(tables, "users"):
        uid = parse_int(row.get("id"))
        if uid <= 0:
            continue
        parts = [
            str(row.get("first_name") or "").strip(),
            str(row.get("last_name") or "").strip(),
        ]
        name = " ".join(p for p in parts if p)
        if not name:
            name = str(row.get("username") or row.get("email") or f"User-{uid}").strip()
        names[uid] = name
    return names


def created_by_fields(
    created_by_raw: Any,
    user_names: dict[int, str],
    user_vonos: dict[int, str] | None = None,
) -> dict[str, Any]:
    uid = parse_int(created_by_raw)
    if uid <= 0:
        return {}
    fields: dict[str, Any] = {}
    name = user_names.get(uid)
    if name:
        fields["createdByName"] = name
    if user_vonos and user_vonos.get(uid):
        fields["createdByUserId"] = user_vonos[uid]
    return fields


def actor_fields(
    causer_id_raw: Any,
    user_names: dict[int, str],
    user_vonos: dict[int, str] | None = None,
) -> tuple[str | None, str | None]:
    uid = parse_int(causer_id_raw)
    if uid <= 0:
        return None, None
    name = user_names.get(uid)
    vonos_id = user_vonos.get(uid) if user_vonos else None
    return vonos_id, name


def _parse_properties(raw: Any) -> dict[str, Any] | None:
    if raw is None or raw in ("", "NULL"):
        return None
    if isinstance(raw, dict):
        return raw
    try:
        parsed = json.loads(str(raw))
        return parsed if isinstance(parsed, dict) else {"raw": parsed}
    except (json.JSONDecodeError, TypeError):
        return {"raw": str(raw)}


def _map_action(description: Any) -> str:
    key = str(description or "").strip().lower()
    return DESCRIPTION_TO_ACTION.get(key, key or "updated")


def _resolve_entity(
    subject_type: str,
    subject_id: int,
    legacy_maps: dict[str, dict[int, str]],
) -> tuple[str | None, str | None]:
    candidates = SUBJECT_ENTITY_CANDIDATES.get(subject_type, [])
    for entity_type in candidates:
        entity_id = legacy_maps.get(entity_type, {}).get(subject_id)
        if entity_id:
            return entity_type, entity_id
    return None, None


def _human_summary(action: str, subject_type: str, properties: dict[str, Any] | None) -> str:
    subject_label = subject_type.split("\\")[-1] if subject_type else "record"
    if action == "created":
        return f"Created {subject_label}"
    if action == "deleted":
        return f"Deleted {subject_label}"
    if action == "payment_edited":
        return f"Edited payment on {subject_label}"
    if properties and "attributes" in properties:
        return f"Edited {subject_label}"
    return f"Updated {subject_label}"


def transform_activity_logs(
    tables: dict[str, TableData],
    tenant_id: str,
    legacy_maps: dict[str, dict[int, str]],
    user_names: dict[int, str],
    user_vonos: dict[int, str] | None = None,
    *,
    since: str | None = None,
    existing_log_ids: set[int] | None = None,
) -> TransformResult:
    result = TransformResult()
    skipped = 0

    for row in table_rows(tables, "activity_log"):
        legacy_log_id = parse_int(row.get("id"))
        if legacy_log_id <= 0:
            continue
        if since and not row_date_on_or_after(row, "created_at", since):
            continue
        if existing_log_ids and legacy_log_id in existing_log_ids:
            continue

        subject_type = str(row.get("subject_type") or "").strip()
        subject_id = parse_int(row.get("subject_id"))
        if not subject_type or subject_id <= 0:
            skipped += 1
            continue

        entity_type, entity_id = _resolve_entity(subject_type, subject_id, legacy_maps)
        if not entity_type:
            short = subject_type.split("\\")[-1] if subject_type else "record"
            entity_type = short.lower()

        action = _map_action(row.get("description"))
        properties = _parse_properties(row.get("properties"))
        if not entity_id:
            base = properties if isinstance(properties, dict) else {}
            properties = {
                **base,
                "legacySubjectType": subject_type,
                "legacySubjectId": subject_id,
            }
        actor_user_id, actor_name = actor_fields(
            row.get("causer_id"),
            user_names,
            user_vonos,
        )
        occurred_at = parse_tx_date(row.get("created_at"))

        result.audit_logs.append({
            "id": new_cuid(),
            "tenantId": tenant_id,
            "action": action,
            "entityType": entity_type,
            "entityId": entity_id,
            "actorUserId": actor_user_id,
            "actorName": actor_name,
            "summary": _human_summary(action, subject_type, properties),
            "metadata": properties,
            "occurredAt": occurred_at,
            "legacyLogId": legacy_log_id,
        })

    if skipped:
        result.warnings.append(f"Skipped {skipped} activity_log rows (unmapped subject)")
    return result


def load_existing_audit_log_ids(tenant_id: str, database_url: str) -> set[int]:
    from migration.tenant_db import _connect

    with _connect(database_url) as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT "legacyLogId" FROM "AuditLog" WHERE "tenantId" = %s AND "legacyLogId" IS NOT NULL',
            (tenant_id,),
        )
        return {int(row[0]) for row in cur.fetchall() if row[0] is not None}


def load_legacy_maps_from_postgres(
    tenant_id: str,
    database_url: str,
) -> dict[str, dict[int, str]]:
    from migration.tenant_db import _connect

    maps: dict[str, dict[int, str]] = {}
    with _connect(database_url) as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT "entityType", "legacyId", "newId" FROM "MigrationLegacyId" WHERE "tenantId" = %s',
            (tenant_id,),
        )
        for entity_type, legacy_id, new_id in cur.fetchall():
            maps.setdefault(str(entity_type), {})[int(legacy_id)] = str(new_id)
    return maps
