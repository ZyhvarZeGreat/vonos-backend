#!/usr/bin/env python3
"""Audit phpMyAdmin MySQL dump(s) for Ultimate POS migration."""

from __future__ import annotations

import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

# Canonical Ultimate POS core schema (77 tables, base install)
ULTIMATE_POS_77 = {
    "accounts",
    "account_transactions",
    "account_types",
    "activity_log",
    "barcodes",
    "bookings",
    "brands",
    "business",
    "business_locations",
    "cash_denominations",
    "cash_registers",
    "cash_register_transactions",
    "categories",
    "categorizables",
    "contacts",
    "currencies",
    "customer_groups",
    "dashboard_configurations",
    "discounts",
    "discount_variations",
    "document_and_notes",
    "expense_categories",
    "group_sub_taxes",
    "invoice_layouts",
    "invoice_schemes",
    "media",
    "migrations",
    "model_has_permissions",
    "model_has_roles",
    "notifications",
    "notification_templates",
    "oauth_access_tokens",
    "oauth_auth_codes",
    "oauth_clients",
    "oauth_personal_access_clients",
    "oauth_refresh_tokens",
    "password_resets",
    "permissions",
    "printers",
    "products",
    "product_locations",
    "product_racks",
    "product_variations",
    "purchase_lines",
    "reference_counts",
    "res_product_modifier_sets",
    "res_tables",
    "roles",
    "role_has_permissions",
    "selling_price_groups",
    "sell_line_warranties",
    "sessions",
    "stock_adjustments_temp",
    "stock_adjustment_lines",
    "system",
    "tax_rates",
    "transactions",
    "transaction_payments",
    "transaction_sell_lines",
    "transaction_sell_lines_purchase_lines",
    "types_of_services",
    "units",
    "users",
    "user_contact_access",
    "variations",
    "variation_group_prices",
    "variation_location_details",
    "variation_templates",
    "variation_value_templates",
    "warranties",
}

CORE_TABLES = [
    "transactions",
    "products",
    "variations",
    "variation_location_details",
    "contacts",
    "business_locations",
    "business",
]

INSERT_RE = re.compile(r"^INSERT INTO `([^`]+)`")
CREATE_RE = re.compile(r"^CREATE TABLE(?: IF NOT EXISTS)? `([^`]+)`")
USE_RE = re.compile(r"^USE `([^`]+)`")
CREATE_DB_RE = re.compile(r"^CREATE DATABASE IF NOT EXISTS `([^`]+)`")
# Single-db phpMyAdmin exports often omit USE; they only have a header comment.
DATABASE_COMMENT_RE = re.compile(r"^-- Database: `([^`]+)`")
TUPLE_START_RE = re.compile(r"^\((.+)$")

# Map DB name patterns -> Vonos entity code (best-effort)
DB_ENTITY_MAP = {
    "vonomglk_cafe": "VC",
    "vonomglk_hq2": "VW_HQ",
    "vonomglk_hq3temp": "VW_HQ_TEMP",
    "vonomglk_OLD_hq2": "VW_HQ_OLD",
    "vonomglk_OPS": "VMS",
    "vonomglk_Quotation": "VM",
    "vonomglk_spmarket": "VSP",
    "vonomglk_vsp": "VISP",
    "vonomglk_gp": "VAG",
    "vonomglk_audit": "VW",
    "vonomglk_vonos_institute": "INSTITUTE",
    "vonomglk_wp847": "WP",
}


@dataclass
class TableInfo:
    name: str
    columns: list[tuple[str, str]] = field(default_factory=list)
    row_count: int = 0
    in_create: bool = False
  # transaction field samples
    tx_type: Counter = field(default_factory=Counter)
    tx_status: Counter = field(default_factory=Counter)
    tx_sub_status: Counter = field(default_factory=Counter)
    tx_payment_status: Counter = field(default_factory=Counter)
    tx_res_order_status: Counter = field(default_factory=Counter)
    tx_dates: list[str] = field(default_factory=list)
    contact_type: Counter = field(default_factory=Counter)
    vld_qty_nonzero: int = 0
    vld_qty_zero: int = 0
    vld_qty_null: int = 0
    product_names_sample: list[str] = field(default_factory=list)


@dataclass
class DatabaseAudit:
    name: str
    entity_code: str
    business_name: str | None = None
    tables: dict[str, TableInfo] = field(default_factory=dict)
    line_start: int = 0
    line_end: int = 0


