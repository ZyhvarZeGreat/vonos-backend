"""Remove duplicate rows from repeated migration imports for one tenant.

Keeps canonical rows from MigrationLegacyId, remaps foreign keys, then soft-deletes
extras. Ledger rows are kept only when linked to an existing Sale.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from migration.tenant_db import _connect, load_database_url, resolve_tenant, verify_counts_by_tenant
from migration_registry import get_entity


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _load_legacy_canonical(cur, tenant_id: str) -> dict[str, set[str]]:
    cur.execute(
        '''
        SELECT "entityType", "newId"
        FROM "MigrationLegacyId"
        WHERE "tenantId" = %s
        ''',
        (tenant_id,),
    )
    canonical: dict[str, set[str]] = defaultdict(set)
    for entity_type, new_id in cur.fetchall():
        canonical[entity_type].add(new_id)
    item_ids = set(canonical.get("item", set())) | set(canonical.get("product", set()))
    canonical["item"] = item_ids
    return canonical


def _extra_counts(cur, tenant_id: str) -> dict[str, int]:
    tables = [
        "Item",
        "Customer",
        "Supplier",
        "Sale",
        "Payment",
        "PaymentAccount",
        "AccountTransaction",
        "LedgerEntry",
    ]
    out: dict[str, int] = {}
    for table in tables:
        if table in ("AccountTransaction",):
            cur.execute(f'SELECT COUNT(*) FROM "{table}" WHERE "tenantId" = %s', (tenant_id,))
        elif table in ("Payment", "PaymentAccount"):
            cur.execute(
                f'SELECT COUNT(*) FROM "{table}" WHERE "tenantId" = %s AND "deletedAt" IS NULL',
                (tenant_id,),
            )
        else:
            cur.execute(
                f'SELECT COUNT(*) FROM "{table}" WHERE "tenantId" = %s AND "deletedAt" IS NULL',
                (tenant_id,),
            )
        row = cur.fetchone()
        out[table] = int(row[0]) if row else 0

    cur.execute(
        '''
        SELECT COUNT(*) FROM "SaleLine" sl
        JOIN "Sale" s ON s.id = sl."saleId"
        WHERE s."tenantId" = %s AND s."deletedAt" IS NULL
        ''',
        (tenant_id,),
    )
    row = cur.fetchone()
    out["SaleLine"] = int(row[0]) if row else 0
    return out


def _build_sku_remap(cur, tenant_id: str, canonical_item_ids: set[str]) -> dict[str, str]:
    if not canonical_item_ids:
        return {}
    cur.execute(
        '''
        SELECT sku, array_agg(id ORDER BY
          CASE WHEN id = ANY(%s) THEN 0 ELSE 1 END,
          "createdAt", id
        ) AS ids
        FROM "Item"
        WHERE "tenantId" = %s AND "deletedAt" IS NULL
        GROUP BY sku
        HAVING COUNT(*) > 1
        ''',
        (list(canonical_item_ids), tenant_id),
    )
    remap: dict[str, str] = {}
    for _sku, ids in cur.fetchall():
        keeper = ids[0]
        for dup_id in ids[1:]:
            remap[dup_id] = keeper
    return remap


def _build_contact_remap(
    cur,
    tenant_id: str,
    table: str,
    canonical_ids: set[str],
) -> dict[str, str]:
    if not canonical_ids:
        return {}
    cur.execute(
        f'''
        SELECT lower(trim(name)) AS n,
               coalesce(lower(trim(phone)), '') AS p,
               array_agg(id ORDER BY
                 CASE WHEN id = ANY(%s) THEN 0 ELSE 1 END,
                 "createdAt", id
               ) AS ids
        FROM "{table}"
        WHERE "tenantId" = %s AND "deletedAt" IS NULL
        GROUP BY 1, 2
        HAVING COUNT(*) > 1
        ''',
        (list(canonical_ids), tenant_id),
    )
    remap: dict[str, str] = {}
    for _n, _p, ids in cur.fetchall():
        keeper = ids[0]
        for dup_id in ids[1:]:
            remap[dup_id] = keeper
    return remap


def _build_payment_account_remap(cur, tenant_id: str, canonical_ids: set[str]) -> dict[str, str]:
    if not canonical_ids:
        return {}
    cur.execute(
        '''
        SELECT lower(trim(name)) AS n,
               coalesce("accountNumber", '') AS num,
               array_agg(id ORDER BY
                 CASE WHEN id = ANY(%s) THEN 0 ELSE 1 END,
                 "createdAt", id
               ) AS ids
        FROM "PaymentAccount"
        WHERE "tenantId" = %s
        GROUP BY 1, 2
        HAVING COUNT(*) > 1
        ''',
        (list(canonical_ids), tenant_id),
    )
    remap: dict[str, str] = {}
    for _n, _num, ids in cur.fetchall():
        keeper = ids[0]
        for dup_id in ids[1:]:
            remap[dup_id] = keeper
    return remap


def _build_payment_remap(cur, tenant_id: str, canonical_ids: set[str]) -> dict[str, str]:
    if not canonical_ids:
        return {}
    cur.execute(
        '''
        SELECT coalesce("saleId", '') AS sid,
               amount,
               coalesce("paidOn"::date::text, '') AS paid,
               coalesce("paymentRefNo", '') AS ref,
               array_agg(id ORDER BY
                 CASE WHEN id = ANY(%s) THEN 0 ELSE 1 END,
                 "createdAt", id
               ) AS ids
        FROM "Payment"
        WHERE "tenantId" = %s AND "deletedAt" IS NULL
        GROUP BY 1, 2, 3, 4
        HAVING COUNT(*) > 1
        ''',
        (list(canonical_ids), tenant_id),
    )
    remap: dict[str, str] = {}
    for _sid, _amt, _paid, _ref, ids in cur.fetchall():
        keeper = ids[0]
        for dup_id in ids[1:]:
            remap[dup_id] = keeper
    return remap


def _apply_id_remap(
    cur,
    table: str,
    column: str,
    remap: dict[str, str],
    *,
    tenant_id: str | None = None,
    tenant_column: str = "tenantId",
) -> int:
    if not remap:
        return 0
    pairs = [(old_id, new_id) for old_id, new_id in remap.items() if old_id != new_id]
    if not pairs:
        return 0
    old_ids, new_ids = zip(*pairs)
    tenant_filter = f'AND t."{tenant_column}" = %s' if tenant_id else ""
    params: list[Any] = [list(old_ids), list(new_ids)]
    if tenant_id:
        params.append(tenant_id)
    cur.execute(
        f'''
        UPDATE "{table}" AS t
        SET "{column}" = m.new_id
        FROM unnest(%s::text[], %s::text[]) AS m(old_id, new_id)
        WHERE t."{column}" = m.old_id
        {tenant_filter}
        ''',
        params,
    )
    return cur.rowcount


def _apply_sale_line_item_remap(cur, tenant_id: str, remap: dict[str, str]) -> int:
    if not remap:
        return 0
    pairs = [(old_id, new_id) for old_id, new_id in remap.items() if old_id != new_id]
    if not pairs:
        return 0
    old_ids, new_ids = zip(*pairs)
    cur.execute(
        '''
        UPDATE "SaleLine" AS sl
        SET "itemId" = m.new_id
        FROM unnest(%s::text[], %s::text[]) AS m(old_id, new_id),
             "Sale" AS s
        WHERE s.id = sl."saleId"
          AND s."tenantId" = %s
          AND sl."itemId" = m.old_id
        ''',
        (list(old_ids), list(new_ids), tenant_id),
    )
    return cur.rowcount


def _soft_delete_ids(
    cur,
    table: str,
    tenant_id: str,
    ids: list[str],
    *,
    has_deleted_at: bool = True,
) -> int:
    if not ids:
        return 0
    if has_deleted_at:
        cur.execute(
            f'''
            UPDATE "{table}"
            SET "deletedAt" = %s
            WHERE "tenantId" = %s AND id = ANY(%s) AND "deletedAt" IS NULL
            ''',
            (_now(), tenant_id, ids),
        )
    else:
        cur.execute(f'DELETE FROM "{table}" WHERE "tenantId" = %s AND id = ANY(%s)', (tenant_id, ids))
    return cur.rowcount


def _drop_duplicate_group_extras(cur, tenant_id: str, sql: str, params: tuple[Any, ...]) -> list[str]:
    cur.execute(sql, params)
    drop: list[str] = []
    for (ids,) in cur.fetchall():
        drop.extend(ids[1:])
    return drop


def _drop_items_by_sku(cur, tenant_id: str, canonical_item_ids: set[str]) -> list[str]:
    return _drop_duplicate_group_extras(
        cur,
        tenant_id,
        '''
        SELECT array_agg(id ORDER BY
          CASE WHEN id = ANY(%s) THEN 0 ELSE 1 END,
          "createdAt", id
        ) AS ids
        FROM "Item"
        WHERE "tenantId" = %s AND "deletedAt" IS NULL
        GROUP BY sku
        HAVING COUNT(*) > 1
        ''',
        (list(canonical_item_ids), tenant_id),
    )


def _drop_contacts_by_identity(
    cur, tenant_id: str, table: str, canonical_ids: set[str],
) -> list[str]:
    return _drop_duplicate_group_extras(
        cur,
        tenant_id,
        f'''
        SELECT array_agg(id ORDER BY
          CASE WHEN id = ANY(%s) THEN 0 ELSE 1 END,
          "createdAt", id
        ) AS ids
        FROM "{table}"
        WHERE "tenantId" = %s AND "deletedAt" IS NULL
        GROUP BY lower(trim(name)), coalesce(lower(trim(phone)), '')
        HAVING COUNT(*) > 1
        ''',
        (list(canonical_ids), tenant_id),
    )


def _drop_payment_accounts(cur, tenant_id: str, canonical_ids: set[str]) -> list[str]:
    return _drop_duplicate_group_extras(
        cur,
        tenant_id,
        '''
        SELECT array_agg(id ORDER BY
          CASE WHEN id = ANY(%s) THEN 0 ELSE 1 END,
          "createdAt", id
        ) AS ids
        FROM "PaymentAccount"
        WHERE "tenantId" = %s
        GROUP BY lower(trim(name)), coalesce("accountNumber", '')
        HAVING COUNT(*) > 1
        ''',
        (list(canonical_ids), tenant_id),
    )


def _drop_payments(cur, tenant_id: str, canonical_ids: set[str]) -> list[str]:
    return _drop_duplicate_group_extras(
        cur,
        tenant_id,
        '''
        SELECT array_agg(id ORDER BY
          CASE WHEN id = ANY(%s) THEN 0 ELSE 1 END,
          "createdAt", id
        ) AS ids
        FROM "Payment"
        WHERE "tenantId" = %s AND "deletedAt" IS NULL
        GROUP BY coalesce("saleId", ''), amount, coalesce("paidOn"::date::text, ''),
                 coalesce("paymentRefNo", '')
        HAVING COUNT(*) > 1
        ''',
        (list(canonical_ids), tenant_id),
    )


def dedupe_tenant(
    tenant_id: str,
    *,
    dry_run: bool = True,
    database_url: str | None = None,
) -> dict[str, Any]:
    url = database_url or load_database_url()

    with _connect(url) as conn, conn.cursor() as cur:
        before = _extra_counts(cur, tenant_id)
        canonical = _load_legacy_canonical(cur, tenant_id)

        item_remap = _build_sku_remap(cur, tenant_id, canonical.get("item", set()))
        customer_remap = _build_contact_remap(cur, tenant_id, "Customer", canonical.get("customer", set()))
        supplier_remap = _build_contact_remap(cur, tenant_id, "Supplier", canonical.get("supplier", set()))
        account_remap = _build_payment_account_remap(
            cur, tenant_id, canonical.get("payment_account", set()),
        )
        payment_remap = _build_payment_remap(cur, tenant_id, canonical.get("payment", set()))

        cur.execute(
            '''
            SELECT le.id
            FROM "LedgerEntry" le
            LEFT JOIN "Sale" s ON s.id = le."linkedRecordId" AND s."tenantId" = le."tenantId"
            WHERE le."tenantId" = %s
              AND le."deletedAt" IS NULL
              AND le."linkedRecordType" = 'sale'
              AND (s.id IS NULL OR s."deletedAt" IS NOT NULL)
            ''',
            (tenant_id,),
        )
        orphan_ledger_ids = [row[0] for row in cur.fetchall()]

        cur.execute(
            '''
            SELECT le."linkedRecordId", array_agg(le.id ORDER BY
              CASE WHEN le.id = 'mig_' || le."linkedRecordId" THEN 0 ELSE 1 END,
              le."createdAt", le.id
            ) AS ids
            FROM "LedgerEntry" le
            JOIN "Sale" s ON s.id = le."linkedRecordId"
            WHERE le."tenantId" = %s
              AND le."deletedAt" IS NULL
              AND le."linkedRecordType" = 'sale'
              AND s."deletedAt" IS NULL
            GROUP BY le."linkedRecordId"
            HAVING COUNT(*) > 1
            ''',
            (tenant_id,),
        )
        dup_ledger_ids: list[str] = []
        for _sale_id, ids in cur.fetchall():
            dup_ledger_ids.extend(ids[1:])

        drop_items = _drop_items_by_sku(cur, tenant_id, canonical.get("item", set()))
        drop_customers = _drop_contacts_by_identity(
            cur, tenant_id, "Customer", canonical.get("customer", set()),
        )
        drop_suppliers = _drop_contacts_by_identity(
            cur, tenant_id, "Supplier", canonical.get("supplier", set()),
        )
        drop_accounts = _drop_payment_accounts(cur, tenant_id, canonical.get("payment_account", set()))
        drop_payments = _drop_payments(cur, tenant_id, canonical.get("payment", set()))

        cur.execute(
            '''
            SELECT array_agg(id ORDER BY "createdAt", id) AS ids
            FROM "AccountTransaction"
            WHERE "tenantId" = %s
            GROUP BY "accountId", "operationDate", amount, type,
                     coalesce("refNo", ''), coalesce("note", '')
            HAVING COUNT(*) > 1
            ''',
            (tenant_id,),
        )
        dup_account_tx_ids: list[str] = []
        for (ids,) in cur.fetchall():
            dup_account_tx_ids.extend(ids[1:])

        cur.execute(
            '''
            SELECT array_agg(sl.id ORDER BY sl."createdAt", sl.id) AS ids
            FROM "SaleLine" sl
            JOIN "Sale" s ON s.id = sl."saleId"
            WHERE s."tenantId" = %s AND s."deletedAt" IS NULL
            GROUP BY sl."saleId", sl.sku
            HAVING COUNT(*) > 1
            ''',
            (tenant_id,),
        )
        dup_sale_line_ids: list[str] = []
        for (ids,) in cur.fetchall():
            dup_sale_line_ids.extend(ids[1:])

        plan: dict[str, Any] = {
            "before": before,
            "remaps": {
                "items": len(item_remap),
                "customers": len(customer_remap),
                "suppliers": len(supplier_remap),
                "paymentAccounts": len(account_remap),
                "payments": len(payment_remap),
            },
            "softDelete": {
                "items": len(drop_items),
                "customers": len(drop_customers),
                "suppliers": len(drop_suppliers),
                "paymentAccounts": len(drop_accounts),
                "payments": len(drop_payments),
                "orphanLedger": len(orphan_ledger_ids),
                "duplicateLedger": len(dup_ledger_ids),
                "duplicateAccountTransactions": len(dup_account_tx_ids),
                "duplicateSaleLines": len(dup_sale_line_ids),
            },
        }

        if dry_run:
            return plan

        print("Remapping foreign keys …", flush=True)
        fk_updates = {
            "Sale.customerId": _apply_id_remap(
                cur, "Sale", "customerId", customer_remap, tenant_id=tenant_id,
            ),
            "SaleLine.itemId": _apply_sale_line_item_remap(cur, tenant_id, item_remap),
            "Payment.accountId": _apply_id_remap(
                cur, "Payment", "accountId", account_remap, tenant_id=tenant_id,
            ),
            "AccountTransaction.accountId": _apply_id_remap(
                cur, "AccountTransaction", "accountId", account_remap, tenant_id=tenant_id,
            ),
            "AccountTransaction.paymentId": _apply_id_remap(
                cur, "AccountTransaction", "paymentId", payment_remap, tenant_id=tenant_id,
            ),
        }

        # Re-detect account-transaction duplicates after FK remaps collapse accountId groups.
        cur.execute(
            '''
            SELECT array_agg(id ORDER BY "createdAt", id) AS ids
            FROM "AccountTransaction"
            WHERE "tenantId" = %s
            GROUP BY "accountId", "operationDate", amount, type,
                     coalesce("refNo", ''), coalesce("note", '')
            HAVING COUNT(*) > 1
            ''',
            (tenant_id,),
        )
        dup_account_tx_ids = []
        for (ids,) in cur.fetchall():
            dup_account_tx_ids.extend(ids[1:])
        plan["softDelete"]["duplicateAccountTransactions"] = len(dup_account_tx_ids)

        print("Soft-deleting duplicate rows …", flush=True)
        deleted = {
            "orphanLedger": _soft_delete_ids(cur, "LedgerEntry", tenant_id, orphan_ledger_ids + dup_ledger_ids),
            "items": _soft_delete_ids(cur, "Item", tenant_id, drop_items),
            "customers": _soft_delete_ids(cur, "Customer", tenant_id, drop_customers),
            "suppliers": _soft_delete_ids(cur, "Supplier", tenant_id, drop_suppliers),
            "paymentAccounts": _soft_delete_ids(
                cur, "PaymentAccount", tenant_id, drop_accounts, has_deleted_at=False,
            ),
            "payments": _soft_delete_ids(cur, "Payment", tenant_id, drop_payments),
            "accountTransactions": _soft_delete_ids(
                cur, "AccountTransaction", tenant_id, dup_account_tx_ids, has_deleted_at=False,
            ),
        }
        if dup_sale_line_ids:
            cur.execute('DELETE FROM "SaleLine" WHERE id = ANY(%s)', (dup_sale_line_ids,))
            deleted["saleLines"] = cur.rowcount

        conn.commit()
        print("Done.", flush=True)
        plan["fkUpdates"] = fk_updates
        plan["deleted"] = deleted
        plan["after"] = _extra_counts(cur, tenant_id)
        return plan


def main() -> int:
    parser = argparse.ArgumentParser(description="Dedupe repeated migration imports for one tenant")
    parser.add_argument("--tenant-code", default="VISP", help="Tenant code (VISP, VSP, VC, …)")
    parser.add_argument(
        "--tenant-id",
        default="",
        help="Target tenant id directly (e.g. tenant_vss_001 during VSS→VISP remediation)",
    )
    parser.add_argument("--execute", action="store_true", help="Apply dedupe (default is dry-run)")
    parser.add_argument("--confirm-tenant", default="", help="Type tenant code to allow --execute")
    args = parser.parse_args()

    confirm_code = args.tenant_code.strip().upper()
    if args.tenant_id.strip():
        tenant_id = args.tenant_id.strip()
    else:
        entity = get_entity(confirm_code)
        resolve_tenant(entity)
        tenant_id = entity.tenant_id

    dry_run = not args.execute
    if args.execute and args.confirm_tenant.strip().upper() != confirm_code:
        print(f"--execute requires --confirm-tenant {confirm_code}", file=sys.stderr)
        return 1

    result = dedupe_tenant(tenant_id, dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))

    if not dry_run:
        print(f"Verify: {json.dumps(verify_counts_by_tenant(tenant_id))}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
