#!/usr/bin/env python3
"""Dry-run ETL: vonomglk_cafe (Ultimate POS) → Vonos Cafe (tenant_vc_001)."""

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

DEFAULT_DUMP = Path("vonomglk_cafe.sql")
DEFAULT_FALLBACK = Path("localhost.sql")


def resolve_dump(path: Path | None) -> Path:
    if path is not None and path.exists():
        return path
    if DEFAULT_DUMP.exists():
        return DEFAULT_DUMP
    if DEFAULT_FALLBACK.exists():
        return DEFAULT_FALLBACK
    raise FileNotFoundError(
        f"Dump not found: tried {path}, {DEFAULT_DUMP.name}, and fallback {DEFAULT_FALLBACK}"
    )


def main() -> int:
    entity = get_entity("VC")
    parser = argparse.ArgumentParser(description="Migrate Vonos Cafe from vonomglk_cafe MySQL dump")
    parser.add_argument(
        "--dump",
        type=Path,
        default=None,
        help=f"Path to phpMyAdmin dump (default: {DEFAULT_DUMP.name} or localhost.sql)",
    )
    parser.add_argument("--tenant-code", default=entity.code, help="Vonos tenant code")
    parser.add_argument("--tenant-id", default=entity.tenant_id, help="Expected tenant id")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Print summary only (default)")
    parser.add_argument("--write", action="store_true", help="Write to Postgres (requires --confirm-tenant VC)")
    parser.add_argument(
        "--confirm-tenant",
        default="",
        help="Type tenant code to allow --write (e.g. VC)",
    )
    parser.add_argument(
        "--since",
        default=None,
        metavar="YYYY-MM-DD",
        help="Incremental import: only records on/after this date",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("docs/migration-audits/dryruns/VC_MIGRATION_DRYRUN.json"),
        help="Write dry-run summary JSON",
    )
    args = parser.parse_args()

    if args.write:
        args.dry_run = False
        if args.confirm_tenant.strip().upper() != entity.code:
            print(f"--write requires --confirm-tenant {entity.code}", file=sys.stderr)
            return 1

    try:
        dump_path = resolve_dump(args.dump)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 1

    if args.tenant_id != entity.tenant_id:
        print(f"tenant-id mismatch: expected {entity.tenant_id}", file=sys.stderr)
        return 1

    if not args.dry_run:
        resolve_tenant(entity)

    existing_legacy = None
    if args.since and not args.dry_run:
        from migration.audit_transforms import load_legacy_maps_from_postgres
        from migration.tenant_db import load_database_url

        existing_legacy = load_legacy_maps_from_postgres(entity.tenant_id, load_database_url())

    loaded, result = run_entity_migration(
        entity,
        dump_path,
        since=args.since,
        existing_legacy=existing_legacy,
    )
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