def parse_column_def(line: str) -> tuple[str, str] | None:
    line = line.strip().rstrip(",")
    if not line.startswith("`"):
        return None
    m = re.match(r"`([^`]+)`\s+(.+)", line)
    if not m:
        return None
    col, rest = m.group(1), m.group(2)
    dtype = rest.split("COMMENT")[0].strip()
    return col, dtype


def count_tuples_in_line(line: str) -> int:
    """Count value tuples in an INSERT line (handles multiple tuples per line)."""
    # Rough but effective: count '),(' patterns + 1 if line starts with (
    if not line.strip():
        return 0
    s = line.strip()
    if s.endswith(";"):
        s = s[:-1]
    if not s.startswith("("):
        return 0
    return s.count("),(") + 1


def split_sql_values(tuple_body: str) -> list[str | None]:
    """Split SQL VALUES tuple respecting quoted strings."""
    values: list[str | None] = []
    i = 0
    n = len(tuple_body)
    while i < n:
        while i < n and tuple_body[i] in " \t":
            i += 1
        if i >= n:
            break
        if i < n and tuple_body[i] == ",":
            i += 1
            continue
        if tuple_body[i : i + 4] == "NULL":
            values.append(None)
            i += 4
            continue
        if tuple_body[i] == "'":
            i += 1
            buf: list[str] = []
            while i < n:
                c = tuple_body[i]
                if c == "\\" and i + 1 < n:
                    buf.append(tuple_body[i + 1])
                    i += 2
                    continue
                if c == "'":
                    if i + 1 < n and tuple_body[i + 1] == "'":
                        buf.append("'")
                        i += 2
                        continue
                    i += 1
                    break
                buf.append(c)
                i += 1
            values.append("".join(buf))
            continue
        # unquoted number
        j = i
        while j < n and tuple_body[j] not in ",)":
            j += 1
        values.append(tuple_body[i:j].strip())
        i = j
    return values


def extract_tuples_from_insert_line(line: str) -> list[str]:
    """Return list of tuple bodies (without outer parens) from INSERT line."""
    idx = line.find("VALUES")
    if idx == -1:
        return []
    rest = line[idx + 6 :].strip()
    if rest.endswith(";"):
        rest = rest[:-1]
    tuples: list[str] = []
    depth = 0
    start = -1
    in_str = False
    esc = False
    for i, c in enumerate(rest):
        if esc:
            esc = False
            continue
        if c == "\\" and in_str:
            esc = True
            continue
        if c == "'" and not esc:
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == "(":
            if depth == 0:
                start = i + 1
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0 and start >= 0:
                tuples.append(rest[start:i])
                start = -1
    return tuples


def process_transaction_row(values: list[str | None], col_index: dict[str, int], table: TableInfo) -> None:
    def get(col: str) -> str | None:
        i = col_index.get(col)
        if i is None or i >= len(values):
            return None
        v = values[i]
        return None if v is None else str(v)

    t = get("type")
    if t:
        table.tx_type[t] += 1
    s = get("status")
    if s:
        table.tx_status[s] += 1
    ss = get("sub_status")
    if ss:
        table.tx_sub_status[ss] += 1
    ps = get("payment_status")
    if ps:
        table.tx_payment_status[ps] += 1
    ros = get("res_order_status")
    if ros:
        table.tx_res_order_status[ros] += 1
    td = get("transaction_date")
    if td and len(table.tx_dates) < 500000:
        table.tx_dates.append(td[:10])


def process_contact_row(values: list[str | None], col_index: dict[str, int], table: TableInfo) -> None:
    i = col_index.get("type")
    if i is not None and i < len(values) and values[i]:
        table.contact_type[str(values[i])] += 1


def process_vld_row(values: list[str | None], col_index: dict[str, int], table: TableInfo) -> None:
    i = col_index.get("qty_available")
    if i is None or i >= len(values):
        return
    v = values[i]
    if v is None:
        table.vld_qty_null += 1
    elif v in ("0", "0.0000", "0.00", "0.0"):
        table.vld_qty_zero += 1
    else:
        try:
            if float(v) == 0:
                table.vld_qty_zero += 1
            else:
                table.vld_qty_nonzero += 1
        except ValueError:
            table.vld_qty_nonzero += 1


