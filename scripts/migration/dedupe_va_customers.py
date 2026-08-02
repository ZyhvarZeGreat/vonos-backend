"""VA-specific customer dedupe for the duplicated hq2/hq3temp snapshots.

Both legacy HQ automotive snapshots (hq3temp +20M, hq2 +30M) were imported into
`tenant_va_001`, so most customers exist twice. The shared `dedupe_tenant.py` is
unsafe here because (1) it keys on name+phone only — which would merge distinct
vehicles that share a generic owner name / "nill" phone — and (2) it does not
remap `Job.customerId`, and VA is job-centric.

This script groups live customers by (name, phone, contactId) — so the same
owner + same vehicle registration collapses to one, while genuinely different
vehicles under a shared name are preserved. It keeps the earliest-created row,
remaps `Job.customerId` and `Sale.customerId` onto the keeper (payments follow
their sale), then soft-deletes the extras. Nothing is hard-deleted.

Usage:
  python3 -m migration.dedupe_va_customers                      # dry-run
  python3 -m migration.dedupe_va_customers --execute --confirm-tenant VA
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from typing import Any

from migration.tenant_db import _connect, load_database_url, resolve_tenant
from migration_registry import get_entity

VA_CODE = "VA"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _build_customer_groups(cur, tenant_id: str) -> dict[str, str]:
    """Return {extraCustomerId: keeperCustomerId} keyed on (name, phone, contactId)."""
    cur.execute(
        """
        SELECT array_agg(id ORDER BY "createdAt", id) AS ids
        FROM "Customer"
        WHERE "tenantId" = %s AND "deletedAt" IS NULL
        GROUP BY
          lower(trim(name)),
          coalesce(lower(trim(phone)), ''),
          coalesce(upper(trim(details->>'contactId')), '')
        HAVING count(*) > 1
        """,
        (tenant_id,),
    )
    remap: dict[str, str] = {}
    for (ids,) in cur.fetchall():
        keeper = ids[0]
        for dup_id in ids[1:]:
            remap[dup_id] = keeper
    return remap


def _remap_fk(cur, table: str, tenant_id: str, remap: dict[str, str]) -> int:
    pairs = [(o, n) for o, n in remap.items() if o != n]
    if not pairs:
        return 0
    old_ids, new_ids = zip(*pairs)
    cur.execute(
        f"""
        UPDATE "{table}" AS t
        SET "customerId" = m.new_id
        FROM unnest(%s::text[], %s::text[]) AS m(old_id, new_id)
        WHERE t."customerId" = m.old_id AND t."tenantId" = %s
        """,
        (list(old_ids), list(new_ids), tenant_id),
    )
    return cur.rowcount


def _soft_delete(cur, tenant_id: str, ids: list[str]) -> int:
    if not ids:
        return 0
    cur.execute(
        """
        UPDATE "Customer" SET "deletedAt" = %s
        WHERE "tenantId" = %s AND id = ANY(%s) AND "deletedAt" IS NULL
        """,
        (_now(), tenant_id, ids),
    )
    return cur.rowcount


def _counts(cur, tenant_id: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for table in ("Customer", "Job", "Sale"):
        cur.execute(
            f'SELECT count(*) FROM "{table}" WHERE "tenantId" = %s AND "deletedAt" IS NULL',
            (tenant_id,),
        )
        out[table] = int(cur.fetchone()[0])
    return out


def dedupe_va_customers(
    tenant_id: str,
    *,
    dry_run: bool = True,
    database_url: str | None = None,
) -> dict[str, Any]:
    url = database_url or load_database_url()
    with _connect(url) as conn, conn.cursor() as cur:
        before = _counts(cur, tenant_id)
        remap = _build_customer_groups(cur, tenant_id)
        extras = sorted(set(remap.keys()))

        # How many FK rows currently point at an extra (would be remapped).
        def _fk_hits(table: str) -> int:
            if not extras:
                return 0
            cur.execute(
                f'SELECT count(*) FROM "{table}" WHERE "tenantId" = %s '
                f'AND "customerId" = ANY(%s)',
                (tenant_id, extras),
            )
            return int(cur.fetchone()[0])

        plan: dict[str, Any] = {
            "before": before,
            "duplicateGroups": len({v for v in remap.values()}),
            "extraCustomers": len(extras),
            "jobsToRemap": _fk_hits("Job"),
            "salesToRemap": _fk_hits("Sale"),
        }

        if dry_run:
            return plan

        print("Remapping Job.customerId …", flush=True)
        jobs = _remap_fk(cur, "Job", tenant_id, remap)
        print("Remapping Sale.customerId …", flush=True)
        sales = _remap_fk(cur, "Sale", tenant_id, remap)
        print(f"Soft-deleting {len(extras)} duplicate customers …", flush=True)
        deleted = _soft_delete(cur, tenant_id, extras)
        conn.commit()

        plan["remapped"] = {"jobs": jobs, "sales": sales}
        plan["softDeletedCustomers"] = deleted
        plan["after"] = _counts(cur, tenant_id)
        return plan


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Apply (default: dry-run)")
    parser.add_argument("--confirm-tenant", default="", help="Type VA to allow --execute")
    args = parser.parse_args()

    entity = get_entity(VA_CODE)
    resolve_tenant(entity)
    tenant_id = entity.tenant_id

    if args.execute and args.confirm_tenant.strip().upper() != VA_CODE:
        print(f"--execute requires --confirm-tenant {VA_CODE}", file=sys.stderr)
        return 1

    result = dedupe_va_customers(tenant_id, dry_run=not args.execute)
    print(json.dumps(result, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
