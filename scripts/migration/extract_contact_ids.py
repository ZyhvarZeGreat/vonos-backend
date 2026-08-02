#!/usr/bin/env python3
"""Extract Ultimate POS ``contacts.contact_id`` per tenant from the legacy dump.

The new-system Contact ID lives in ``Customer.details.contactId`` and is meant to
hold the manually-entered value (a vehicle registration number for automotive,
or an auto ``CO000x`` for others). The primary ETL drops the ``details`` column,
so this script produces a lookup the TypeScript backfill can join against
``MigrationLegacyId.legacyId``.

Output shape (``tmp/legacy_contact_ids_by_tenant.json``)::

    {
      "generatedAt": "...",
      "byTenant": { "<tenantId>": { "<legacyId>": "<contact_id>" } }
    }

The ``legacyId`` key already includes the VA composite offsets (OPS +10M,
hq3temp +20M, hq2 +30M) so it matches what ``MigrationLegacyId`` stores.

Usage::

    python3 scripts/migration/extract_contact_ids.py --dump localhost.sql
"""

from __future__ import annotations

import os
import sys

# This file lives in scripts/migration/, which contains a local ``types.py``.
# Remove that directory from sys.path (Python auto-adds it as path[0]) so it
# can't shadow the stdlib ``types`` module, then expose ``scripts/`` for the
# ``migration`` package and top-level helper modules.
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:] = [p for p in sys.path if os.path.abspath(p or os.getcwd()) != _HERE]
_SCRIPTS_DIR = os.path.dirname(_HERE)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

import argparse  # noqa: E402
import json  # noqa: E402
from datetime import datetime, timezone  # noqa: E402
from pathlib import Path  # noqa: E402

from audit_mysql_dump import (  # noqa: E402
    CREATE_RE,
    DATABASE_COMMENT_RE,
    INSERT_RE,
    USE_RE,
    extract_tuples_from_insert_line,
    parse_column_def,
    split_sql_values,
)
from migration.load_dump import row_dict  # noqa: E402
from migration.pos_common import parse_int  # noqa: E402
from migration_registry import (  # noqa: E402
    ENTITIES,
    HQ2_LEGACY_ID_OFFSET,
    HQ3_LEGACY_ID_OFFSET,
    MIGRATION_ENTITY_CODES,
    VA_LEGACY_ID_OFFSET,
    VA_TENANT_ID,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def build_db_targets() -> dict[str, tuple[str, int]]:
    """Map each legacy source database -> (tenantId, legacyIdOffset).

    VA is a composite of four legacy databases merged into a single tenant with
    numeric-id offsets; every other tenant maps 1:1 with offset 0.
    """
    targets: dict[str, tuple[str, int]] = {}
    for code in MIGRATION_ENTITY_CODES:
        entity = ENTITIES[code]
        if code == "VA":
            targets[ENTITIES["VM"].source_db] = (VA_TENANT_ID, 0)
            targets[ENTITIES["VMS"].source_db] = (VA_TENANT_ID, VA_LEGACY_ID_OFFSET)
            targets[ENTITIES["HQ3"].source_db] = (VA_TENANT_ID, HQ3_LEGACY_ID_OFFSET)
            targets[ENTITIES["HQ2"].source_db] = (VA_TENANT_ID, HQ2_LEGACY_ID_OFFSET)
        else:
            targets[entity.source_db] = (entity.tenant_id, 0)
    return targets


def _record_contact(
    by_tenant: dict[str, dict[str, str]],
    tenant_id: str,
    offset: int,
    columns: list[str],
    values: list[str | None],
) -> int:
    row = row_dict(values, columns)
    ctype = str(row.get("type") or "").lower()
    if ctype not in ("customer", "both"):
        return 0
    pk = parse_int(row.get("id"))
    if pk <= 0:
        return 0
    contact_id = str(row.get("contact_id") or "").strip()
    if not contact_id:
        return 0
    by_tenant.setdefault(tenant_id, {})[str(pk + offset)] = contact_id
    return 1


def extract(dump_path: Path) -> dict[str, dict[str, str]]:
    """Single pass over the dump collecting `contacts.contact_id` for every target db."""
    targets = build_db_targets()
    by_tenant: dict[str, dict[str, str]] = {}
    per_db: dict[str, int] = {}

    current_db: str | None = None
    in_contacts_create = False
    contact_columns: list[str] = []
    columns_by_db: dict[str, list[str]] = {}
    pending_insert = False

    def switch_db(name: str) -> None:
        nonlocal current_db, in_contacts_create, contact_columns, pending_insert
        current_db = name
        in_contacts_create = False
        contact_columns = columns_by_db.get(name, [])
        pending_insert = False

    with dump_path.open("r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            use_m = USE_RE.match(line)
            if use_m:
                switch_db(use_m.group(1))
                continue
            db_m = DATABASE_COMMENT_RE.match(line.strip())
            if db_m:
                switch_db(db_m.group(1))
                continue

            if current_db is None or current_db not in targets:
                continue

            tenant_id, offset = targets[current_db]

            create_m = CREATE_RE.match(line)
            if create_m:
                in_contacts_create = create_m.group(1) == "contacts"
                if in_contacts_create:
                    contact_columns = []
                    columns_by_db[current_db] = contact_columns
                pending_insert = False
                continue

            if in_contacts_create:
                if line.strip().startswith(")"):
                    in_contacts_create = False
                    continue
                col = parse_column_def(line)
                if col:
                    contact_columns.append(col[0])
                continue

            insert_m = INSERT_RE.match(line)
            if insert_m:
                if insert_m.group(1) != "contacts" or not contact_columns:
                    pending_insert = False
                    continue
                pending_insert = True
                for tup in extract_tuples_from_insert_line(line):
                    per_db[current_db] = per_db.get(current_db, 0) + _record_contact(
                        by_tenant, tenant_id, offset, contact_columns, split_sql_values(tup)
                    )
                if line.rstrip().endswith(";"):
                    pending_insert = False
                continue

            if pending_insert and line.lstrip().startswith("("):
                payload = f"VALUES {line}"
                for tup in extract_tuples_from_insert_line(payload):
                    per_db[current_db] = per_db.get(current_db, 0) + _record_contact(
                        by_tenant, tenant_id, offset, contact_columns, split_sql_values(tup)
                    )
                if line.rstrip().endswith(";"):
                    pending_insert = False

    for db, (tenant_id, offset) in targets.items():
        print(f"  {db:>22} -> {tenant_id}: {per_db.get(db, 0)} contact ids (+{offset})")
    return by_tenant


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dump", type=Path, default=repo_root() / "localhost.sql")
    parser.add_argument(
        "--out",
        type=Path,
        default=repo_root() / "tmp" / "legacy_contact_ids_by_tenant.json",
    )
    args = parser.parse_args()

    if not args.dump.exists():
        print(f"Dump not found: {args.dump}", file=sys.stderr)
        return 1

    print(f"Extracting contact ids from {args.dump} …")
    by_tenant = extract(args.dump)
    total = sum(len(v) for v in by_tenant.values())

    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": str(args.dump),
        "byTenant": by_tenant,
    }
    args.out.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    print(f"\nWrote {total} contact ids across {len(by_tenant)} tenants -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