def process_product_row(values: list[str | None], col_index: dict[str, int], table: TableInfo) -> None:
    if len(table.product_names_sample) >= 20:
        return
    i = col_index.get("name")
    if i is not None and i < len(values) and values[i]:
        table.product_names_sample.append(str(values[i]))


def process_insert_tuples(
    line: str,
    table_name: str,
    col_index: dict[str, int],
    db: DatabaseAudit,
) -> None:
    ti = db.tables[table_name]
    # Strip INSERT prefix if present
    if line.lstrip().startswith("INSERT"):
        idx = line.find("VALUES")
        payload = line[idx + 6 :] if idx != -1 else line
    else:
        payload = line
    n = count_tuples_in_line(payload)
    if n == 0:
        return
    ti.row_count += n

    if table_name in ("transactions", "contacts", "variation_location_details", "products", "business"):
        for tup in extract_tuples_from_insert_line(
            f"VALUES {payload}" if "VALUES" not in payload else payload
        ):
            vals = split_sql_values(tup)
            if table_name == "transactions":
                process_transaction_row(vals, col_index, ti)
            elif table_name == "contacts":
                process_contact_row(vals, col_index, ti)
            elif table_name == "variation_location_details":
                process_vld_row(vals, col_index, ti)
            elif table_name == "products":
                process_product_row(vals, col_index, ti)
            elif table_name == "business" and not db.business_name:
                i = col_index.get("name")
                if i is not None and i < len(vals) and vals[i]:
                    db.business_name = str(vals[i])


def audit_dump(path: Path) -> dict[str, DatabaseAudit]:
    databases: dict[str, DatabaseAudit] = {}
    current_db: str | None = None
    current_table: str | None = None
    in_create = False
    col_index: dict[str, int] = {}
    pending_insert_table: str | None = None
    pending_col_index: dict[str, int] = {}

    with path.open("r", encoding="utf-8", errors="replace") as f:
        for line_no, line in enumerate(f, 1):
            m = CREATE_DB_RE.match(line)
            if m:
                dbname = m.group(1)
                if dbname not in databases:
                    databases[dbname] = DatabaseAudit(
                        name=dbname,
                        entity_code=DB_ENTITY_MAP.get(dbname, dbname.upper()),
                        line_start=line_no,
                    )
                continue

            m = USE_RE.match(line)
            if m:
                current_db = m.group(1)
                if current_db not in databases:
                    databases[current_db] = DatabaseAudit(
                        name=current_db,
                        entity_code=DB_ENTITY_MAP.get(current_db, current_db.upper()),
                        line_start=line_no,
                    )
                databases[current_db].line_end = line_no
                in_create = False
                current_table = None
                pending_insert_table = None
                pending_col_index = {}
                continue

            m = DATABASE_COMMENT_RE.match(line.strip())
            if m:
                dbname = m.group(1)
                if dbname not in databases:
                    databases[dbname] = DatabaseAudit(
                        name=dbname,
                        entity_code=DB_ENTITY_MAP.get(dbname, dbname.upper()),
                        line_start=line_no,
                    )
                if current_db is None:
                    current_db = dbname
                databases[dbname].line_end = line_no
                continue

            if current_db is None:
                continue

            db = databases[current_db]
            db.line_end = line_no

            m = CREATE_RE.match(line)
            if m:
                tname = m.group(1)
                current_table = tname
                in_create = True
                if tname not in db.tables:
                    db.tables[tname] = TableInfo(name=tname)
                continue

            if in_create and current_table:
                ti = db.tables[current_table]
                if line.strip().startswith(")"):
                    in_create = False
                    col_index = {c: i for i, (c, _) in enumerate(ti.columns)}
                    current_table = None
                    continue
                col = parse_column_def(line)
                if col:
                    ti.columns.append(col)
                continue

            m = INSERT_RE.match(line)
            if m:
                tname = m.group(1)
                if tname not in db.tables:
                    db.tables[tname] = TableInfo(name=tname)
                pending_insert_table = tname
                pending_col_index = {c: i for i, (c, _) in enumerate(db.tables[tname].columns)}
                process_insert_tuples(line, tname, pending_col_index, db)
                if line.rstrip().endswith(";"):
                    pending_insert_table = None
                    pending_col_index = {}
                continue

            stripped = line.lstrip()
            if pending_insert_table and stripped.startswith("("):
                process_insert_tuples(line, pending_insert_table, pending_col_index, db)
                if line.rstrip().endswith(";"):
                    pending_insert_table = None
                    pending_col_index = {}
                continue

    return databases


