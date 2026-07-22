"""Postgres tenant resolution, banners, and batched writes."""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from migration.stock_transforms import serialize_movement_lines
from migration.types import TransformResult
from migration_registry import ENTITIES, EntityMigration

if TYPE_CHECKING:
    from migration.progress import ProgressReporter


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_database_url() -> str:
    env_path = repo_root() / "apps" / "api" / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                value = line.split("=", 1)[1].strip().strip('"').strip("'")
                if value:
                    return value
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError(
            "DATABASE_URL not found. Set apps/api/.env or export DATABASE_URL."
        )
    return url


def _connect(database_url: str):
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError(
            "Install migration deps: python3 -m venv .venv && .venv/bin/pip install -r scripts/migration/requirements.txt"
        ) from exc
    return psycopg.connect(database_url)


def list_tenants(database_url: str | None = None) -> list[dict[str, Any]]:
    url = database_url or load_database_url()
    with _connect(url) as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT id, code, name, archetype::text FROM "Tenant" WHERE "deletedAt" IS NULL ORDER BY code'
        )
        rows = cur.fetchall()
    return [
        {"id": r[0], "code": r[1], "name": r[2], "archetype": r[3]}
        for r in rows
    ]


def resolve_tenant(
    entity: EntityMigration,
    database_url: str | None = None,
) -> dict[str, Any]:
    """Look up Tenant row by code; validate id matches registry."""
    url = database_url or load_database_url()
    with _connect(url) as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT id, code, name, archetype::text FROM "Tenant" WHERE code = %s AND "deletedAt" IS NULL',
            (entity.code,),
        )
        row = cur.fetchone()
    if not row:
        raise RuntimeError(
            f"Tenant code {entity.code} not found in Postgres. Run: cd apps/api && npx prisma db seed"
        )
    tenant = {"id": row[0], "code": row[1], "name": row[2], "archetype": row[3]}
    if tenant["id"] != entity.tenant_id:
        raise RuntimeError(
            f"Tenant id mismatch for {entity.code}: DB has {tenant['id']}, registry expects {entity.tenant_id}"
        )
    return tenant


def print_banner(
    entity: EntityMigration,
    *,
    dry_run: bool,
    counts: dict[str, int] | None = None,
) -> None:
    mode = "DRY-RUN" if dry_run else "WRITE"
    print(f"\n=== {entity.code} — {entity.name} ({mode}) ===")
    print(f"Source:  {entity.source_db}")
    print(f"Target:  {entity.tenant_id} (code={entity.code})")
    print(f"Map:     {entity.map_doc}")
    if counts:
        for key, val in counts.items():
            if val:
                print(f"  {key}: {val:,}")


def confirm_tenant(entity: EntityMigration, confirm_all: bool = False) -> None:
    if confirm_all:
        return
    expected = entity.code
    typed = input(f"Type tenant code to confirm write [{expected}]: ").strip().upper()
    if typed != expected:
        raise RuntimeError(f"Confirmation failed: expected {expected}, got {typed!r}")


def _parse_dt(value: str) -> datetime:
    raw = value.strip()
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d",
    ):
        try:
            return datetime.strptime(raw[:26], fmt)
        except ValueError:
            continue
    return datetime.utcnow()


def _row_values(
    row: dict[str, Any],
    columns: list[str],
    remap: dict[str, str] | None = None,
) -> tuple[Any, ...]:
    values: list[Any] = []
    for col in columns:
        val = row.get(col)
        if remap and col in remap:
            val = row.get(remap[col])
        if col == "lines" and isinstance(val, list):
            val = json.dumps(val)
        if col in ("date", "dueDate", "createdAt", "updatedAt", "occurredAt", "expenseDate", "paidOn", "operationDate", "payrollMonth") and isinstance(val, str):
            val = _parse_dt(val)
        if col == "metadata" and isinstance(val, dict):
            val = json.dumps(val)
        if col in ("createdAt", "updatedAt") and val is None:
            val = datetime.utcnow()
        if col == "assignedStaffIds" and val is None:
            val = []
        values.append(val)
    return tuple(values)


