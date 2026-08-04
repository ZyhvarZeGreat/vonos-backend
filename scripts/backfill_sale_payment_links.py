#!/usr/bin/env python3
"""Relink migrated sale payments (SP…) to Sale.saleId for View Payments.

Legacy stores transaction_id → sell transaction. Migration sometimes left
Payment.saleId null when the sale map wasn't available at insert time.

Usage:
  python3 scripts/backfill_sale_payment_links.py --dump localhost.sql --dry-run
  python3 scripts/backfill_sale_payment_links.py --dump localhost.sql --write --confirm-tenant VA
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.load_dump import load_tables
from migration.pos_common import parse_int, table_rows
from migration.progress import ProgressReporter
from migration.tenant_db import _connect, load_database_url
from migration_registry import HQ3_LEGACY_ID_OFFSET, VA_TENANT_ID, get_entity


def _load_legacy_maps(
    conn, tenant_id: str, offset: int
) -> tuple[dict[int, str], dict[int, str]]:
    payments: dict[int, str] = {}
    sales: dict[int, str] = {}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT "entityType", "legacyId", "newId"
            FROM "MigrationLegacyId"
            WHERE "tenantId" = %s
              AND "entityType" IN ('payment', 'sale')
            """,
            (tenant_id,),
        )
        for entity_type, legacy_id, new_id in cur.fetchall():
            raw = int(legacy_id) - offset if int(legacy_id) >= offset else int(legacy_id)
            if entity_type == "payment":
                payments[raw] = new_id
            else:
                sales[raw] = new_id
    return payments, sales