def format_counter(c: Counter, limit: int = 30) -> str:
    if not c:
        return "_None_"
    lines = []
    for k, v in c.most_common(limit):
        lines.append(f"| {k} | {v} |")
    return "\n".join(lines)


def schema_comparison(table_names: set[str]) -> tuple[str, set[str], set[str]]:
    extra = table_names - ULTIMATE_POS_77
    missing = ULTIMATE_POS_77 - table_names
    if table_names == ULTIMATE_POS_77:
        verdict = "Exact Ultimate POS base schema (77 tables)"
    elif table_names >= ULTIMATE_POS_77:
        verdict = f"Ultimate POS base + {len(extra)} extension table(s)"
    elif ULTIMATE_POS_77 & table_names:
        overlap = len(ULTIMATE_POS_77 & table_names)
        verdict = f"Partial Ultimate POS overlap ({overlap}/77 core tables present)"
    else:
        verdict = "Not Ultimate POS — no core table overlap"
    return verdict, extra, missing


def mapping_section(db: DatabaseAudit, ti: TableInfo | None) -> str:
    if not ti or not ti.tx_type:
        return "_No transactions table or no transaction data._\n"

    lines = [
        "Per established Vonos migration logic (`transactions.type` → target schema):\n",
        "| Ultimate POS `type` | Target Vonos atom | Notes |",
        "|---|---|---|",
    ]

    mapping = {
        "sell": "Order/Sale + LedgerEntry(revenue) + stock decrement",
        "sell_return": "SaleReturn + LedgerEntry adjustment + optional restock",
        "purchase": "StockMovement(inbound) + LedgerEntry(cost) + supplier link",
        "purchase_return": "StockMovement(outbound) + LedgerEntry adjustment",
        "opening_stock": "Seed Item.quantity via variation_location_details",
        "opening_balance": "LedgerEntry / contact opening balance — review",
        "expense": "LedgerEntry(expense)",
        "payroll": "LedgerEntry(expense) — payroll category",
        "stock_adjustment": "StockMovement + Item quantity reconcile",
        "sell_transfer": "StockMovement(transfer) between locations",
        "purchase_transfer": "StockMovement(transfer) inbound side",
        "production_purchase": "StockMovement(inbound) from manufacturing",
        "production_sell": "StockMovement(outbound) / BOM consumption",
        "ledger_discount": "LedgerEntry — discount line",
    }

    unmapped = []
    for t, count in ti.tx_type.most_common():
        if t in mapping:
            lines.append(f"| `{t}` | {mapping[t].split(' + ')[0]} | {count:,} rows; {mapping[t]} |")
        else:
            unmapped.append((t, count))
            lines.append(f"| `{t}` | **NEEDS NEW CATEGORY** | {count:,} rows — not in Mechanics/Cafe mapping |")

    if unmapped:
        lines.append("\n**Unmapped transaction types requiring review:**\n")
        for t, c in unmapped:
            lines.append(f"- `{t}`: {c:,} rows")

    return "\n".join(lines) + "\n"


def data_quality_section(db: DatabaseAudit) -> str:
    lines: list[str] = []
    ti_tx = db.tables.get("transactions")
    ti_prod = db.tables.get("products")
    ti_contacts = db.tables.get("contacts")

    if ti_tx and ti_tx.tx_dates:
        dates = sorted(ti_tx.tx_dates)
        lines.append(f"- **Transaction date range:** {dates[0]} → {dates[-1]} ({len(dates):,} dated rows sampled)")
    elif ti_tx and ti_tx.row_count:
        lines.append("- **Transaction date range:** Could not parse dates from INSERT stream")

    if ti_tx and ti_tx.row_count == 0:
        lines.append("- **Warning:** `transactions` table is empty — likely fresh install or audit-only DB")
    elif ti_tx and ti_tx.row_count > 100:
        lines.append(f"- **Operational history:** {ti_tx.row_count:,} transactions — appears to be real operational data")

    if ti_prod:
        test_hits = [n for n in ti_prod.product_names_sample if re.search(r"test|dummy|sample|placeholder", n, re.I)]
        if test_hits:
            lines.append(f"- **Test/placeholder products (sample):** {', '.join(test_hits[:10])}")
        else:
            lines.append("- **Test products:** None detected in product name sample")

    if ti_contacts and ti_contacts.row_count == 0:
        lines.append("- **Warning:** `contacts` empty — no customers/suppliers")

    vld = db.tables.get("variation_location_details")
    if vld and vld.row_count:
        total = vld.vld_qty_nonzero + vld.vld_qty_zero + vld.vld_qty_null
        if total:
            pct = 100 * vld.vld_qty_nonzero / total
            lines.append(
                f"- **Stock quantities (`variation_location_details`):** "
                f"{vld.vld_qty_nonzero:,} non-zero, {vld.vld_qty_zero:,} zero, {vld.vld_qty_null:,} NULL "
                f"({pct:.1f}% populated with stock)"
            )

    return "\n".join(lines) if lines else "_No quality signals computed._\n"


