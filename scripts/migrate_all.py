#!/usr/bin/env python3
"""Orchestrate legacy Ultimate POS → Vonos multi-tenant migration."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))

from migration.progress import ProgressReporter
from migration.run_entity import build_summary, run_entity_migration
from migration.va_migration import build_va_summary, run_va_migration
from migration.tenant_db import (
    confirm_tenant,
    list_tenants,
    load_database_url,
    print_banner,
    print_registry_tenants,
    resolve_tenant,
    run_audit_import,
    repair_sale_lines,
    verify_counts_by_tenant,
    write_postgres,
)
from migration_registry import LEGACY_ENTITY_CODES, PHASED_ENTITY_ORDER, parse_entity_list


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate all legacy Ultimate POS databases into Vonos tenants")
    parser.add_argument("--dump", type=Path, default=Path("localhost.sql"), help="Path to phpMyAdmin dump")
    parser.add_argument(
        "--entities",
        default="all",
        help=f"Comma-separated entity codes or 'all' ({', '.join(LEGACY_ENTITY_CODES)})",
    )
    parser.add_argument("--dry-run", action="store_true", default=True, help="Validate transforms only (default)")
    parser.add_argument("--write", action="store_true", help="Write transformed rows to Postgres")
    parser.add_argument("--confirm-all", action="store_true", help="Skip per-tenant confirmation prompts on write")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("docs/migration-audits/dryruns"),
        help="Directory for per-entity dry-run JSON summaries",
    )
    parser.add_argument("--list-tenants", action="store_true", help="Print Postgres Tenant rows and exit")
    parser.add_argument("--quiet", action="store_true", help="Suppress progress bars (summary only)")
    parser.add_argument(
        "--phased",
        action="store_true",
        help="Run entities one at a time in recommended order (VC→VMS→VM→VISP→VSP→VW) with per-entity phase progress",
    )
    parser.add_argument(
        "--pause-between",
        action="store_true",
        help="With --phased: press Enter before each entity after the first",
    )
    parser.add_argument(
        "--import-audit",
        action="store_true",
        help="Import activity_log → AuditLog after write (use with --audit-only to skip entity re-import)",
    )
    parser.add_argument(
        "--audit-only",
        action="store_true",
        help="With --import-audit: skip entity transform/write, only import audit logs",
    )
    parser.add_argument(
        "--since",
        default="2025-01-01",
        metavar="YYYY-MM-DD",
        help="Only transactions/expenses on or after this date (default: 2025-01-01); skips already-mapped legacy IDs",
    )
    parser.add_argument(
        "--until",
        default="2026-12-31",
        metavar="YYYY-MM-DD",
        help="Only records on/before this date (default: 2026-12-31)",
    )
    parser.add_argument(
        "--repair-sale-lines",
        action="store_true",
        help="Backfill SaleLine rows for sales imported without line items (use with --since)",
    )
    args = parser.parse_args()

    if args.list_tenants:
        try:
            rows = list_tenants()
            if not rows:
                print("No tenants in database. Run: cd apps/api && npx prisma db seed")
                return 1
            for row in rows:
                print(f"{row['code']:4} {row['id']:18} {row['name']} ({row['archetype']})")
        except RuntimeError as exc:
            print_registry_tenants()
            print(f"\nPostgres unavailable: {exc}", file=sys.stderr)
            return 1
        return 0

    if args.write:
        args.dry_run = False

    if not args.dump.exists():
        print(f"Dump not found: {args.dump}", file=sys.stderr)
        return 1

    entities = parse_entity_list(args.entities, phased_order=args.phased)
    progress = ProgressReporter(enabled=not args.quiet)
    mode = "DRY-RUN" if args.dry_run else "WRITE"
    phased_note = f" (phased: {' → '.join(PHASED_ENTITY_ORDER)})" if args.phased and args.entities.strip().lower() == "all" else ""
    progress.message(
        f"\nVonos legacy migration — {mode} — {len(entities)} entit{'y' if len(entities) == 1 else 'ies'}{phased_note}"
    )
    if args.phased:
        progress.message("  Each entity: [1/3] load dump → [2/3] transform → [3/3] write Postgres")

    if args.since or args.until:
        progress.message(
            f"  Date filter: since={args.since or '—'} until={args.until or '—'}"
        )

    summaries: list[dict] = []
    exit_code = 0
    entity_total = len(entities)

    for index, entity in enumerate(entities, start=1):
        if args.phased:
            if args.pause_between and index > 1:
                try:
                    input(f"\nPress Enter to start {entity.code} ({entity.name}) … ")
                except EOFError:
                    pass
            progress.entity_header(index, entity_total, entity.code, entity.name)
        else:
            progress.message(f"\n── Entity {index}/{entity_total}: {entity.code} ({entity.name}) ──")

        entity_started = time.monotonic()
        try:
            if not args.dry_run:
                resolve_tenant(entity, load_database_url())
                confirm_tenant(entity, confirm_all=args.confirm_all)
        except RuntimeError as exc:
            print(f"{entity.code}: {exc}", file=sys.stderr)
            exit_code = 2
            continue

        if args.repair_sale_lines:
            if args.dry_run:
                print(f"{entity.code}: --repair-sale-lines requires --write", file=sys.stderr)
                exit_code = 2
                continue
            try:
                resolve_tenant(entity, load_database_url())
                stats = repair_sale_lines(
                    entity,
                    args.dump,
                    since=args.since,
                    progress=progress,
                )
                print_banner(entity, dry_run=False, counts={"saleLines": stats.get("saleLinesWritten", 0)})
                print(f"Sale line repair: {json.dumps(stats)}")
            except RuntimeError as exc:
                print(f"{entity.code} repair: {exc}", file=sys.stderr)
                exit_code = 2
            if args.phased:
                progress.entity_complete(entity.code, time.monotonic() - entity_started)
                progress.overall(index, entity_total)
            continue

        existing_legacy = None
        if (args.since or args.until) and not args.dry_run:
            from migration.audit_transforms import load_legacy_maps_from_postgres

            existing_legacy = load_legacy_maps_from_postgres(entity.tenant_id, load_database_url())

        if args.audit_only:
            if not args.import_audit or args.dry_run:
                print(f"{entity.code}: --audit-only requires --write --import-audit", file=sys.stderr)
                exit_code = 2
                continue
            entity_started = time.monotonic()
            try:
                audit_stats = run_audit_import(entity, args.dump, progress=progress, since=args.since)
                print_banner(entity, dry_run=False, counts={"auditLogs": audit_stats.get("auditLogs", 0)})
                print(f"Audit import: {json.dumps(audit_stats)}")
            except RuntimeError as exc:
                print(f"{entity.code} audit: {exc}", file=sys.stderr)
                exit_code = 2
            if args.phased:
                progress.entity_complete(entity.code, time.monotonic() - entity_started)
                progress.overall(index, entity_total)
            continue

        if (args.since or args.until) and args.dry_run:
            from migration.audit_transforms import load_legacy_maps_from_postgres

            try:
                existing_legacy = load_legacy_maps_from_postgres(entity.tenant_id, load_database_url())
            except RuntimeError:
                existing_legacy = {}
                progress.message(f"  {entity.code}: Postgres unavailable for legacy map (dry-run continues)")

        if entity.code == "VA":
            loaded, result = run_va_migration(
                args.dump,
                args.dump,
                progress=progress,
                since=args.since,
                until=args.until,
                existing_legacy=existing_legacy,
            )
            summary = build_va_summary(
                loaded,
                result,
                dry_run=args.dry_run,
                quotation_dump=args.dump,
                ops_dump=args.dump,
            )
        else:
            loaded, result = run_entity_migration(
                entity,
                args.dump,
                progress=progress,
                since=args.since,
                until=args.until,
                existing_legacy=existing_legacy,
            )
            summary = build_summary(entity, loaded, result, dry_run=args.dry_run)

        counts = result.counts()
        print_banner(entity, dry_run=args.dry_run, counts=counts)
        summaries.append(summary)

        if args.output_dir:
            args.output_dir.mkdir(parents=True, exist_ok=True)
            out_path = args.output_dir / f"{entity.code}_MIGRATION_DRYRUN.json"
            out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
            print(f"Wrote {out_path}")

        if not args.dry_run:
            stats = write_postgres(result, entity.tenant_id, progress=progress)
            print(f"Inserted: {json.dumps(stats)}")
            db_counts = verify_counts_by_tenant(entity.tenant_id)
            print(f"Postgres counts for {entity.tenant_id}: {json.dumps(db_counts)}")
            if args.import_audit:
                audit_stats = run_audit_import(entity, args.dump, progress=progress, since=args.since)
                print(f"Audit import: {json.dumps(audit_stats)}")

        if result.warnings:
            print(f"Warnings ({len(result.warnings)}): {result.warnings[0]}")
            if len(result.warnings) > 1:
                print(f"  ... and {len(result.warnings) - 1} more")

        if args.phased:
            progress.entity_complete(
                entity.code,
                time.monotonic() - entity_started,
                counts=counts if not args.dry_run else result.counts(),
            )
            progress.overall(index, entity_total)

    combined_path = args.output_dir / "ALL_ENTITIES_DRYRUN.json"
    combined_path.write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    progress.message(f"\nDone. Combined summary: {combined_path}")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
