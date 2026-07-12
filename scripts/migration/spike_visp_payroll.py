#!/usr/bin/env python3
"""Classify transaction types linked from essentials_payroll_group_transactions."""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.load_dump import load_tables  # noqa: E402
from migration.pos_common import parse_int, table_rows  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Spike VISP payroll junction links")
    parser.add_argument("--dump", required=True, type=Path, help="Path to MySQL dump")
    parser.add_argument("--database", default="vonomglk_vsp", help="Database name in dump")
    args = parser.parse_args()

    tables = load_tables(
        args.dump,
        args.database,
        [
            "transactions",
            "essentials_payroll_group_transactions",
            "essentials_payroll_groups",
        ],
    )

    txn_by_id = {
        parse_int(row.get("id")): row
        for row in table_rows(tables, "transactions")
        if parse_int(row.get("id")) > 0
    }

    type_counts: Counter[str] = Counter()
    missing = 0
    payroll_like = 0

    for link in table_rows(tables, "essentials_payroll_group_transactions"):
        txn_id = parse_int(link.get("transaction_id"))
        txn = txn_by_id.get(txn_id)
        if not txn:
            missing += 1
            type_counts["<missing>"] += 1
            continue
        tx_type = str(txn.get("type") or "")
        type_counts[tx_type] += 1
        if tx_type == "payroll" or parse_int(txn.get("expense_for"), 0) > 0:
            payroll_like += 1

    links = len(table_rows(tables, "essentials_payroll_group_transactions"))
    groups = len(table_rows(tables, "essentials_payroll_groups"))
    payroll_type_rows = sum(
        1 for row in table_rows(tables, "transactions") if str(row.get("type") or "") == "payroll"
    )

    print(f"Payroll groups: {groups}")
    print(f"Junction links: {links}")
    print(f"transactions.type=payroll: {payroll_type_rows}")
    print(f"Linked txn missing: {missing}")
    print(f"Linked txn payroll-like: {payroll_like}")
    print("Linked transaction types:")
    for key, count in type_counts.most_common():
        print(f"  {key}: {count}")


if __name__ == "__main__":
    main()