def render_report(db: DatabaseAudit, dump_name: str, dump_generated: str | None = None) -> str:
    table_names = set(db.tables.keys())
    verdict, extra, missing = schema_comparison(table_names)

    populated = [(n, t.row_count) for n, t in sorted(db.tables.items()) if t.row_count > 0]
    empty = [(n, t.row_count) for n, t in sorted(db.tables.items()) if t.row_count == 0]

    lines = [
        f"# {db.entity_code} — MySQL Dump Audit",
        "",
        f"**Source database:** `{db.name}`",
        f"**Business name (from `business` table):** {db.business_name or '_not found_'}",
        f"**Dump file:** `{dump_name}` (lines {db.line_start:,}–{db.line_end:,})",
        f"**Generated:** {dump_generated or 'audit script run against cPanel/phpMyAdmin export'}",
        "",
        "---",
        "",
        "## 1. Table Inventory",
        "",
        f"**Total tables:** {len(db.tables)} | **Populated:** {len(populated)} | **Empty:** {len(empty)}",
        "",
        "### All tables (with row counts)",
        "",
        "| Table | Rows | Status |",
        "|---|---:|---|",
    ]

    for name, t in sorted(db.tables.items(), key=lambda x: (-x[1].row_count, x[0])):
        status = "populated" if t.row_count > 0 else "empty"
        lines.append(f"| `{name}` | {t.row_count:,} | {status} |")

    lines.extend([
        "",
        "---",
        "",
        "## 2. Schema Comparison",
        "",
        f"**Verdict:** {verdict}",
        "",
        f"- Core Ultimate POS tables present: **{len(ULTIMATE_POS_77 & table_names)} / 77**",
        f"- Extension/extra tables: **{len(extra)}**",
        f"- Missing from base 77: **{len(missing)}**",
        "",
    ])

    if extra:
        lines.append("### Extra tables (not in base Ultimate POS 77)")
        lines.append("")
        for t in sorted(extra):
            rc = db.tables[t].row_count if t in db.tables else 0
            lines.append(f"- `{t}` ({rc:,} rows)")
        lines.append("")

    if missing and len(missing) < 40:
        lines.append("### Missing base tables")
        lines.append("")
        for t in sorted(missing):
            lines.append(f"- `{t}`")
        lines.append("")

    lines.extend(["---", "", "## 3. Key Table Deep-Dive", ""])

    for ctable in CORE_TABLES:
        ti = db.tables.get(ctable)
        lines.append(f"### `{ctable}`")
        lines.append("")
        if not ti:
            lines.append("_Table not present in this database._\n")
            continue
        lines.append(f"**Row count:** {ti.row_count:,}")
        lines.append("")
        if ti.columns:
            lines.append("| Column | Type |")
            lines.append("|---|---|")
            for col, dtype in ti.columns:
                lines.append(f"| `{col}` | {dtype} |")
            lines.append("")

        if ctable == "transactions" and ti.tx_type:
            for label, counter in [
                ("type", ti.tx_type),
                ("status", ti.tx_status),
                ("sub_status", ti.tx_sub_status),
                ("payment_status", ti.tx_payment_status),
                ("res_order_status", ti.tx_res_order_status),
            ]:
                if counter:
                    lines.append(f"**Distinct `{label}` values:**")
                    lines.append("")
                    lines.append("| Value | Count |")
                    lines.append("|---|---:|")
                    lines.append(format_counter(counter))
                    lines.append("")

        if ctable == "contacts" and ti.contact_type:
            lines.append("**Contact `type` breakdown:**")
            lines.append("")
            lines.append("| type | Count |")
            lines.append("|---|---:|")
            lines.append(format_counter(ti.contact_type))
            lines.append("")

        if ctable == "variation_location_details" and ti.row_count:
            lines.append(
                f"**qty_available:** non-zero={ti.vld_qty_nonzero:,}, "
                f"zero={ti.vld_qty_zero:,}, NULL={ti.vld_qty_null:,}"
            )
            lines.append("")

        if ctable == "business_locations":
            lines.append(f"**Location count:** {ti.row_count} business location(s) — {'multi-location' if ti.row_count > 1 else 'single-location'}")
            lines.append("")

    lines.extend([
        "---",
        "",
        "## 4. Data Quality Flags",
        "",
        data_quality_section(db),
        "",
        "---",
        "",
        "## 5. Mapping Recommendation",
        "",
        mapping_section(db, db.tables.get("transactions")),
    ])

    return "\n".join(lines)


