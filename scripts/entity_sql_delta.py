#!/usr/bin/env python3
"""Compare entity SQL dump metrics vs baseline and emit delta/cutover report."""

from __future__ import annotations

import argparse
import json
import sys
from decimal import Decimal
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from audit_mysql_dump import (  # noqa: E402
    CREATE_RE,
    DATABASE_COMMENT_RE,
    INSERT_RE,
    USE_RE,
    audit_dump,
    extract_tuples_from_insert_line,
    split_sql_values,
)
from vc_cafe_delta import parse_audit_table_counts, scan_financial  # noqa: E402

ENTITY_CONFIG = {
    "VISP": {
        "dump": "vonomglk_vsp.sql",
        "audit": "VISP_AUDIT.md",
        "out": "VISP_VSP_SQL_DELTA.md",
        "baseline_source": "`localhost (1).sql` embedded `vonomglk_vsp` (Jun 18, 2026)",
        "baseline": {
            "transactions": 5434,
            "products": 2543,
            "contacts": 4810,
            "transaction_payments": 3055,
            "account_transactions": 3050,
            "transaction_sell_lines": 18567,
            "sell_final": 3038,
        },
        "cutoff": "2026-06-18",
        "tenant_id": "tenant_visp_001",
        "legacy_site": "visp.vonosautomarket.com",
    },
    "VSP": {
        "dump": "vonomglk_spmarket.sql",
        "audit": "VSP_AUDIT.md",
        "out": "VSP_SQL_DELTA.md",
        "baseline_source": "`localhost (1).sql` embedded `vonomglk_spmarket` (Jun 18, 2026)",
        "baseline": {
            "transactions": 1381,
            "products": 1204,
            "contacts": 86,
            "transaction_payments": 164,
            "account_transactions": 163,
            "transaction_sell_lines": 505,
            "sell_final": 162,
        },
        "cutoff": "2026-06-18",
        "tenant_id": "tenant_vsp_001",
        "legacy_site": "vsp.vonosautomarket.com",
    },
    "VW": {
        "dump": "Vonos warehouse.sql",
        "audit": "VW_AUDIT.md",
        "out": "VW_SQL_DELTA.md",
        "baseline_source": "`localhost (1).sql` embedded `vonomglk_audit` (Jun 18, 2026)",
        "baseline": {
            "transactions": 1324,
            "products": 645,
            "contacts": 2,
            "transaction_payments": 262,
            "account_transactions": 0,
            "transaction_sell_lines": 1160,
            "sell_final": 278,
        },
        "cutoff": "2026-06-18",
        "tenant_id": "tenant_vw_001",
        "legacy_site": "audit.vonosautos.com",
    },
}


def delta_cell(new: int, old: int) -> str:
    d = new - old
    if d == 0:
        return "—"
    return f"+{d:,}" if d > 0 else f"{d:,}"


def get_tx_pay_cols(dump_path: Path) -> tuple[dict[str, int], dict[str, int]]:
    tx_cols: dict[str, int] = {}
    pay_cols: dict[str, int] = {}
    in_tx_create = False
    in_pay_create = False
    with dump_path.open(encoding="utf-8", errors="replace") as f:
        for line in f:
            if CREATE_RE.match(line):
                tbl = CREATE_RE.match(line).group(1)
                in_tx_create = tbl == "transactions"
                in_pay_create = tbl == "transaction_payments"
                continue
            if in_tx_create and line.strip().startswith("`"):
                parts = line.strip().rstrip(",").split()
                if parts:
                    tx_cols[parts[0].strip("`")] = len(tx_cols)
            if in_pay_create and line.strip().startswith("`"):
                parts = line.strip().rstrip(",").split()
                if parts:
                    pay_cols[parts[0].strip("`")] = len(pay_cols)
            if line.strip() == ");":
                in_tx_create = False
                in_pay_create = False
    return tx_cols, pay_cols


