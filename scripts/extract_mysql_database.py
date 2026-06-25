#!/usr/bin/env python3
"""Extract a single database section from a multi-db phpMyAdmin dump."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

CREATE_DB_RE = re.compile(r"^CREATE DATABASE IF NOT EXISTS `([^`]+)`")
USE_RE = re.compile(r"^USE `([^`]+)`")
DATABASE_COMMENT_RE = re.compile(r"^-- Database: `([^`]+)`")


def extract_database(source: Path, db_name: str, dest: Path) -> int:
    in_target = False
    lines_written = 0
    header: list[str] = []

    with source.open(encoding="utf-8", errors="replace") as fin, dest.open(
        "w", encoding="utf-8"
    ) as fout:
        for line in fin:
            stripped = line.strip()
            m_db = CREATE_DB_RE.match(stripped) or DATABASE_COMMENT_RE.match(stripped)
            if m_db:
                in_target = m_db.group(1) == db_name
                if in_target and not header:
                    header = [
                        "-- phpMyAdmin single-database extract\n",
                        f"-- Source: {source.name}\n",
                        f"-- Database: `{db_name}`\n",
                        "\n",
                    ]
                    fout.writelines(header)
                continue
            m_use = USE_RE.match(stripped)
            if m_use:
                in_target = m_use.group(1) == db_name
                if in_target and not header:
                    header = [
                        "-- phpMyAdmin single-database extract\n",
                        f"-- Source: {source.name}\n",
                        f"-- Database: `{db_name}`\n",
                        "\n",
                    ]
                    fout.writelines(header)
                continue
            if in_target:
                fout.write(line)
                lines_written += 1

    return lines_written


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract one database from a cPanel MySQL dump")
    parser.add_argument("source", type=Path, help="Multi-db dump path")
    parser.add_argument("database", help="Database name to extract (e.g. vonomglk_spmarket)")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Output path (default: <database>.sql in cwd)",
    )
    args = parser.parse_args()

    if not args.source.exists():
        print(f"Source not found: {args.source}", file=sys.stderr)
        return 1

    out = args.output or Path(f"{args.database}.sql")
    n = extract_database(args.source, args.database, out)
    if n == 0:
        print(f"No content found for database `{args.database}` in {args.source}", file=sys.stderr)
        return 1
    print(f"Wrote {n:,} lines to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
