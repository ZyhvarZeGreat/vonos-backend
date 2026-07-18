"""Hard-delete all migrated business data for one tenant (keeps Tenant row + users)."""

from __future__ import annotations

import os
import sys

# Fix sys.path BEFORE importing anything that transitively imports stdlib `types`.
# Running this file as a script puts scripts/migration first, which shadows
# stdlib via scripts/migration/types.py.
_HERE = os.path.dirname(os.path.abspath(__file__))
_SCRIPTS = os.path.dirname(_HERE)
sys.path = [p for p in sys.path if os.path.abspath(p) != _HERE]
if _SCRIPTS not in sys.path:
    sys.path.insert(0, _SCRIPTS)

import argparse

from migration.tenant_db import _connect, load_database_url, verify_counts_by_tenant
from migration_registry import get_entity

# Children first — FK-safe hard delete for migration re-import.
WIPE_SQL = [
    'DELETE FROM "JobMaterial" WHERE "jobId" IN (SELECT id FROM "Job" WHERE "tenantId" = %s)',
    'DELETE FROM "JobLabour" WHERE "jobId" IN (SELECT id FROM "Job" WHERE "tenantId" = %s)',
    'DELETE FROM "SaleLine" WHERE "saleId" IN (SELECT id FROM "Sale" WHERE "tenantId" = %s)',
    'DELETE FROM "AccountTransaction" WHERE "tenantId" = %s',
    'DELETE FROM "Payment" WHERE "tenantId" = %s',
    'DELETE FROM "Invoice" WHERE "tenantId" = %s',
    'DELETE FROM "Sale" WHERE "tenantId" = %s',
    'DELETE FROM "StockMovement" WHERE "tenantId" = %s',
    'DELETE FROM "LedgerEntry" WHERE "tenantId" = %s',
    'DELETE FROM "Requisition" WHERE "tenantId" = %s',
    'DELETE FROM "Job" WHERE "tenantId" = %s',
    'DELETE FROM "Vehicle" WHERE "tenantId" = %s',
    'DELETE FROM "ItemLocationStock" WHERE "tenantId" = %s',
    'DELETE FROM "Expense" WHERE "tenantId" = %s',
    'DELETE FROM "ExpenseCategory" WHERE "tenantId" = %s',
    'DELETE FROM "Payroll" WHERE "tenantId" = %s',
    'DELETE FROM "PayComponent" WHERE "tenantId" = %s',
    'DELETE FROM "Employee" WHERE "tenantId" = %s',
    'DELETE FROM "Designation" WHERE "tenantId" = %s',
    'DELETE FROM "PayrollGroup" WHERE "tenantId" = %s',
    'DELETE FROM "Discount" WHERE "tenantId" = %s',
    'DELETE FROM "VariationTemplate" WHERE "tenantId" = %s',
    'DELETE FROM "Item" WHERE "tenantId" = %s',
    'DELETE FROM "Customer" WHERE "tenantId" = %s',
    'DELETE FROM "CustomerGroup" WHERE "tenantId" = %s',
    'DELETE FROM "Supplier" WHERE "tenantId" = %s',
    'DELETE FROM "PaymentAccount" WHERE "tenantId" = %s',
    'DELETE FROM "MigrationLegacyId" WHERE "tenantId" = %s',
    'DELETE FROM "AuditLog" WHERE "tenantId" = %s',
    'DELETE FROM "ProductCategory" WHERE "tenantId" = %s',
    'DELETE FROM "Brand" WHERE "tenantId" = %s',
    'DELETE FROM "ProductUnit" WHERE "tenantId" = %s',
    'DELETE FROM "Warranty" WHERE "tenantId" = %s',
    'DELETE FROM "SellingPriceGroup" WHERE "tenantId" = %s',
    'DELETE FROM "Appointment" WHERE "tenantId" = %s',
    'DELETE FROM "CafeTable" WHERE "tenantId" = %s',
    'DELETE FROM "SalonService" WHERE "tenantId" = %s',
    'DELETE FROM "Notification" WHERE "tenantId" = %s',
]


def wipe_tenant(tenant_id: str, *, dry_run: bool = False) -> dict[str, int]:
    url = load_database_url()
    before = verify_counts_by_tenant(tenant_id, url)
    deleted: dict[str, int] = {}

    if dry_run:
        print(f"DRY-RUN wipe {tenant_id} — current counts: {before}")
        return before

    with _connect(url) as conn, conn.cursor() as cur:
        for sql in WIPE_SQL:
            cur.execute(sql, (tenant_id,))
            table = sql.split('"')[1]
            deleted[table] = cur.rowcount
        conn.commit()

    after = verify_counts_by_tenant(tenant_id, url)
    print(f"Wiped {tenant_id}")
    print(f"  Before: {before}")
    print(f"  After:  {after}")
    return after


def main() -> int:
    parser = argparse.ArgumentParser(description="Hard-delete migrated business data for one tenant")
    parser.add_argument("code", help="Entity code (e.g. VA, VW)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    entity = get_entity(args.code.upper())
    wipe_tenant(entity.tenant_id, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