def _insert_rows(
    cur,
    table: str,
    columns: list[str],
    rows: list[dict[str, Any]],
    *,
    remap: dict[str, str] | None = None,
    progress: ProgressReporter | None = None,
    batch_size: int = 500,
) -> int:
    if not rows:
        return 0
    col_sql = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = f'INSERT INTO "{table}" ({col_sql}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

    total = len(rows)
    label = table
    if progress:
        progress.start(f"Writing {label}", total)

    written = 0
    for offset in range(0, total, batch_size):
        batch = rows[offset : offset + batch_size]
        params = [_row_values(row, columns, remap) for row in batch]
        cur.executemany(sql, params)
        written += len(batch)
        if progress:
            progress.advance(len(batch))

    if progress:
        progress.done(f"{written:,} attempted")

    return written


def _fetch_existing_ids(cur, table: str, ids: list[str]) -> set[str]:
    if not ids:
        return set()
    cur.execute(f'SELECT id FROM "{table}" WHERE id = ANY(%s)', (ids,))
    return {row[0] for row in cur.fetchall()}


def _fetch_sale_ids_without_lines(cur, sale_ids: list[str]) -> set[str]:
    if not sale_ids:
        return set()
    cur.execute(
        '''
        SELECT s.id
        FROM "Sale" s
        LEFT JOIN "SaleLine" sl ON sl."saleId" = s.id
        WHERE s.id = ANY(%s)
        GROUP BY s.id
        HAVING COUNT(sl.id) = 0
        ''',
        (sale_ids,),
    )
    return {row[0] for row in cur.fetchall()}


def write_sale_lines_only(
    sale_lines: list[dict[str, Any]],
    database_url: str | None = None,
    progress: ProgressReporter | None = None,
) -> int:
    """Insert sale lines, validating sale + item FKs against the full database."""
    if not sale_lines:
        return 0
    url = database_url or load_database_url()
    with _connect(url) as conn, conn.cursor() as cur:
        sale_ids = _fetch_existing_ids(cur, "Sale", list({sl["saleId"] for sl in sale_lines}))
        referenced_item_ids = list({sl["itemId"] for sl in sale_lines if sl.get("itemId")})
        item_ids = _fetch_existing_ids(cur, "Item", referenced_item_ids)
        filtered = [
            sl
            for sl in sale_lines
            if sl["saleId"] in sale_ids
            and (sl.get("itemId") is None or sl["itemId"] in item_ids)
        ]
        written = _insert_rows(
            cur,
            "SaleLine",
            ["id", "saleId", "itemId", "sku", "name", "quantity", "unitPrice", "lineTotal", "discountAmount", "createdAt"],
            filtered,
            progress=progress,
        )
        conn.commit()
    return written


def repair_sale_lines(
    entity: EntityMigration,
    dump_path: Path,
    *,
    since: str | None = None,
    database_url: str | None = None,
    progress: ProgressReporter | None = None,
) -> dict[str, int]:
    """Backfill SaleLine rows for sales that were imported without line items."""
    from migration.audit_transforms import load_legacy_maps_from_postgres
    from migration.load_dump import load_tables
    from migration.transaction_transforms import run_transaction_migration

    if entity.archetype != "transaction":
        raise RuntimeError(f"{entity.code} is not transaction-centric; no sale lines to repair")

    url = database_url or load_database_url()
    existing_legacy = load_legacy_maps_from_postgres(entity.tenant_id, url)

    if progress:
        progress.phase(1, 3, f"Load MySQL tables from `{entity.source_db}`")
    tables = load_tables(dump_path, entity.source_db, entity.tables_to_load, progress=progress)

    if progress:
        progress.phase(2, 3, "Transform sale lines (backfill mode)")
    result = run_transaction_migration(
        tables,
        entity.tenant_id,
        available_for_retail=entity.available_for_retail,
        reference_prefix=f"{entity.code}-",
        since=since,
        existing_legacy=existing_legacy,
        backfill_lines=True,
    )

    candidate_sale_ids = list({sl["saleId"] for sl in result.sale_lines})
    with _connect(url) as conn, conn.cursor() as cur:
        missing_sale_ids = _fetch_sale_ids_without_lines(cur, candidate_sale_ids)

    lines_to_write = [sl for sl in result.sale_lines if sl["saleId"] in missing_sale_ids]

    if progress:
        progress.phase(3, 3, f"Write {len(lines_to_write):,} sale lines for {len(missing_sale_ids):,} sales")
        progress.message(
            f"      skipped {len(result.sale_lines) - len(lines_to_write):,} lines "
            f"(sale already has lines or not in backfill set)"
        )

    written = write_sale_lines_only(lines_to_write, url, progress=progress)
    return {
        "salesMissingLines": len(missing_sale_ids),
        "saleLinesWritten": written,
        "saleLinesTransformed": len(result.sale_lines),
        "warnings": len(result.warnings),
    }


