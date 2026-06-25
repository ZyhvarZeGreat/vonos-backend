#!/usr/bin/env python3
"""Dry-run ETL: vonomglk_vsp (Ultimate POS) → Vonos VISP schema.

Thin wrapper around the shared migration package. Prefer migrate_all.py for
multi-entity runs.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.run_entity import build_summary, run_entity_migration
from migration.tenant_db import print_banner, resolve_tenant, verify_counts_by_tenant, write_postgres
from migration_registry import get_entity


def main() -> int:
    entity = get_entity("VISP")
    parser = argparse.ArgumentParser(description="Migrate VISP from vonomglk_vsp MySQL dump")
    parser.add_argument("--dump", type=Path, default=Path("vonomglk_vsp.sql"), help="Path to phpMyAdmin dump")
    parser.add_argument("--tenant-code", default=entity.code, help="Vonos tenant code")
    parser.add_argument("--tenant-id", default=entity.tenant_id, help="Expected tenant id")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Print summary only (default)")
    parser.add_argument("--write", action="store_true", help="Write to Postgres (requires --confirm-tenant VISP)")
    parser.add_argument(
        "--confirm-tenant",
        default="",
        help="Type tenant code to allow --write (e.g. VISP)",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("docs/migration-audits/dryruns/VISP_MIGRATION_DRYRUN.json"),
        help="Write dry-run summary JSON",
    )
    args = parser.parse_args()

    if args.write:
        args.dry_run = False
        if args.confirm_tenant.strip().upper() != entity.code:
            print(f"--write requires --confirm-tenant {entity.code}", file=sys.stderr)
            return 1

    if not args.dump.exists():
        print(f"Dump not found: {args.dump}", file=sys.stderr)
        return 1

    if args.tenant_id != entity.tenant_id:
        print(f"tenant-id mismatch: expected {entity.tenant_id}", file=sys.stderr)
        return 1

    if not args.dry_run:
        resolve_tenant(entity)

    loaded, result = run_entity_migration(entity, args.dump)
    print_banner(entity, dry_run=args.dry_run, counts=result.counts())

    summary = build_summary(entity, loaded, result, dry_run=args.dry_run)
    print(json.dumps(summary, indent=2))

    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"Wrote {args.output_json}")

    if not args.dry_run:
        stats = write_postgres(result, entity.tenant_id)
        print(f"Inserted: {json.dumps(stats)}")
        print(f"Verify: {json.dumps(verify_counts_by_tenant(entity.tenant_id))}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
