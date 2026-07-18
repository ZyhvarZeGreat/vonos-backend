#!/usr/bin/env python3
"""Composite ETL: vonomglk_Quotation + vonomglk_OPS → Vonos Automotive (tenant_va_001)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.progress import ProgressReporter
from migration.tenant_db import print_banner, resolve_tenant, verify_counts_by_tenant, write_postgres
from migration.va_migration import (
    DEFAULT_FALLBACK_DUMP,
    DEFAULT_OPS_DUMP,
    DEFAULT_QUOTATION_DUMP,
    build_va_summary,
    resolve_va_dump,
    run_va_migration,
)
from migration_registry import VA_TENANT_ID, get_entity


def main() -> int:
    va_entity = get_entity("VA")
    parser = argparse.ArgumentParser(
        description="Migrate Vonos Automotive from Quotation + OPS MySQL dumps",
    )
    parser.add_argument(
        "--quotation-dump",
        type=Path,
        default=None,
        help=f"VM/Quotation dump (default: {DEFAULT_QUOTATION_DUMP.name} or localhost.sql)",
    )
    parser.add_argument(
        "--ops-dump",
        type=Path,
        default=None,
        help=f"VMS/OPS dump (default: {DEFAULT_OPS_DUMP.name} or localhost.sql)",
    )
    parser.add_argument(
        "--dump",
        type=Path,
        default=None,
        help="Use one combined dump for both sources (sets quotation + ops)",
    )
    parser.add_argument("--dry-run", action="store_true", default=True, help="Summary only (default)")
    parser.add_argument("--write", action="store_true", help="Write to Postgres")
    parser.add_argument(
        "--confirm-tenant",
        default="",
        help="Type VA to allow --write",
    )
    parser.add_argument(
        "--hrm-only",
        action="store_true",
        help="Import only HRM tables (payroll groups, payrolls, pay components)",
    )
    parser.add_argument(
        "--since",
        default=None,
        metavar="YYYY-MM-DD",
        help="Incremental: only records on/after this date (e.g. 2025-01-01)",
    )
    parser.add_argument(
        "--until",
        default=None,
        metavar="YYYY-MM-DD",
        help="Only records on/before this date (e.g. 2026-12-31)",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("docs/migration-audits/dryruns/VA_MIGRATION_DRYRUN.json"),
    )
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    if args.write:
        args.dry_run = False
        if args.confirm_tenant.strip().upper() != "VA":
            print("--write requires --confirm-tenant VA", file=sys.stderr)
            return 1

    fallback = args.dump or DEFAULT_FALLBACK_DUMP
    try:
        quotation_dump = resolve_va_dump(
            args.quotation_dump if not args.dump else args.dump,
            DEFAULT_QUOTATION_DUMP.name,
            fallback,
        )
        ops_dump = resolve_va_dump(
            args.ops_dump if not args.dump else args.dump,
            DEFAULT_OPS_DUMP.name,
            fallback,
        )
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 1

    if not args.dry_run:
        resolve_tenant(va_entity)

    progress = ProgressReporter(enabled=not args.quiet)
    mode = "HRM-only" if args.hrm_only else "full"
    progress.message(f"\nVA composite migration ({mode})")
    progress.message(f"  Quotation: {quotation_dump}")
    progress.message(f"  OPS:       {ops_dump}")

    existing_legacy = None
    if (args.since or args.until) and not args.dry_run:
        from migration.audit_transforms import load_legacy_maps_from_postgres
        from migration.tenant_db import load_database_url

        existing_legacy = load_legacy_maps_from_postgres(VA_TENANT_ID, load_database_url())

    if args.since or args.until:
        progress.message(
            f"  Date filter: since={args.since or '—'} until={args.until or '—'}"
        )

    loaded, result = run_va_migration(
        quotation_dump,
        ops_dump,
        progress=progress,
        since=args.since,
        until=args.until,
        existing_legacy=existing_legacy,
        hrm_only=args.hrm_only,
    )

    print_banner(va_entity, dry_run=args.dry_run, counts=result.counts())
    summary = build_va_summary(
        loaded,
        result,
        dry_run=args.dry_run,
        quotation_dump=quotation_dump,
        ops_dump=ops_dump,
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
