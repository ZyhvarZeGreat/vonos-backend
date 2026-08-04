#!/usr/bin/env python3
"""Relink migrated purchase payments to PO references for View Payments.

Legacy Ultimate POS stores:
  payment_for = supplier contact id
  payment_ref_no = PP… receipt number
  transaction_id = purchase transaction

Vonos View Payments looks up:
  paymentFor = 'purchase' AND paymentRefNo = PO…
  OR invoiceId → purchase invoice

Usage:
  python3 scripts/backfill_purchase_payment_links.py --dump localhost.sql --dry-run
  python3 scripts/backfill_purchase_payment_links.py --dump localhost.sql --write --confirm-tenant VA
"""

from __future__ import annotations

import argparse
import sys
from decimal import Decimal
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.load_dump import load_tables
from migration.pos_common import parse_decimal, parse_int, table_rows
from migration.progress import ProgressReporter
from migration.tenant_db import _connect, load_database_url
from migration_registry import HQ3_LEGACY_ID_OFFSET, VA_TENANT_ID, get_entity


def _load_legacy_maps(conn, tenant_id: str, offset: int) -> tuple[dict[int, str], dict[int, str]]:
    """Return raw MySQL id → newId for payments and stock_movements (offset stripped)."""
    payments: dict[int, str] = {}
    movements: dict[int, str] = {}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT "entityType", "legacyId", "newId"
            FROM "MigrationLegacyId"
            WHERE "tenantId" = %s
              AND "entityType" IN ('payment', 'stock_movement')
            """,
            (tenant_id,),
        )
        for entity_type, legacy_id, new_id in cur.fetchall():
            raw = int(legacy_id) - offset if int(legacy_id) >= offset else int(legacy_id)
            if entity_type == "payment":
                payments[raw] = new_id
            else:
                movements[raw] = new_id
    return payments, movements


def _movement_meta(conn, tenant_id: str) -> dict[str, dict]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT sm.id, sm.reference, sm."grandTotal", sm."supplierId",
                   i.id AS invoice_id
            FROM "StockMovement" sm
            LEFT JOIN "Invoice" i ON i."stockMovementId" = sm.id
            WHERE sm."tenantId" = %s
              AND sm."deletedAt" IS NULL
              AND sm.type = 'inbound'
            """,
            (tenant_id,),
        )
        out: dict[str, dict] = {}
        for mid, ref, total, supplier_id, invoice_id in cur.fetchall():
            out[mid] = {
                "reference": ref,
                "grandTotal": Decimal(str(total or 0)),
                "supplierId": supplier_id,
                "invoiceId": invoice_id,
            }
        return out


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
    progress.message(f"=== Backfill purchase payment ↔ PO links (VA / HQ3) [{mode}] ===")

    progress.phase(1, 3, "Load transaction_payments + transactions from dump")
    tables = load_tables(
        args.dump,
        entity.source_db,
        ["transaction_payments", "transactions"],
        progress=progress,
    )

    purchase_refs: dict[int, str] = {}
    for txn in table_rows(tables, "transactions"):
        if str(txn.get("type") or "") not in ("purchase", "opening_stock"):
            continue
        lid = parse_int(txn.get("id"))
        if lid <= 0:
            continue
        purchase_refs[lid] = str(
            txn.get("invoice_no") or txn.get("ref_no") or f"TX-{lid}"
        ).strip()

    progress.phase(2, 3, "Match dump payments → Postgres via MigrationLegacyId")
    conn = _connect(load_database_url())
    try:
        payment_legacy, movement_legacy = _load_legacy_maps(
            conn, VA_TENANT_ID, HQ3_LEGACY_ID_OFFSET
        )
        movements = _movement_meta(conn, VA_TENANT_ID)

        updates: list[dict] = []
        skipped_no_pay = 0
        skipped_no_mov = 0

        for row in table_rows(tables, "transaction_payments"):
            legacy_pay = parse_int(row.get("id"))
            legacy_tx = parse_int(row.get("transaction_id"), 0)
            if legacy_pay <= 0 or legacy_tx <= 0:
                continue
            if legacy_tx not in purchase_refs:
                continue
            pay_id = payment_legacy.get(legacy_pay)
            mov_id = movement_legacy.get(legacy_tx)
            if not pay_id:
                skipped_no_pay += 1
                continue
            if not mov_id or mov_id not in movements:
                skipped_no_mov += 1
                continue

            meta = movements[mov_id]
            po_ref = meta["reference"] or purchase_refs[legacy_tx]
            receipt = str(row.get("payment_ref_no") or "").strip()
            note = str(row.get("note") or "").strip() or None
            if receipt and receipt != po_ref:
                prefix = f"Receipt {receipt}"
                note = f"{prefix} — {note}" if note else prefix

            updates.append(
                {
                    "payId": pay_id,
                    "movId": mov_id,
                    "paymentFor": "purchase",
                    "paymentRefNo": po_ref,
                    "invoiceId": meta["invoiceId"],
                    "note": note,
                    "amount": parse_decimal(row.get("amount")),
                }
            )

        # Dedupe by payId (last wins)
        by_pay = {u["payId"]: u for u in updates}
        updates = list(by_pay.values())

        progress.message(
            f"  Candidates: {len(updates):,}  "
            f"(skip no-payment-map={skipped_no_pay:,}, "
            f"no-movement={skipped_no_mov:,})"
        )

        if args.dry_run:
            sample = updates[:5]
            for u in sample:
                progress.message(
                    f"    would link {u['payId'][:16]}… → {u['paymentRefNo']} "
                    f"(invoice={'yes' if u['invoiceId'] else 'no'})"
                )
            progress.message("Dry-run only — pass --write --confirm-tenant VA to apply")
            return 0

        progress.phase(3, 3, "Update payments + sync purchase paymentStatus")

        def reconnect():
            nonlocal conn
            try:
                conn.close()
            except Exception:
                pass
            conn = _connect(load_database_url())
            return conn

        # Skip rows already linked (makes re-runs fast after partial failures).
        already_ids: set[str] = set()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id FROM "Payment"
                WHERE "tenantId" = %s
                  AND "deletedAt" IS NULL
                  AND "paymentFor" = 'purchase'
                  AND "paymentRefNo" LIKE 'PO%%'
                """,
                (VA_TENANT_ID,),
            )
            already_ids = {r[0] for r in cur.fetchall()}

        pending = [u for u in updates if u["payId"] not in already_ids]
        # Prioritize the PO from the user's screenshot.
        pending.sort(key=lambda u: 0 if u["paymentRefNo"] == "PO2026/11092" else 1)
        progress.message(
            f"  Pending updates: {len(pending):,}  "
            f"(already linked: {len(already_ids):,})"
        )

        updated = 0
        touched_movements: set[str] = {
            u["movId"] for u in updates if u["payId"] in already_ids
        }
        i = 0
        failures = 0
        while i < len(pending):
            chunk = pending[i : i + 50]
            try:
                with conn.cursor() as cur:
                    cur.executemany(
                        """
                        UPDATE "Payment"
                        SET "paymentFor" = %s,
                            "paymentRefNo" = %s,
                            "invoiceId" = COALESCE(%s, "invoiceId"),
                            note = COALESCE(%s, note)
                        WHERE id = %s AND "tenantId" = %s AND "deletedAt" IS NULL
                        """,
                        [
                            (
                                u["paymentFor"],
                                u["paymentRefNo"],
                                u["invoiceId"],
                                u["note"],
                                u["payId"],
                                VA_TENANT_ID,
                            )
                            for u in chunk
                        ],
                    )
                conn.commit()
                for u in chunk:
                    touched_movements.add(u["movId"])
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

        # Sync paymentStatus in one SQL pass (fast + reconnect-safe).
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH paid AS (
                  SELECT p."paymentRefNo" AS ref, SUM(p.amount) AS paid
                  FROM "Payment" p
                  WHERE p."tenantId" = %s
                    AND p."deletedAt" IS NULL
                    AND p."paymentFor" = 'purchase'
                    AND p."paymentRefNo" IS NOT NULL
                  GROUP BY p."paymentRefNo"
                )
                UPDATE "StockMovement" sm
                SET "paymentStatus" = (
                  CASE
                    WHEN COALESCE(paid.paid, 0) <= 0 THEN 'due'
                    WHEN COALESCE(paid.paid, 0) + 0.001 < sm."grandTotal" THEN 'partial'
                    ELSE 'paid'
                  END
                )::"PurchasePaymentStatus"
                FROM paid
                WHERE sm."tenantId" = %s
                  AND sm."deletedAt" IS NULL
                  AND sm.type = 'inbound'
                  AND sm.reference = paid.ref
                """,
                (VA_TENANT_ID, VA_TENANT_ID),
            )
            status_updates = cur.rowcount
        conn.commit()

        progress.message(
            f"  Updated {updated:,} payments; synced paymentStatus on {status_updates:,} purchases"
        )
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
