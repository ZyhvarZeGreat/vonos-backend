#!/usr/bin/env python3
"""Incremental ETL: vonomglk_hq3temp (2026) → Vonos Automotive (tenant_va_001)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.progress import ProgressReporter
from migration.tenant_db import print_banner, resolve_tenant, verify_counts_by_tenant, write_postgres
from migration.va_delta_migration import (
    DEFAULT_FALLBACK_DUMP,
    build_va_delta_summary,
    resolve_delta_dump,
    run_va_delta_migration,
)
from migration_registry import VA_TENANT_ID, get_entity

DEFAULT_SINCE = "2026-01-01"


def main() -> int:
    va_entity = get_entity("VA")
    parser = argparse.ArgumentParser(
        description="Migrate VA hq3temp delta (Jan 2026+) from localhost.sql",
    )
    parser.add_argument(
        "--dump",
        type=Path,
        default=None,
        help=f"Combined MySQL dump (default: {DEFAULT_FALLBACK_DUMP})",
    )
    parser.add_argument("--dry-run", action="store_true", default=True, help="Summary only (default)")
    parser.add_argument("--write", action="store_true", help="Write to Postgres")
    parser.add_argument(
        "--confirm-tenant",
        default="",
        help="Type VA to allow --write",
    )
    parser.add_argument(
        "--since",
        default=DEFAULT_SINCE,
        metavar="YYYY-MM-DD",
        help=f"Only records on/after this date (default: {DEFAULT_SINCE})",
    )
    parser.add_argument(
        "--until",
        default=None,
        metavar="YYYY-MM-DD",
        help="Only records on/before this date (optional)",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("docs/migration-audits/dryruns/HQ3_DELTA_DRYRUN.json"),
    )
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if args.write:
        args.dry_run = False
        if args.confirm_tenant.strip().upper() != "VA":
            print("--write requires --confirm-tenant VA", file=sys.stderr)
            return 1

    try:
        dump_path = resolve_delta_dump(args.dump, DEFAULT_FALLBACK_DUMP)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 1

    if not args.dry_run:
        resolve_tenant(va_entity)

    progress = ProgressReporter(enabled=not args.quiet)
    progress.message("\nVA hq3temp delta migration")
    progress.message(f"  Dump:  {dump_path}")
    progress.message(f"  Since: {args.since}")
    if args.until:
        progress.message(f"  Until: {args.until}")

    existing_legacy = None
    if not args.dry_run:
        from migration.audit_transforms import load_legacy_maps_from_postgres
        from migration.tenant_db import load_database_url

        existing_legacy = load_legacy_maps_from_postgres(VA_TENANT_ID, load_database_url())

    loaded, result = run_va_delta_migration(
        "HQ3",
        dump_path,
        progress=progress,
        since=args.since,
        until=args.until,
        existing_legacy=existing_legacy,
    )

    print_banner(va_entity, dry_run=args.dry_run, counts=result.counts())
    summary = build_va_delta_summary(
        "HQ3",
        loaded,
        result,
        dry_run=args.dry_run,
        dump_path=dump_path,
        since=args.since,
        until=args.until,
    )
    print(json.dumps(summary, indent=2))

    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"Wrote {args.output_json}")

    if not args.dry_run:
        stats = write_postgres(result, VA_TENANT_ID, progress=progress)
        print(f"Inserted: {json.dumps(stats)}")
        print(f"Verify: {json.dumps(verify_counts_by_tenant(VA_TENANT_ID))}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
