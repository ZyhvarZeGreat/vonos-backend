#!/usr/bin/env python3
"""Import legacy Ultimate POS users into Vonos Postgres."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.tenant_db import load_database_url, resolve_tenant
from migration.user_transforms import (
    GROUP_ADMIN_EMAILS,
    VM_ACTIVE_LEGACY_IDS,
    UserTransformResult,
    run_vm_active_user_import,
)
from migration_registry import ENTITIES


def _connect(database_url: str):
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "Install migration deps: .venv/bin/pip install -r scripts/migration/requirements.txt"
        ) from exc
    return psycopg.connect(database_url)


def write_users(result: UserTransformResult, tenant_id: str, database_url: str) -> int:
    if not result.users:
        return 0

    user_sql = """
        INSERT INTO "User" (
            id, email, "passwordHash", name, role, status, "tenantId",
            "tokenVersion", "totpEnabled", "createdAt"
        ) VALUES (%s, %s, %s, %s, %s::"Role", %s::"UserStatus", %s, %s, %s, %s)
        ON CONFLICT (email) DO UPDATE SET
            "passwordHash" = EXCLUDED."passwordHash",
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            "tenantId" = EXCLUDED."tenantId"
    """

    legacy_sql = """
        INSERT INTO "MigrationLegacyId" (id, "tenantId", "entityType", "legacyId", "newId")
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT ("tenantId", "entityType", "legacyId") DO UPDATE SET
            "newId" = EXCLUDED."newId"
    """

    written = 0
    with _connect(database_url) as conn, conn.cursor() as cur:
        for user in result.users:
            cur.execute(
                user_sql,
                (
                    user["id"],
                    user["email"],
                    user["passwordHash"],
                    user["name"],
                    user["role"],
                    user["status"],
                    user["tenantId"],
                    user["tokenVersion"],
                    user["totpEnabled"],
                    user["createdAt"],
                ),
            )
            written += 1

        for leg in result.legacy_ids:
            cur.execute(
                legacy_sql,
                (
                    f"mig_user_{leg['legacyId']}",
                    tenant_id,
                    leg["entityType"],
                    leg["legacyId"],
                    leg["newId"],
                ),
            )

        conn.commit()

    return written


def promote_group_admins(
    database_url: str,
    emails: frozenset[str] = GROUP_ADMIN_EMAILS,
) -> list[str]:
    """Set Vonos group executives to super_admin (tenantId null)."""
    sql = """
        UPDATE "User"
        SET role = 'super_admin'::"Role",
            "tenantId" = NULL
        WHERE LOWER(email) = ANY(%s)
        RETURNING email
    """
    normalized = [e.lower() for e in emails]
    with _connect(database_url) as conn, conn.cursor() as cur:
        cur.execute(sql, (normalized,))
        updated = [row[0] for row in cur.fetchall()]
        conn.commit()
    return updated


def main() -> int:
    parser = argparse.ArgumentParser(description="Import legacy POS users into Vonos")
    parser.add_argument("--dump", type=Path, default=Path("localhost.sql"))
    parser.add_argument("--entity", default="VM", help="Entity code (VM pilot)")
    parser.add_argument(
        "--legacy-ids",
        default="",
        help="Comma-separated legacy user ids (default: VM active six)",
    )
    parser.add_argument("--write", action="store_true", help="Upsert into Postgres")
    parser.add_argument(
        "--promote-group-admins",
        action="store_true",
        help="Promote executive emails to super_admin (tenantId null)",
    )
    parser.add_argument("--json", action="store_true", help="Print transform JSON")
    args = parser.parse_args()

    if args.promote_group_admins:
        url = load_database_url()
        updated = promote_group_admins(url)
        print("\n=== Group admin promotion (super_admin) ===")
        if updated:
            for email in sorted(updated):
                print(f"  promoted: {email}")
            print(
                "\nAffected users must log out and back in for the entity switcher to appear."
            )
        else:
            print("  No matching users found. Run --write import first or check emails.")
        missing = sorted(GROUP_ADMIN_EMAILS - {e.lower() for e in updated})
        if missing:
            print(f"  Not in database: {', '.join(missing)}")
        return 0 if updated else 1

    if not args.dump.exists():
        print(f"Dump not found: {args.dump}", file=sys.stderr)
        return 1

    if args.entity.upper() != "VM":
        print("Only VM user import is implemented in this pilot.", file=sys.stderr)
        return 1

    entity = ENTITIES["VM"]
    legacy_ids = VM_ACTIVE_LEGACY_IDS
    if args.legacy_ids.strip():
        legacy_ids = frozenset(int(x.strip()) for x in args.legacy_ids.split(",") if x.strip())

    result = run_vm_active_user_import(args.dump, legacy_ids=legacy_ids)

    print(f"\n=== {entity.code} user import ({'WRITE' if args.write else 'DRY-RUN'}) ===")
    print(f"Source: {entity.source_db}")
    print(f"Target: {entity.tenant_id}")
    print(f"Users to import: {len(result.users)}")
    if result.skipped:
        print(f"Skipped: {len(result.skipped)}")
        for line in result.skipped:
            print(f"  - {line}")
    if result.warnings:
        for line in result.warnings:
            print(f"  warn: {line}")

    for user in result.users:
        leg = next(l for l in result.legacy_ids if l["newId"] == user["id"])
        print(
            f"  legacy={leg['legacyId']:>3} | {user['role']:<8} | {user['email']:<35} | {user['name']}"
        )

    if args.json:
        print(json.dumps({"users": result.users, "legacyIds": result.legacy_ids}, indent=2))

    if not args.write:
        print("\nDry-run only. Re-run with --write to upsert into Postgres.")
        return 0

    url = load_database_url()
    resolve_tenant(entity, url)
    count = write_users(result, entity.tenant_id, url)
    print(f"\nUpserted {count} user(s) into Postgres.")
    print("Staff can log in with the same email + password as the old Mechanics app.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
