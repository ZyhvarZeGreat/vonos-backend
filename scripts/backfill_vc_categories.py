#!/usr/bin/env python3
"""Backfill Item.category for Vonos Cafe from legacy dump + name heuristics."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Run from repo root: PYTHONPATH=scripts python3 scripts/backfill_vc_categories.py
sys.path.insert(0, str(Path(__file__).resolve().parent))

from migration.load_dump import load_tables
from migration.tenant_db import _connect, load_database_url
from migration_registry import ENTITIES

# Legacy category names (from vonomglk_cafe.categories)
CATEGORY_YOGHURT = "Yoghurt Drink"
CATEGORY_ALCOHOL = "Alcohol"
CATEGORY_BEER = "Beer"
CATEGORY_ALCOHOL_CAN = "Alcohol Can drinks"
CATEGORY_SOFT = "Soft drinks"
CATEGORY_JUICES = "Juices"
CATEGORY_CAN_SOFT = "Can Soft drink"
CATEGORY_ALCOHOL_PLASTIC = "Alcohol plastic"
CATEGORY_SNACKS = "Snacks"

SNACK_KEYWORDS = (
    "chips",
    "puff",
    "doughnut",
    "chinchin",
    "eggroll",
    "munchkin",
    "cracker",
    "digestive",
    "shortbread",
    "wafer",
    "chewing gum",
    "purebliss",
    "nutri choco",
    "egg",
)

BEER_KEYWORDS = (
    "heineken",
    "guiness",
    "guinness",
    "castle lite",
    "hero",
    "trophy",
    "tiger",
    "gold berg",
    "goldberg",
    "amstel malt",
    "smirnoff ice",
)

SOFT_DRINK_KEYWORDS = (
    "coke",
    "fanta",
    "sprite",
    "teem",
    "fab",
    "life",
    "water",
    "smoove",
)

JUICE_KEYWORDS = (
    "5alive",
    "chivita",
    "chiexotic",
    "zobo",
    "berry blast",
    "tigernut",
    "exotic",
)

YOGHURT_KEYWORDS = (
    "yoghurt",
    "yogurt",
    "nutrimilk",
    "holandia",
)

ALCOHOL_BOTTLE_KEYWORDS = (
    "desperado",
    "double black",
    "origin",
    "predator",
    "fearless",
    "black bullet",
    "power cofee",
    "power coffee",
)


def normalize(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip().lower())


def infer_category(product_name: str, legacy_category: str | None) -> str | None:
    if legacy_category:
        return legacy_category

    n = normalize(product_name)

    for kw in SNACK_KEYWORDS:
        if kw in n:
            return CATEGORY_SNACKS

    for kw in YOGHURT_KEYWORDS:
        if kw in n:
            return CATEGORY_YOGHURT

    for kw in JUICE_KEYWORDS:
        if kw in n:
            return CATEGORY_JUICES

    for kw in BEER_KEYWORDS:
        if kw in n:
            return CATEGORY_BEER

    if "canned" in n or "(can" in n:
        if any(kw in n for kw in ("coke", "fanta", "sprite")):
            return CATEGORY_CAN_SOFT
        if any(kw in n for kw in ("desperado", "double black")):
            return CATEGORY_ALCOHOL_CAN

    for kw in SOFT_DRINK_KEYWORDS:
        if kw in n:
            return CATEGORY_SOFT

    for kw in ALCOHOL_BOTTLE_KEYWORDS:
        if kw in n:
            if "plastic" in n or "sachet" in n:
                return CATEGORY_ALCOHOL_PLASTIC
            if "bottle" in n:
                return CATEGORY_ALCOHOL
            return CATEGORY_ALCOHOL

    return None


def build_variation_category_map(dump_path: Path) -> dict[int, str]:
    entity = ENTITIES["VC"]
    tables = load_tables(
        dump_path,
        entity.source_db,
        frozenset(["products", "categories", "variations"]),
    )
    categories = {
        str(r["id"]): str(r.get("name") or "").strip()
        for r in tables["categories"].rows
        if r.get("id") is not None
    }
    products = {str(r["id"]): r for r in tables["products"].rows if r.get("id") is not None}

    out: dict[int, str] = {}
    for variation in tables["variations"].rows:
        vid = variation.get("id")
        if vid is None:
            continue
        pid = str(variation.get("product_id") or "")
        product = products.get(pid, {})
        name = str(product.get("name") or variation.get("name") or "")
        cat_id = product.get("category_id")
        legacy_cat = categories.get(str(cat_id)) if cat_id is not None else None
        category = infer_category(name, legacy_cat or None)
        if category:
            out[int(vid)] = category
    return out


def run(dump_path: Path, *, dry_run: bool = False) -> dict[str, int]:
    entity = ENTITIES["VC"]
    tenant_id = entity.tenant_id
    variation_categories = build_variation_category_map(dump_path)
    url = load_database_url()

    stats = {"mapped": len(variation_categories), "updated": 0, "skipped": 0, "missing": 0}

    with _connect(url) as conn, conn.cursor() as cur:
        cur.execute(
            '''
            SELECT m."legacyId", m."newId", i.name, i.category
            FROM "MigrationLegacyId" m
            JOIN "Item" i ON i.id = m."newId"
            WHERE m."tenantId" = %s
              AND m."entityType" = 'item'
              AND i."deletedAt" IS NULL
            ''',
            (tenant_id,),
        )
        rows = cur.fetchall()

        for legacy_id, item_id, item_name, current_cat in rows:
            new_cat = variation_categories.get(int(legacy_id))
            if not new_cat:
                stats["missing"] += 1
                continue
            if current_cat == new_cat:
                stats["skipped"] += 1
                continue
            if dry_run:
                print(f"  would set {item_name!r}: {current_cat!r} -> {new_cat!r}")
                stats["updated"] += 1
                continue
            cur.execute(
                'UPDATE "Item" SET category = %s WHERE id = %s AND "tenantId" = %s',
                (new_cat, item_id, tenant_id),
            )
            stats["updated"] += 1

        if not dry_run:
            conn.commit()

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dump",
        type=Path,
        default=Path("localhost (1).sql"),
        help="phpMyAdmin dump path",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print(f"Backfill VC categories from {args.dump} ({'dry-run' if args.dry_run else 'write'})")
    stats = run(args.dump, dry_run=args.dry_run)
    print(f"Done: {stats}")


if __name__ == "__main__":
    main()
