#!/usr/bin/env python3
"""Extract legacy item costs (Ultimate POS) from the phpMyAdmin dumps.

Reads products / variations / purchase_lines for every database in the dump
and emits a JSON cost map keyed by product NAME and by variation SKU:

  { "name_cost": {"BENZ HEADLIGHT": 25000, ...},
    "sku_cost":  {"Vonos auto-4624": 0, ...},
    "stats": {...} }

Cost precedence per key: avg purchase_price (if any) else default_purchase_price.

Usage:
  python3 scripts/legacy-cost-extract.py \
      "localhost copy.sql" localhost.sql --out /tmp/legacy-costs.json
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from audit_mysql_dump import (  # noqa: E402
    CREATE_RE,
    DATABASE_COMMENT_RE,
    INSERT_RE,
    USE_RE,
    extract_tuples_from_insert_line,
    parse_column_def,
    split_sql_values,
)

TARGETS = {"products", "variations", "purchase_lines"}


def as_float(v):
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def scan(dump: Path, state: dict) -> None:
    db = None
    cur = None
    in_create = False
    cols: list[str] = []

    products = state["products"]          # db -> pid -> name
    variations = state["variations"]      # (db,vid) -> {pid, sku, dpp}
    purch = state["purch_lines"]          # (db,vid) -> [price,...]
    stats = state["stats"]

    with dump.open(encoding="utf-8", errors="replace") as fh:
        for line in fh:
            s = line.strip()
            m = DATABASE_COMMENT_RE.match(s) or None
            if s and (s.startswith("-- Database:") or s.startswith("USE ") or s.startswith("CREATE DATABASE IF NOT EXISTS")):
                mm = DATABASE_COMMENT_RE.match(s)
                if not mm:
                    import re as _re
                    u = _re.match(r"^USE `([^`]+)`", s)
                    c = _re.match(r"^CREATE DATABASE IF NOT EXISTS `([^`]+)`", s)
                    name = u.group(1) if u else (c.group(1) if c else None)
                else:
                    name = mm.group(1)
                if name:
                    db = name
                    products.setdefault(db, {})
                    cur = None
                    in_create = False
                continue

            cm = CREATE_RE.match(line)
            if cm:
                cur = cm.group(1)
                cols = []
                in_create = cur in TARGETS
                if in_create:
                    stats["tables"][f"{db}.{cur}"] = 0
                continue

            if in_create:
                if line.strip().startswith(")"):
                    in_create = False
                    cur = None
                    continue
                cd = parse_column_def(line)
                if cd:
                    cols.append(cd[0])
                continue

            im = INSERT_RE.match(line)
            if not im:
                continue
            table = im.group(1)
            if table not in TARGETS or db is None:
                continue
            # phpMyAdmin puts one value tuple per line; accumulate until ";".
            stmt = line
            if not stmt.rstrip().endswith(";"):
                for extra in fh:
                    stmt += extra
                    if extra.rstrip().endswith(";"):
                        break
            tuples = extract_tuples_from_insert_line(stmt)
            colidx = {c: i for i, c in enumerate(cols)}
            for body in tuples:
                vals = split_sql_values(body)
                if table == "products":
                    pid = colidx.get("id")
                    nm = colidx.get("name")
                    if pid is None or nm is None:
                        continue
                    pidv = vals[pid] if pid < len(vals) else None
                    nmv = vals[nm] if nm < len(vals) else None
                    if pidv is not None and nmv:
                        products[db][str(pidv)] = str(nmv)
                elif table == "variations":
                    vid = colidx.get("id")
                    pid = colidx.get("product_id")
                    sku = colidx.get("sub_sku")
                    dpp = colidx.get("default_purchase_price")
                    if vid is None:
                        continue
                    vidv = vals[vid] if vid < len(vals) else None
                    if vidv is None:
                        continue
                    variations[(db, str(vidv))] = {
                        "pid": str(vals[pid]) if pid is not None and pid < len(vals) and vals[pid] is not None else None,
                        "sku": str(vals[sku]) if sku is not None and sku < len(vals) and vals[sku] is not None else None,
                        "dpp": as_float(vals[dpp]) if dpp is not None and dpp < len(vals) else None,
                    }
                elif table == "purchase_lines":
                    vid = colidx.get("variation_id")
                    pp = colidx.get("purchase_price")
                    qty = colidx.get("quantity")
                    if vid is None or pp is None:
                        continue
                    vidv = vals[vid] if vid < len(vals) else None
                    ppv = as_float(vals[pp]) if pp < len(vals) else None
                    qtyv = as_float(vals[qty]) if qty is not None and qty < len(vals) else 1.0
                    if vidv is None or ppv is None or ppv <= 0:
                        continue
                    purch.setdefault((db, str(vidv)), []).append((ppv, qtyv or 1.0))
            stats["tables"][f"{db}.{table}"] = stats["tables"].get(f"{db}.{table}", 0) + len(tuples)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dumps", nargs="+")
    ap.add_argument("--out", default="/tmp/legacy-costs.json")
    args = ap.parse_args()

    state = {
        "products": {},
        "variations": {},
        "purch_lines": {},
        "stats": {"tables": {}},
    }
    for d in args.dumps:
        p = Path(d)
        if not p.exists():
            print(f"skip missing {d}", file=sys.stderr)
            continue
        print(f"scanning {d} …", file=sys.stderr)
        scan(p, state)

    products = state["products"]
    variations = state["variations"]
    purch = state["purch_lines"]

    # Aggregate avg purchase price per variation.
    var_avg = {}
    for key, rows in purch.items():
        tot_q = sum(q for _, q in rows)
        tot_v = sum(pr * q for pr, q in rows)
        if tot_q > 0:
            var_avg[key] = tot_v / tot_q

    name_cost = {}
    sku_cost = {}

    def bump(store, key, cost):
        if not key:
            return
        k = key.strip()
        if not k:
            return
        prev = store.get(k)
        if prev is None or cost > prev:  # prefer a real (larger, non-zero) cost
            store[k] = cost

    for (db, vid), meta in variations.items():
        pid = meta["pid"]
        name = products.get(db, {}).get(pid) if pid else None
        sku = meta["sku"]
        avg = var_avg.get((db, vid))
        dpp = meta["dpp"]
        cost = avg if avg is not None else dpp
        if cost is None:
            continue
        if cost > 0:
            bump(name_cost, name, cost)
            bump(sku_cost, sku, cost)
        else:
            # record zero so we know the key existed but had no cost
            sku_cost.setdefault(sku.strip(), 0.0) if sku else None

    out = {
        "name_cost": name_cost,
        "sku_cost": sku_cost,
        "stats": {
            "dbs": sorted(products.keys()),
            "products": sum(len(v) for v in products.values()),
            "variations": len(variations),
            "purchase_lines": sum(len(v) for v in purch.values()),
            "names_with_cost": len(name_cost),
            "skus_with_cost": len(sku_cost),
        },
    }
    Path(args.out).write_text(json.dumps(out), encoding="utf-8")
    print(json.dumps(out["stats"], indent=2))
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
