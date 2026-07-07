#!/usr/bin/env python3
"""Stream-scan MySQL dumps for financial coverage metrics.

Outputs docs/migration-audits/dryruns/FINANCIAL_MYSQL_COUNTS.json

Usage:
  python3 scripts/financial_coverage_mysql.py
  python3 scripts/financial_coverage_mysql.py path/to/dump.sql
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

# Reuse entity codes from audit_mysql_dump
sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_mysql_dump import (  # noqa: E402
    DB_ENTITY_MAP,
    DATABASE_COMMENT_RE,
    CREATE_DB_RE,
    USE_RE,
    audit_dump,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = REPO_ROOT / "docs/migration-audits/dryruns/FINANCIAL_MYSQL_COUNTS.json"

# Vonos tenant assignment (operating tenants only)
TENANT_ASSIGNMENT: dict[str, str | None] = {
    "vonomglk_Quotation": "VA",
    "vonomglk_OPS": "VA",
    "vonomglk_hq3temp": "VA_DELTA",
    "vonomglk_vsp": "VISP",
    "vonomglk_spmarket": "VSP",
    "vonomglk_audit": "VW",
    "vonomglk_cafe": "VC",
    # Excluded from operating tenant import
    "vonomglk_hq2": None,
    "vonomglk_OLD_hq2": None,
    "vonomglk_gp": None,
    "vonomglk_vonos_institute": None,
    "vonomglk_wp847": None,
}

EXPECTED_BUSINESS: dict[str, str] = {
    "vonomglk_Quotation": "Vonos Automotive LTD",
    "vonomglk_OPS": "Vonos Automotive ltd",
    "vonomglk_hq3temp": "Vonos Autos HQ",
    "vonomglk_vsp": "Vonos Institute Spare Parts",
    "vonomglk_spmarket": "Vonos SP Marketplace",
    "vonomglk_audit": "Vonos Audit Warehouse",
    "vonomglk_cafe": "Vonos Cafe",
}

DEFAULT_DUMPS: list[Path] = [
    REPO_ROOT / "vonomglk_Quotation.sql",
    REPO_ROOT / "vonomglk_OPS.sql",
    REPO_ROOT / "vonomglk_vsp.sql",
    REPO_ROOT / "vonomglk_cafe.sql",
    Path.home() / "Downloads/localhost.sql",
]

PAYROLL_PATTERN = re.compile(r"'payroll', NULL, 'final'")
SELL_FINAL_PATTERN = re.compile(r"'sell', NULL, 'final'")
EXPENSE_FINAL_PATTERN = re.compile(r"'expense', NULL, 'final'")
PURCHASE_FINAL_PATTERN = re.compile(r"'purchase', NULL, 'final'")
DATE_IN_LINE = re.compile(r"'(\d{4}-\d{2}-\d{2})")
FINAL_TOTAL_PATTERN = re.compile(r"'(\d+\.?\d*)'")


@dataclass
class FinancialMetrics:
    database: str
    entity_code: str
    vonos_tenant: str | None
    business_name: str | None = None
    business_name_mismatch: bool = False
    dump_file: str = ""
    line_range: tuple[int, int] | None = None

    sell_count: int = 0
    sell_total: str = "0"
    sell_date_min: str | None = None
    sell_date_max: str | None = None

    expense_txn_count: int = 0
    expense_txn_total: str = "0"
    expense_date_min: str | None = None
    expense_date_max: str | None = None

    payroll_count: int = 0
    payroll_date_min: str | None = None
    payroll_date_max: str | None = None

    purchase_count: int = 0
    purchase_date_min: str | None = None
    purchase_date_max: str | None = None

    purchase_lines: int = 0
    transaction_payments_count: int = 0
    transaction_payments_total: str = "0"
    account_transactions_count: int = 0
    expense_categories: int = 0
    payroll_groups: int = 0
    payroll_group_links: int = 0
    cash_registers: int = 0
    accounts: int = 0

    _sell_total_dec: Decimal = field(default_factory=lambda: Decimal("0"), repr=False)
    _expense_total_dec: Decimal = field(default_factory=lambda: Decimal("0"), repr=False)
    _payments_total_dec: Decimal = field(default_factory=lambda: Decimal("0"), repr=False)

    def bump_dates(self, dates: list[str], field_min: str, field_max: str) -> None:
        if not dates:
            return
        dmin, dmax = min(dates), max(dates)
        cur_min = getattr(self, field_min)
        cur_max = getattr(self, field_max)
        setattr(self, field_min, dmin if cur_min is None else min(cur_min, dmin))
        setattr(self, field_max, dmax if cur_max is None else max(cur_max, dmax))

    def finalize(self) -> None:
        self.sell_total = f"{self._sell_total_dec:.2f}"
        self.expense_txn_total = f"{self._expense_total_dec:.2f}"
        self.transaction_payments_total = f"{self._payments_total_dec:.2f}"


def count_insert_rows(line: str) -> int:
    s = line.strip()
    if not s.startswith("INSERT"):
        return 0
    idx = s.find("VALUES")
    if idx == -1:
        return 0
    payload = s[idx + 6 :].rstrip(";")
    if not payload.strip().startswith("("):
        return 0
    return payload.count("),(") + 1


def extract_dates_from_line(line: str) -> list[str]:
    return DATE_IN_LINE.findall(line)


def try_extract_final_total(line: str) -> Decimal | None:
    """Best-effort final_total from transaction INSERT line (column ~53)."""
    if "INSERT INTO `transactions`" not in line and ", 'sell'," not in line and ", 'expense'," not in line:
        return None
  # final_total appears after many fields; use last numeric quoted value before expense_category
    # Simpler: sum all decimal-like quoted numbers on sell/expense lines is wrong.
    # Use pattern: find ', final_total area - in UPS, final_total is often 5th from end before categories
    parts = line.split(",")
    for i, part in enumerate(parts):
        if "'final'" in part or "'received'" in part or "'pending'" in part:
            # scan forward for a decimal field
            for j in range(i + 1, min(i + 25, len(parts))):
                p = parts[j].strip().strip("'")
                try:
                    return Decimal(p)
                except InvalidOperation:
                    continue
    return None


def scan_database_section(
    lines: list[str],
    db_name: str,
    dump_file: str,
    line_start: int,
) -> FinancialMetrics:
    entity = DB_ENTITY_MAP.get(db_name, db_name)
    tenant = TENANT_ASSIGNMENT.get(db_name)
    m = FinancialMetrics(
        database=db_name,
        entity_code=entity,
        vonos_tenant=tenant,
        dump_file=dump_file,
    )

    in_transactions = False
    for line in lines:
        if "INSERT INTO `business`" in line and m.business_name is None:
            bm = re.search(r"\(\d+,\s*'([^']+)'", line)
            if bm:
                m.business_name = bm.group(1)
                expected = EXPECTED_BUSINESS.get(db_name)
                if expected and m.business_name != expected:
                    m.business_name_mismatch = True

        if "INSERT INTO `transactions`" in line or (
            in_transactions and line.strip().startswith("(")
        ):
            in_transactions = True
            if PAYROLL_PATTERN.search(line):
                n = line.count("'payroll', NULL, 'final'")
                m.payroll_count += n
                m.bump_dates(extract_dates_from_line(line), "payroll_date_min", "payroll_date_max")
            if SELL_FINAL_PATTERN.search(line):
                n = line.count("'sell', NULL, 'final'")
                m.sell_count += n
                m.bump_dates(extract_dates_from_line(line), "sell_date_min", "sell_date_max")
            if EXPENSE_FINAL_PATTERN.search(line):
                n = line.count("'expense', NULL, 'final'")
                m.expense_txn_count += n
                m.bump_dates(extract_dates_from_line(line), "expense_date_min", "expense_date_max")
            if PURCHASE_FINAL_PATTERN.search(line):
                n = line.count("'purchase', NULL, 'final'")
                m.purchase_count += n
                m.bump_dates(extract_dates_from_line(line), "purchase_date_min", "purchase_date_max")
            if line.rstrip().endswith(";"):
                in_transactions = False
        elif in_transactions and not line.strip().startswith("("):
            in_transactions = False

        if "INSERT INTO `purchase_lines`" in line:
            m.purchase_lines += count_insert_rows(line)
        elif "INSERT INTO `transaction_payments`" in line:
            m.transaction_payments_count += count_insert_rows(line)
        elif "INSERT INTO `account_transactions`" in line:
            m.account_transactions_count += count_insert_rows(line)
        elif "INSERT INTO `expense_categories`" in line:
            m.expense_categories += count_insert_rows(line)
        elif "INSERT INTO `essentials_payroll_groups`" in line:
            m.payroll_groups += count_insert_rows(line)
        elif "INSERT INTO `essentials_payroll_group_transactions`" in line:
            m.payroll_group_links += count_insert_rows(line)
        elif "INSERT INTO `cash_registers`" in line:
            m.cash_registers += count_insert_rows(line)
        elif "INSERT INTO `accounts`" in line:
            m.accounts += count_insert_rows(line)

    m.finalize()
    return m


def _enrich_from_audit(m: FinancialMetrics, audit) -> None:
    tx = audit.tables.get("transactions")
    if tx:
        if m.sell_count == 0 and tx.tx_type.get("sell", 0) > 0:
            m.sell_count = tx.tx_type["sell"]
        if m.expense_txn_count == 0 and tx.tx_type.get("expense", 0) > 0:
            m.expense_txn_count = tx.tx_type["expense"]
        if m.payroll_count == 0 and tx.tx_type.get("payroll", 0) > 0:
            m.payroll_count = tx.tx_type["payroll"]
        if m.purchase_count == 0 and tx.tx_type.get("purchase", 0) > 0:
            m.purchase_count = tx.tx_type["purchase"]
        if tx.tx_dates:
            m.bump_dates(tx.tx_dates, "sell_date_min", "sell_date_max")

    for table_name, attr in [
        ("purchase_lines", "purchase_lines"),
        ("transaction_payments", "transaction_payments_count"),
        ("account_transactions", "account_transactions_count"),
        ("expense_categories", "expense_categories"),
        ("essentials_payroll_groups", "payroll_groups"),
        ("essentials_payroll_group_transactions", "payroll_group_links"),
        ("cash_registers", "cash_registers"),
        ("accounts", "accounts"),
    ]:
        ti = audit.tables.get(table_name)
        if ti and getattr(m, attr) == 0 and ti.row_count > 0:
            setattr(m, attr, ti.row_count)


def scan_single_db_dump(path: Path) -> FinancialMetrics:
    """Scan a single-database phpMyAdmin export."""
    databases = audit_dump(path)
    if len(databases) == 1:
        audit = next(iter(databases.values()))
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        section = lines[audit.line_start - 1 : audit.line_end]
        m = scan_database_section(section, audit.name, str(path), audit.line_start)
        m.business_name = audit.business_name
        expected = EXPECTED_BUSINESS.get(audit.name)
        if expected and m.business_name and m.business_name != expected:
            m.business_name_mismatch = True
        m.line_range = (audit.line_start, audit.line_end)
        _enrich_from_audit(m, audit)
        m.finalize()
        return m

    text = path.read_text(encoding="utf-8", errors="replace")
    db_name = path.stem
    for pattern in (DATABASE_COMMENT_RE, CREATE_DB_RE):
        match = pattern.search(text[:5000])
        if match:
            db_name = match.group(1)
            break

    metrics = scan_database_section(text.splitlines(), db_name, str(path), 1)
    metrics.line_range = (1, len(text.splitlines()))
    return metrics


def scan_multi_db_dump(path: Path) -> list[FinancialMetrics]:
    """Use audit_dump for DB boundaries, then scan each section."""
    databases = audit_dump(path)
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    results: list[FinancialMetrics] = []

    for db_name, audit in sorted(databases.items()):
        section = lines[audit.line_start - 1 : audit.line_end]
        m = scan_database_section(section, db_name, str(path), audit.line_start)
        m.business_name = audit.business_name
        expected = EXPECTED_BUSINESS.get(db_name)
        if expected and m.business_name and m.business_name != expected:
            m.business_name_mismatch = True
        m.line_range = (audit.line_start, audit.line_end)

        # Enrich from audit_dump transaction type counters when streaming missed rows
        _enrich_from_audit(m, audit)
        m.finalize()
        results.append(m)

    return results


def metrics_to_dict(m: FinancialMetrics) -> dict:
    d = asdict(m)
    d.pop("_sell_total_dec", None)
    d.pop("_expense_total_dec", None)
    d.pop("_payments_total_dec", None)
    return d


def main() -> None:
    args = [Path(a) for a in sys.argv[1:] if not a.startswith("-")]
    dumps = args if args else [p for p in DEFAULT_DUMPS if p.exists()]

    if not dumps:
        print("No dump files found. Pass paths or place dumps in repo root.", file=sys.stderr)
        sys.exit(1)

    all_metrics: list[FinancialMetrics] = []
    seen_dbs: set[str] = set()

    for dump_path in dumps:
        print(f"Scanning {dump_path} ...", file=sys.stderr)
        if dump_path.name == "localhost.sql" or "localhost" in dump_path.name:
            for m in scan_multi_db_dump(dump_path):
                if m.database not in seen_dbs:
                    all_metrics.append(m)
                    seen_dbs.add(m.database)
        else:
            m = scan_single_db_dump(dump_path)
            if m.database not in seen_dbs:
                all_metrics.append(m)
                seen_dbs.add(m.database)

    # Aggregate VA sources
    va_sources = [m for m in all_metrics if m.vonos_tenant in ("VA", "VA_DELTA")]
    va_combined = None
    if va_sources:
        va_combined = {
            "vonosTenant": "VA",
            "sources": [m.database for m in va_sources],
            "payroll_count": sum(m.payroll_count for m in va_sources),
            "expense_txn_count": sum(m.expense_txn_count for m in va_sources),
            "sell_count": sum(m.sell_count for m in va_sources),
            "purchase_count": sum(m.purchase_count for m in va_sources),
            "transaction_payments_count": sum(m.transaction_payments_count for m in va_sources),
            "account_transactions_count": sum(m.account_transactions_count for m in va_sources),
            "payroll_groups": sum(m.payroll_groups for m in va_sources),
            "note": "Quotation+OPS = imported; hq3temp = delta not yet imported",
        }

    payload = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "dumpsScanned": [str(p) for p in dumps],
        "databases": [metrics_to_dict(m) for m in sorted(all_metrics, key=lambda x: x.database)],
        "vaCombinedLegacy": va_combined,
        "excludedDatabases": [
            m.database
            for m in all_metrics
            if TENANT_ASSIGNMENT.get(m.database) is None
        ],
    }

    DEFAULT_OUT.parent.mkdir(parents=True, exist_ok=True)
    DEFAULT_OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {DEFAULT_OUT}", file=sys.stderr)

    # Summary table to stdout
    print("\n| Database | Tenant | Payroll | Expenses | Sells | Purchases | Payments | AcctTxns |")
    print("|---|---|---:|---:|---:|---:|---:|---:|")
    for m in sorted(all_metrics, key=lambda x: x.database):
        if TENANT_ASSIGNMENT.get(m.database) is None:
            continue
        tenant = m.vonos_tenant or "—"
        print(
            f"| {m.database} | {tenant} | {m.payroll_count} | {m.expense_txn_count} | "
            f"{m.sell_count} | {m.purchase_count} | {m.transaction_payments_count} | "
            f"{m.account_transactions_count} |"
        )


if __name__ == "__main__":
    main()