def write_postgres(
    result: TransformResult,
    tenant_id: str,
    database_url: str | None = None,
    progress: ProgressReporter | None = None,
) -> dict[str, int]:
    url = database_url or load_database_url()
    stats: dict[str, int] = {}

    movements = [serialize_movement_lines(m) for m in result.stock_movements]
    ledger = list(result.ledger_entries)
    for entry in ledger:
        if "id" not in entry:
            entry["id"] = f"mig_{entry.get('linkedRecordId', 'ledger')}"

    with _connect(url) as conn, conn.cursor() as cur:
        if progress:
            progress.phase(3, 3, "Write to Postgres (batched inserts)")
        stats["items"] = _insert_rows(
            cur,
            "Item",
            [
                "id", "tenantId", "sku", "name", "category", "brandId", "quantity", "binLocation",
                "reorderPoint", "costPrice", "currency", "status", "availableForRetail",
                "createdByUserId", "createdByName",
                "createdAt", "updatedAt",
            ],
            result.items,
            progress=progress,
        )
        stats["customers"] = _insert_rows(
            cur,
            "Customer",
            ["id", "tenantId", "name", "email", "phone", "createdByUserId", "createdByName", "createdAt", "updatedAt"],
            result.customers,
            progress=progress,
        )
        stats["suppliers"] = _insert_rows(
            cur,
            "Supplier",
            [
                "id", "tenantId", "name", "contactName", "email", "phone", "address",
                "openingBalance", "createdByUserId", "createdByName", "createdAt", "updatedAt",
            ],
            result.suppliers,
            progress=progress,
        )
        stats["expenseCategories"] = _insert_rows(
            cur,
            "ExpenseCategory",
            ["id", "tenantId", "name", "code", "createdAt", "updatedAt"],
            [
                {
                    **cat,
                    "createdAt": cat.get("createdAt"),
                    "updatedAt": cat.get("updatedAt"),
                }
                for cat in result.expense_categories
            ],
            progress=progress,
        )
        category_ids = _fetch_existing_ids(
            cur, "ExpenseCategory", [c["id"] for c in result.expense_categories],
        )
        stats["expenses"] = _insert_rows(
            cur,
            "Expense",
            [
                "id", "tenantId", "refNo", "categoryId", "subCategory", "locationCode",
                "expenseFor", "contactName", "totalAmount", "taxAmount", "paymentStatus",
                "paymentDue", "note", "isRecurring", "recurInterval", "recurIntervalType",
                "expenseDate", "createdById", "createdAt", "updatedAt",
            ],
            [
                exp for exp in result.expenses
                if exp.get("categoryId") is None or exp["categoryId"] in category_ids
            ],
            progress=progress,
        )
        stats["payrollGroups"] = _insert_rows(
            cur,
            "PayrollGroup",
            ["id", "tenantId", "name", "createdAt", "updatedAt"],
            result.payroll_groups,
            progress=progress,
        )
        group_ids = _fetch_existing_ids(
            cur, "PayrollGroup", [g["id"] for g in result.payroll_groups],
        )
        cur.execute(
            'SELECT id FROM "PayrollGroup" WHERE "tenantId" = %s AND "deletedAt" IS NULL',
            (tenant_id,),
        )
        group_ids.update(row[0] for row in cur.fetchall())
        stats["payComponents"] = _insert_rows(
            cur,
            "PayComponent",
            ["id", "tenantId", "name", "type", "amount", "createdAt", "updatedAt"],
            result.pay_components,
            progress=progress,
        )
        stats["payrolls"] = _insert_rows(
            cur,
            "Payroll",
            [
                "id", "tenantId", "payrollGroupId", "employeeName", "employeeId", "locationCode",
                "grossPay", "totalAllowance", "totalDeduction", "netPay", "status", "paymentStatus",
                "payrollMonth", "note", "createdAt", "updatedAt",
            ],
            [
                row for row in result.payrolls
                if row.get("payrollGroupId") is None or row["payrollGroupId"] in group_ids
            ],
            progress=progress,
        )
        stats["stockMovements"] = _insert_rows(
            cur,
            "StockMovement",
            [
                "id", "tenantId", "type", "reference", "status", "lines", "notes",
                "locationCode", "supplierId", "source", "paymentStatus", "paymentMethod",
                "date", "createdByUserId", "createdByName",
                "createdAt", "updatedAt",
            ],
            movements,
            progress=progress,
        )
        stats["sales"] = _insert_rows(
            cur,
            "Sale",
            ["id", "tenantId", "reference", "customerId", "total", "currency", "status", "paymentStatus", "date", "createdByUserId", "createdByName", "createdAt", "updatedAt"],
            result.sales,
            progress=progress,
        )
        sale_ids = _fetch_existing_ids(cur, "Sale", [s["id"] for s in result.sales])
        referenced_item_ids = list({
            sl["itemId"] for sl in result.sale_lines if sl.get("itemId")
        })
        item_ids = _fetch_existing_ids(cur, "Item", referenced_item_ids)
        sale_lines_filtered = [
            sl
            for sl in result.sale_lines
            if sl["saleId"] in sale_ids
            and (sl.get("itemId") is None or sl["itemId"] in item_ids)
        ]
        stats["saleLines"] = _insert_rows(
            cur,
            "SaleLine",
            ["id", "saleId", "itemId", "sku", "name", "quantity", "unitPrice", "lineTotal", "discountAmount", "createdAt"],
            sale_lines_filtered,
            progress=progress,
        )
        stats["jobs"] = _insert_rows(
            cur,
            "Job",
            [
                "id", "tenantId", "reference", "description", "status", "hasQuote", "quoteAmount",
                "customerId", "customerName", "vehicleId", "assignedStaffIds", "dueDate",
                "createdByUserId", "createdByName",
                "createdAt", "updatedAt",
            ],
            result.jobs,
            progress=progress,
        )
        job_ids = _fetch_existing_ids(cur, "Job", [j["id"] for j in result.jobs])
        stats["jobMaterials"] = _insert_rows(
            cur,
            "JobMaterial",
            ["id", "jobId", "itemId", "name", "quantity", "unitCost", "totalCost", "source", "createdAt"],
            [m for m in result.job_materials if m["jobId"] in job_ids],
            progress=progress,
        )
        stats["jobLabours"] = _insert_rows(
            cur,
            "JobLabour",
            ["id", "jobId", "staffId", "hours", "rate", "totalCost", "createdAt"],
            [l for l in result.job_labours if l["jobId"] in job_ids],
            progress=progress,
        )
        stats["ledgerEntries"] = _insert_rows(
            cur,
            "LedgerEntry",
            [
                "id", "tenantId", "type", "amount", "currency", "category", "description",
                "linkedRecordType", "linkedRecordId", "date", "createdAt",
            ],
            ledger,
            progress=progress,
        )
        legacy_rows = [
            {
                "id": f"mig_{e['newId']}",
                "tenantId": tenant_id,
                "entityType": e["entityType"],
                "legacyId": e["legacyId"],
                "newId": e["newId"],
            }
            for e in result.legacy_ids
        ]
        stats["legacyIds"] = _insert_rows(
            cur,
            "MigrationLegacyId",
            ["id", "tenantId", "entityType", "legacyId", "newId"],
            legacy_rows,
            progress=progress,
        )
        stats["paymentAccounts"] = _insert_rows(
            cur,
            "PaymentAccount",
            [
                "id", "tenantId", "name", "accountNumber", "accountType", "accountSubType",
                "accountDetails", "note", "isClosed", "currency",
                "createdByName", "createdAt", "updatedAt",
            ],
            result.payment_accounts,
            progress=progress,
        )
        account_ids = _fetch_existing_ids(
            cur, "PaymentAccount", [a["id"] for a in result.payment_accounts],
        )
        stats["accountTransactions"] = _insert_rows(
            cur,
            "AccountTransaction",
            [
                "id", "tenantId", "accountId", "type", "subType", "amount", "refNo",
                "operationDate", "note", "paymentMethod", "paymentDetails",
                "saleId", "paymentId", "createdByName", "createdAt",
            ],
            [t for t in result.account_transactions if t["accountId"] in account_ids],
            progress=progress,
        )
        sale_ids = _fetch_existing_ids(cur, "Sale", list({p["saleId"] for p in result.payments if p.get("saleId")}))
        stats["payments"] = _insert_rows(
            cur,
            "Payment",
            [
                "id", "tenantId", "amount", "currency", "method", "paymentRefNo", "paidOn",
                "paymentFor", "accountId", "saleId", "isReturn", "note", "createdByName", "createdAt",
            ],
            [
                p for p in result.payments
                if (p.get("accountId") is None or p["accountId"] in account_ids)
                and (p.get("saleId") is None or p["saleId"] in sale_ids)
            ],
            progress=progress,
        )
        stats["productCategories"] = _insert_rows(
            cur,
            "ProductCategory",
            [
                "id", "tenantId", "name", "shortCode", "parentId", "categoryType",
                "description", "slug", "createdAt", "updatedAt",
            ],
            result.product_categories,
            progress=progress,
        )
        stats["brands"] = _insert_rows(
            cur,
            "Brand",
            ["id", "tenantId", "name", "description", "createdAt", "updatedAt"],
            result.brands,
            progress=progress,
        )
        stats["productUnits"] = _insert_rows(
            cur,
            "ProductUnit",
            ["id", "tenantId", "name", "shortName", "allowDecimal", "createdAt", "updatedAt"],
            result.product_units,
            progress=progress,
        )
        stats["warranties"] = _insert_rows(
            cur,
            "Warranty",
            ["id", "tenantId", "name", "description", "duration", "durationType", "createdAt", "updatedAt"],
            result.warranties,
            progress=progress,
        )
        stats["sellingPriceGroups"] = _insert_rows(
            cur,
            "SellingPriceGroup",
            ["id", "tenantId", "name", "description", "isActive", "createdAt", "updatedAt"],
            result.selling_price_groups,
            progress=progress,
        )
        stats["invoiceLayouts"] = _insert_rows(
            cur,
            "InvoiceLayout",
            [
                "id", "tenantId", "name", "design", "headerText", "footerText",
                "termsText", "isDefault", "createdAt", "updatedAt",
            ],
            result.invoice_layouts,
            progress=progress,
        )
        stats["invoiceSchemes"] = _insert_rows(
            cur,
            "InvoiceScheme",
            [
                "id", "tenantId", "name", "prefix", "startNumber", "invoiceCount",
                "totalDigits", "isDefault", "createdAt", "updatedAt",
            ],
            result.invoice_schemes,
            progress=progress,
        )
        if progress:
            progress.message("  Committing transaction …")
        conn.commit()

    return stats