def _sale_invoice_ids(conn, tenant_id: str) -> dict[str, str]:
    """saleId → invoiceId"""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT "saleId", id
            FROM "Invoice"
            WHERE "tenantId" = %s AND "saleId" IS NOT NULL
            """,
            (tenant_id,),
        )
        return {sale_id: inv_id for sale_id, inv_id in cur.fetchall() if sale_id}


def main() -> int:
    entity = get_entity("HQ3")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dump", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true", default=True)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--confirm-tenant", default="")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if args.write:
        args.dry_run = False
        if args.confirm_tenant.strip().upper() != "VA":
            print("--write requires --confirm-tenant VA", file=sys.stderr)
            return 1

    if not args.dump.exists():
        print(f"Dump not found: {args.dump}", file=sys.stderr)
        return 1

    progress = ProgressReporter(enabled=not args.quiet)
    mode = "DRY-RUN" if args.dry_run else "WRITE"
    progress.message(f"=== Backfill sale payment ↔ saleId links (VA / HQ3) [{mode}] ===")

    progress.phase(1, 3, "Load transaction_payments + transactions from dump")
    tables = load_tables(
        args.dump,
        entity.source_db,
        ["transaction_payments", "transactions"],
        progress=progress,
    )

    sell_tx_ids: set[int] = set()
    for txn in table_rows(tables, "transactions"):
        if str(txn.get("type") or "") not in ("sell", "sell_return"):
            continue
        lid = parse_int(txn.get("id"))
        if lid > 0:
            sell_tx_ids.add(lid)

    progress.phase(2, 3, "Match dump payments → Postgres via MigrationLegacyId")
    conn = _connect(load_database_url())
    try:
        payment_legacy, sale_legacy = _load_legacy_maps(
            conn, VA_TENANT_ID, HQ3_LEGACY_ID_OFFSET
        )
        invoice_by_sale = _sale_invoice_ids(conn, VA_TENANT_ID)

        updates: list[dict] = []
        skipped_no_pay = 0
        skipped_no_sale = 0
        skipped_not_sell = 0

        for row in table_rows(tables, "transaction_payments"):
            legacy_pay = parse_int(row.get("id"))
            legacy_tx = parse_int(row.get("transaction_id"), 0)
            if legacy_pay <= 0 or legacy_tx <= 0:
                continue
            if legacy_tx not in sell_tx_ids:
                skipped_not_sell += 1
                continue
            pay_id = payment_legacy.get(legacy_pay)
            sale_id = sale_legacy.get(legacy_tx)
            if not pay_id:
                skipped_no_pay += 1
                continue
            if not sale_id:
                skipped_no_sale += 1
                continue
            updates.append(
                {
                    "payId": pay_id,
                    "saleId": sale_id,
                    "invoiceId": invoice_by_sale.get(sale_id),
                }
            )

        by_pay = {u["payId"]: u for u in updates}
        updates = list(by_pay.values())
        progress.message(
            f"  Candidates: {len(updates):,}  "
            f"(skip not-sell={skipped_not_sell:,}, "
            f"no-payment-map={skipped_no_pay:,}, "
            f"no-sale={skipped_no_sale:,})"
        )

        if args.dry_run:
            for u in updates[:5]:
                progress.message(
                    f"    would set saleId on {u['payId'][:16]}… "
                    f"(invoice={'yes' if u['invoiceId'] else 'no'})"
                )
            progress.message("Dry-run only — pass --write --confirm-tenant VA to apply")
            return 0

        progress.phase(3, 3, "Update Payment.saleId (+ invoiceId) + sync sale status")

        def reconnect():
            nonlocal conn
            try:
                conn.close()
            except Exception:
                pass
            conn = _connect(load_database_url())
            return conn

        # Only rows still missing saleId
        pending: list[dict] = []
        with conn.cursor() as cur:
            for u in updates:
                cur.execute(
                    """
                    SELECT "saleId", "invoiceId"
                    FROM "Payment"
                    WHERE id = %s AND "tenantId" = %s AND "deletedAt" IS NULL
                    """,
                    (u["payId"], VA_TENANT_ID),
                )
                row = cur.fetchone()
                if not row:
                    continue
                sale_id, inv_id = row
                if sale_id == u["saleId"] and (
                    inv_id == u["invoiceId"] or (inv_id and not u["invoiceId"])
                ):
                    continue
                pending.append(u)

        progress.message(f"  Pending updates: {len(pending):,}")

        updated = 0
        touched_sales: set[str] = set()
        i = 0
        failures = 0
        while i < len(pending):
            chunk = pending[i : i + 50]
            try:
                with conn.cursor() as cur:
                    cur.executemany(
                        """
                        UPDATE "Payment"
                        SET "saleId" = %s,
                            "invoiceId" = COALESCE(%s, "invoiceId")
                        WHERE id = %s
                          AND "tenantId" = %s
                          AND "deletedAt" IS NULL
                        """,
                        [
                            (u["saleId"], u["invoiceId"], u["payId"], VA_TENANT_ID)
                            for u in chunk
                        ],
                    )
                conn.commit()
                for u in chunk:
                    touched_sales.add(u["saleId"])
                updated += len(chunk)
                i += len(chunk)
                failures = 0
                if updated % 200 == 0 or i >= len(pending):
                    progress.message(
                        f"    …committed {updated:,}/{len(pending):,} remaining"
                    )
            except Exception as exc:
                failures += 1
                progress.message(f"  reconnect after error ({failures}): {exc}")
                if failures > 8:
                    raise
                reconnect()

        # Sync paymentStatus from linked payments
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH paid AS (
                  SELECT p."saleId" AS sid, SUM(p.amount) AS paid
                  FROM "Payment" p
                  WHERE p."tenantId" = %s
                    AND p."deletedAt" IS NULL
                    AND p."isReturn" = false
                    AND p."saleId" IS NOT NULL
                  GROUP BY p."saleId"
                )
                UPDATE "Sale" s
                SET "paymentStatus" = (
                  CASE
                    WHEN COALESCE(paid.paid, 0) <= 0 THEN 'due'
                    WHEN COALESCE(paid.paid, 0) + 0.001 < s.total THEN 'partial'
                    ELSE 'paid'
                  END
                )::"PaymentStatus"
                FROM paid
                WHERE s."tenantId" = %s
                  AND s."deletedAt" IS NULL
                  AND s.id = paid.sid
                """,
                (VA_TENANT_ID, VA_TENANT_ID),
            )
            status_updates = cur.rowcount
        conn.commit()

        progress.message(
            f"  Updated {updated:,} payments; synced paymentStatus on {status_updates:,} sales"
        )
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
