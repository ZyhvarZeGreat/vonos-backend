"""Ultimate POS users → Vonos User import (password hash carry-over)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from migration.load_dump import load_tables
from migration.pos_common import new_cuid, table_rows
from migration.types import TableData
from migration_registry import ENTITIES, EntityMigration
from pathlib import Path

# VM v1 pilot — the six accounts that can log in today in vonomglk_Quotation.
VM_ACTIVE_LEGACY_IDS: frozenset[int] = frozenset({1, 2, 7, 20, 29, 85})

# Executives who get tenant admin on import and group super_admin via --promote-group-admins.
VM_GROUP_ADMIN_LEGACY_IDS: frozenset[int] = frozenset({1, 2, 29, 85})

GROUP_ADMIN_EMAILS: frozenset[str] = frozenset(
    {
        "admin@vonosautos.com",
        "support@vonosautos.com",
        "ifred@vonosautos.com",
        "ephraim@vonosautos.com",
    }
)

POS_ROLE_TO_VONOS: dict[str, str] = {
    "Admin#1": "admin",
    "MANAGER#1": "manager",
    "ACCOUNTANT#1": "manager",
    "HR MANAGER#1": "manager",
    "FRONT DESK#1": "staff",
    "PARTS AUDITOR#1": "staff",
    "Service staff#1": "staff",
}


@dataclass
class UserTransformResult:
    users: list[dict[str, Any]] = field(default_factory=list)
    legacy_ids: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)


def normalize_bcrypt_hash(password_hash: str) -> str:
    """Laravel uses $2y$; Node bcrypt expects $2a$ (same algorithm)."""
    h = (password_hash or "").strip()
    if h.startswith("$2y$"):
        return "$2a$" + h[4:]
    return h


def display_name(row: dict[str, Any]) -> str:
    first = str(row.get("first_name") or "").strip()
    surname = str(row.get("surname") or row.get("last_name") or "").strip()
    if first or surname:
        return f"{first} {surname}".strip()
    username = str(row.get("username") or "").strip()
    if username:
        return username
    email = str(row.get("email") or "").strip()
    return email or f"User-{row.get('id')}"


def can_login(row: dict[str, Any]) -> bool:
    deleted = row.get("deleted_at") not in (None, "", "NULL")
    allow = str(row.get("allow_login", "1"))
    return not deleted and allow in ("1", "1.0", "true")


def resolve_roles(
    user_id: str,
    tables: dict[str, TableData],
    warnings: list[str],
) -> list[str]:
    roles_by_id = {str(r["id"]): str(r.get("name") or "") for r in table_rows(tables, "roles")}
    names: list[str] = []
    for mr in table_rows(tables, "model_has_roles"):
        model_type = str(mr.get("model_type") or "")
        if "User" not in model_type:
            continue
        if str(mr.get("model_id")) != user_id:
            continue
        role_name = roles_by_id.get(str(mr.get("role_id")), "")
        if role_name:
            names.append(role_name)
    return names


def map_vonos_role(pos_roles: list[str], warnings: list[str], legacy_id: int) -> str:
    vonos_roles: list[str] = []
    for name in pos_roles:
        mapped = POS_ROLE_TO_VONOS.get(name)
        if mapped:
            if mapped not in vonos_roles:
                vonos_roles.append(mapped)
        else:
            warnings.append(f"user {legacy_id}: unmapped POS role {name!r}")

    if "admin" in vonos_roles:
        return "admin"
    if "manager" in vonos_roles:
        return "manager"
    if "staff" in vonos_roles:
        return "staff"
    if vonos_roles:
        return vonos_roles[0]
    warnings.append(f"user {legacy_id}: no roles — defaulting to staff")
    return "staff"


def transform_users(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    legacy_ids: frozenset[int] | None = None,
    active_only: bool = True,
) -> UserTransformResult:
    result = UserTransformResult()
    now = datetime.utcnow().isoformat()

    for row in table_rows(tables, "users"):
        legacy_id = int(row.get("id") or 0)
        if legacy_ids is not None and legacy_id not in legacy_ids:
            continue
        if legacy_ids is None and active_only and not can_login(row):
            continue

        email = str(row.get("email") or "").strip().lower()
        if not email or "@" not in email:
            result.skipped.append(f"id={legacy_id}: missing email")
            continue

        password = str(row.get("password") or "").strip()
        if not password.startswith("$2"):
            result.skipped.append(f"id={legacy_id} {email}: missing bcrypt password")
            continue

        pos_roles = resolve_roles(str(legacy_id), tables, result.warnings)
        vonos_role = map_vonos_role(pos_roles, result.warnings, legacy_id)
        if legacy_id in VM_GROUP_ADMIN_LEGACY_IDS:
            vonos_role = "admin"
        user_id = f"user_vm_legacy_{legacy_id}"

        result.users.append(
            {
                "id": user_id,
                "email": email,
                "passwordHash": normalize_bcrypt_hash(password),
                "name": display_name(row),
                "role": vonos_role,
                "status": "active",
                "tenantId": tenant_id,
                "tokenVersion": 0,
                "totpEnabled": False,
                "createdAt": now,
            }
        )
        result.legacy_ids.append(
            {
                "entityType": "user",
                "legacyId": legacy_id,
                "newId": user_id,
            }
        )

    return result


def load_user_tables(dump_path: Path, source_db: str) -> dict[str, TableData]:
    return load_tables(
        dump_path,
        source_db,
        frozenset({"users", "roles", "model_has_roles"}),
    )


def run_vm_active_user_import(
    dump_path: Path,
    *,
    legacy_ids: frozenset[int] | None = VM_ACTIVE_LEGACY_IDS,
) -> UserTransformResult:
    entity = ENTITIES["VM"]
    tables = load_user_tables(dump_path, entity.source_db)
    return transform_users(
        tables,
        entity.tenant_id,
        legacy_ids=legacy_ids,
        active_only=legacy_ids is None,
    )