GENERATION_TIME_RE = re.compile(r"^-- Generation Time: (.+)$")


def parse_dump_header(path: Path) -> str | None:
    with path.open("r", encoding="utf-8", errors="replace") as f:
        for _ in range(30):
            line = f.readline()
            if not line:
                break
            m = GENERATION_TIME_RE.match(line.strip())
            if m:
                return m.group(1).strip()
    return None


def main() -> None:
    args = sys.argv[1:]
    write_index = True
    if "--no-index" in args:
        write_index = False
        args = [a for a in args if a != "--no-index"]

    dump_path = Path(args[0]) if args else Path("localhost.sql")
    out_dir = Path(args[1]) if len(args) > 1 else Path("docs/migration-audits")
    out_dir.mkdir(parents=True, exist_ok=True)

    dump_generated = parse_dump_header(dump_path)
    print(f"Auditing {dump_path} ...", file=sys.stderr)
    databases = audit_dump(dump_path)
    print(f"Found {len(databases)} databases", file=sys.stderr)

    if len(databases) == 1:
        write_index = False

    index_lines = [
        "# cPanel Dump — Master Index",
        "",
        f"Source: `{dump_path.name}` ({dump_path.stat().st_size / 1_048_576:.1f} MB)",
        "",
        "> **Note:** This phpMyAdmin export is a **full cPanel account dump** containing **12 databases**,",
        "> not a single-entity export. Each database below has its own `{ENTITY}_AUDIT.md` report.",
        "> Primary migration targets: **VW** (`vonomglk_audit` / `Vonos warehouse.sql`, audit.vonosautos.com), **VISP** (`vonomglk_vsp`, visp.vonosautomarket.com),",
        "> **VSP** (`vonomglk_spmarket`, vsp.vonosautomarket.com), **VM** (`vonomglk_Quotation`), **VMS** (`vonomglk_OPS`).",
        "> Cafe (`vonomglk_cafe`) is also present. Legacy `VSS` tenant code is retired.",
        "> Legacy HQ warehouse archive: `vonomglk_hq2` (not VW cutover source). Copies: `vonomglk_hq3temp`, `vonomglk_OLD_hq2`.",
        "",
        "| Database | Entity Code | Business Name | Tables | Populated | Transactions | Products |",
        "|---|---|---|---:|---:|---:|---:|",
    ]

    for dbname in sorted(databases.keys(), key=lambda d: databases[d].line_start):
        db = databases[dbname]
        populated = sum(1 for t in db.tables.values() if t.row_count > 0)
        tx_count = db.tables.get("transactions", TableInfo("transactions")).row_count
        prod_count = db.tables.get("products", TableInfo("products")).row_count
        out_file = out_dir / f"{db.entity_code}_AUDIT.md"
        report = render_report(db, dump_path.name, dump_generated)
        out_file.write_text(report, encoding="utf-8")
        print(f"Wrote {out_file}", file=sys.stderr)
        if write_index:
            index_lines.append(
                f"| `{dbname}` | {db.entity_code} | {db.business_name or '—'} | {len(db.tables)} | {populated} | {tx_count:,} | {prod_count:,} |"
            )

    if write_index:
        (out_dir / "INDEX.md").write_text("\n".join(index_lines) + "\n", encoding="utf-8")
        print(f"Wrote {out_dir / 'INDEX.md'}", file=sys.stderr)
    else:
        print("Skipped INDEX.md (single-database dump)", file=sys.stderr)


if __name__ == "__main__":
    main()