def write_audit_logs(
    audit_logs: list[dict[str, Any]],
    tenant_id: str,
    database_url: str | None = None,
    progress: ProgressReporter | None = None,
) -> int:
    if not audit_logs:
        return 0
    url = database_url or load_database_url()
    columns = [
        "id", "tenantId", "action", "entityType", "entityId",
        "actorUserId", "actorName", "summary", "metadata", "occurredAt", "legacyLogId",
    ]
    col_sql = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = f'''
        INSERT INTO "AuditLog" ({col_sql})
        VALUES ({placeholders})
        ON CONFLICT ("tenantId", "legacyLogId") DO UPDATE SET
            "action" = EXCLUDED."action",
            "entityType" = EXCLUDED."entityType",
            "entityId" = EXCLUDED."entityId",
            "actorUserId" = EXCLUDED."actorUserId",
            "actorName" = EXCLUDED."actorName",
            "summary" = EXCLUDED."summary",
            "metadata" = EXCLUDED."metadata",
            "occurredAt" = EXCLUDED."occurredAt"
    '''

    with _connect(url) as conn, conn.cursor() as cur:
        if progress:
            progress.start("Writing AuditLog", len(audit_logs))
        written = 0
        batch_size = 500
        for offset in range(0, len(audit_logs), batch_size):
            batch = audit_logs[offset : offset + batch_size]
            params = [_row_values(row, columns) for row in batch]
            cur.executemany(sql, params)
            written += len(batch)
            if progress:
                progress.advance(len(batch))
        conn.commit()
        if progress:
            progress.done(f"{written:,} audit rows")
    return written


