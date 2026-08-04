#!/usr/bin/env python3
"""
Extract qty_available from Ultimate POS SQL dump for VW / VISP / VSP,
then write a JSON map for the Prisma apply script.

Source DBs (Aug 2026 localhost dump):
  VW   → vonomglk_audit
  VISP → vonomglk_vsp
  VSP  → vonomglk_spmarket

Usage:
  python3 scripts/restore_stock_from_sql.py \\
    --dump localhost.sql \\
    --out tmp/stock_restore_vw_visp_vsp.json
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from migration.load_dump import load_tables  # noqa: E402
from migration.pos_common import parse_int, table_rows  # noqa: E402

ENTITY_SOURCES = {
    "VW": "vonomglk_audit",
    "VISP": "vonomglk_vsp",
    "VSP": "vonomglk_spmarket",
}

TABLES = frozenset(
    {
        "variations",
        "variation_location_details",
        "business_locations",
    }
)


def extract_entity(dump: Path, code: str, source_db: str) -> dict:
    tables = load_tables(dump, source_db, TABLES)
    qty_by_vid: dict[str, int] = defaultdict(int)
    loc_qty: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    locations = {
        str(r["id"]): r
        for r in table_rows(tables, "business_locations")
        if r.get("id") is not None
    }

    for vld in table_rows(tables, "variation_location_details"):
        vid = str(vld.get("variation_id") or "")
        if not vid:
            continue
        qty = parse_int(vld.get("qty_available"))
        qty_by_vid[vid] += qty
        loc_id = str(vld.get("location_id") or "")
        loc_row = locations.get(loc_id, {})
        loc_code = (
            str(loc_row.get("location_id") or loc_row.get("name") or loc_id or code)
            .strip()
            or code
        )
        loc_qty[vid][loc_code] += qty

    by_sku: dict[str, dict] = {}
    missing_sku = 0
    for variation in table_rows(tables, "variations"):
        vid = str(variation.get("id") or "")
        if not vid:
            continue
        sku = str(variation.get("sub_sku") or "").strip()
        if not sku:
            missing_sku += 1
            continue
        total = int(qty_by_vid.get(vid, 0))
        locations_map = {
            loc: int(q) for loc, q in loc_qty.get(vid, {}).items() if int(q) != 0
        }
        # Prefer highest qty when duplicate SKUs appear.
        prev = by_sku.get(sku)
        if prev and int(prev.get("quantity", 0)) >= total:
            continue
        by_sku[sku] = {
            "sku": sku,
            "quantity": total,
            "locations": locations_map or ({code: total} if total else {}),
            "variationId": int(vid) if vid.isdigit() else vid,
        }

    nonzero = sum(1 for row in by_sku.values() if row["quantity"] > 0)
    total_qty = sum(int(row["quantity"]) for row in by_sku.values())
    return {
        "code": code,
        "sourceDb": source_db,
        "skuCount": len(by_sku),
        "nonzeroSkuCount": nonzero,
        "totalQuantity": total_qty,
        "missingSkuVariations": missing_sku,
        "bySku": by_sku,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dump",
        type=Path,
        default=ROOT / "localhost.sql",
        help="phpMyAdmin multi-db dump",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "tmp" / "stock_restore_vw_visp_vsp.json",
    )
    parser.add_argument(
        "--only",
        default="VW,VISP,VSP",
        help="Comma-separated entity codes",
    )
    args = parser.parse_args()

    if not args.dump.is_file():
        raise SystemExit(f"Dump not found: {args.dump}")

    codes = [c.strip().upper() for c in args.only.split(",") if c.strip()]
    entities = {}
    for code in codes:
        source = ENTITY_SOURCES.get(code)
        if not source:
            raise SystemExit(f"Unknown entity {code}; known={list(ENTITY_SOURCES)}")
        print(f"==> Extracting {code} from `{source}` …")
        entities[code] = extract_entity(args.dump, code, source)
        summary = {k: entities[code][k] for k in (
            "code",
            "sourceDb",
            "skuCount",
            "nonzeroSkuCount",
            "totalQuantity",
            "missingSkuVariations",
        )}
        print(json.dumps(summary, indent=2))

    payload = {
        "dump": str(args.dump),
        "generatedFrom": "variation_location_details.qty_available",
        "entities": {
            code: {
                **{k: v[k] for k in (
                    "code",
                    "sourceDb",
                    "skuCount",
                    "nonzeroSkuCount",
                    "totalQuantity",
                    "missingSkuVariations",
                )},
                "bySku": v["bySku"],
            }
            for code, v in entities.items()
        },
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload), encoding="utf-8")
    print(f"Wrote {args.out} ({args.out.stat().st_size / 1_048_576:.1f} MB)")


if __name__ == "__main__":
    main()