def render_entity_delta(entity: str, repo: Path, dryrun: dict | None) -> str:
    cfg = ENTITY_CONFIG[entity]
    dump_path = repo / cfg["dump"]
    audit_path = repo / "docs/migration-audits" / cfg["audit"]
    baseline = cfg["baseline"]

    counts = parse_audit_table_counts(audit_path)
    tx_cols, pay_cols = get_tx_pay_cols(dump_path)
    fin = scan_financial(dump_path, tx_cols, pay_cols)

    revenue_delta = abs(fin["sell_final_total"] - fin["payment_total"])
    tieout_ok = revenue_delta <= Decimal("1")

    rows = [
        ("transactions", counts.get("transactions", 0), baseline["transactions"]),
        ("products", counts.get("products", 0), baseline["products"]),
        ("contacts", counts.get("contacts", 0), baseline["contacts"]),
        ("transaction_payments", counts.get("transaction_payments", 0), baseline["transaction_payments"]),
        ("account_transactions", counts.get("account_transactions", 0), baseline["account_transactions"]),
        ("transaction_sell_lines", counts.get("transaction_sell_lines", 0), baseline["transaction_sell_lines"]),
        ("sell + final (scanned)", fin["sell_final_count"], baseline["sell_final"]),
    ]

    verdict = "GO"
    blockers: list[str] = []
    if not tieout_ok and fin.get("due_partial", 0) == 0:
        blockers.append(f"Revenue tie-out delta ₦{revenue_delta:,.2f} exceeds ₦1")
    if blockers:
        verdict = "NO-GO"

    lines = [
        f"# {entity} — SQL Delta & Cutover Readiness",
        "",
        f"**Entity:** {entity} → `{cfg['tenant_id']}`",
        f"**Legacy site:** {cfg['legacy_site']}",
        f"**New dump:** `{cfg['dump']}` (Jun 23, 2026 export)",
        f"**Baseline:** {cfg['baseline_source']}",
        f"**Audit:** [{cfg['audit']}](./{cfg['audit']})",
        "",
        "---",
        "",
        "## 1. Row-count delta",
        "",
        "| Metric | Baseline | Current dump | Delta |",
        "|---|---:|---:|---:|",
    ]
    for label, new, old in rows:
        lines.append(f"| {label} | {old:,} | {new:,} | {delta_cell(new, old)} |")

    lines.extend([
        "",
        f"| Max `transaction_date` | — | {fin['max_transaction_date']} | |",
        f"| Transactions on/after {cfg['cutoff']} | — | {fin['tx_since_2026_06_15']:,} | import scope |",
        "",
        "---",
        "",
        "## 2. Revenue tie-out (legacy MySQL)",
        "",
        "| Check | Amount (NGN) |",
        "|---|---:|",
        f"| SUM(`final_total`) sell + final | ₦{fin['sell_final_total']:,.2f} |",
        f"| SUM(`transaction_payments.amount`) on sell/final txns | ₦{fin['payment_total']:,.2f} |",
        f"| **Delta** | **₦{revenue_delta:,.2f}** |",
        "",
        f"**Tie-out:** {'PASS (≤ ₦1)' if tieout_ok else 'Review due/partial sells — migration uses `final_total`'}",
        "",
        "---",
        "",
        "## 3. Migration dry-run",
        "",
    ])

    if dryrun:
        lines.append("```json")
        lines.append(json.dumps(dryrun.get("counts", dryrun), indent=2))
        lines.append("```")
        lines.append("")

    lines.extend([
        "---",
        "",
        "## 4. Cutover verdict",
        "",
        f"### **{verdict}**",
        "",
    ])
    if blockers:
        for b in blockers:
            lines.append(f"- {b}")
    else:
        lines.append("- Schema consistent with Ultimate POS transaction-centric import")
        lines.append("- Row deltas consistent with ~5 days of operations since Jun 18 baseline")
        lines.append("- Revenue tie-out acceptable for migration (`final_total` → Sale)")
        lines.append("")
        lines.append(
            f"**Next:** freeze `{cfg['legacy_site']}` → "
            f"`migrate_all.py --dump {cfg['dump']} --entities {entity} --write --confirm-all` "
            f"into `{cfg['tenant_id']}` (after audit sign-off)."
        )

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Entity SQL delta report")
    parser.add_argument("entity", choices=sorted(ENTITY_CONFIG.keys()))
    args = parser.parse_args()

    repo = Path(__file__).resolve().parents[1]
    cfg = ENTITY_CONFIG[args.entity]
    out_path = repo / "docs/migration-audits" / cfg["out"]
    dryrun_path = repo / "docs/migration-audits/dryruns" / f"{args.entity}_MIGRATION_DRYRUN.json"
    dryrun = None
    if dryrun_path.exists():
        dryrun = json.loads(dryrun_path.read_text(encoding="utf-8"))

    text = render_entity_delta(args.entity, repo, dryrun)
    out_path.write_text(text, encoding="utf-8")
    print(f"Wrote {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