def run_audit_import(
    entity: EntityMigration,
    dump_path: Path,
    database_url: str | None = None,
    progress: ProgressReporter | None = None,
    *,
    since: str | None = None,
) -> dict[str, int]:
    from migration.audit_transforms import (
        build_legacy_user_name_map,
        load_existing_audit_log_ids,
        load_legacy_maps_from_postgres,
        transform_activity_logs,
    )
    from migration.load_dump import load_tables

    url = database_url or load_database_url()
    if progress:
        progress.phase(1, 2, f"Load activity_log from `{entity.source_db}`")
    tables = load_tables(
        dump_path,
        entity.source_db,
        frozenset({"activity_log", "users"}),
        progress=progress,
    )
    legacy_maps = load_legacy_maps_from_postgres(entity.tenant_id, url)
    user_names = build_legacy_user_name_map(tables)
    user_vonos = legacy_maps.get("user", {})
    existing_log_ids = load_existing_audit_log_ids(entity.tenant_id, url) if since else None

    if progress:
        progress.phase(2, 2, "Transform activity_log → AuditLog")
    result = transform_activity_logs(
        tables,
        entity.tenant_id,
        legacy_maps,
        user_names,
        user_vonos,
        since=since,
        existing_log_ids=existing_log_ids,
    )
    count = write_audit_logs(result.audit_logs, entity.tenant_id, url, progress=progress)
    return {"auditLogs": count, "warnings": len(result.warnings)}


def verify_counts_by_tenant(tenant_id: str, database_url: str | None = None) -> dict[str, int]:
    url = database_url or load_database_url()
    tables = ["Item", "Customer", "Supplier", "Sale", "StockMovement", "Job", "LedgerEntry"]
    counts: dict[str, int] = {}
    with _connect(url) as conn, conn.cursor() as cur:
        for table in tables:
            cur.execute(
                f'SELECT COUNT(*) FROM "{table}" WHERE "tenantId" = %s AND "deletedAt" IS NULL',
                (tenant_id,),
            )
            row = cur.fetchone()
            counts[table] = int(row[0]) if row else 0
    return counts


def print_registry_tenants() -> None:
    print("Legacy migration registry (seed ids):")
    for code in ENTITIES:
        e = ENTITIES[code]
        print(f"  {e.code:4} {e.tenant_id:18} {e.source_db:22} {e.archetype}")
