"""Load Ultimate POS tables from a phpMyAdmin dump."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from audit_mysql_dump import (
    CREATE_RE,
    DATABASE_COMMENT_RE,
    INSERT_RE,
    USE_RE,
    extract_tuples_from_insert_line,
    parse_column_def,
    split_sql_values,
)

from migration.types import TableData

if TYPE_CHECKING:
    from migration.progress import ProgressReporter


def row_dict(values: list[str | None], columns: list[str]) -> dict:
    out: dict = {}
    for i, col in enumerate(columns):
        if i < len(values):
            out[col] = values[i]
    return out


def load_tables(
    dump_path: Path,
    source_db: str,
    tables_to_load: frozenset[str],
    progress: ProgressReporter | None = None,
) -> dict[str, TableData]:
    tables: dict[str, TableData] = {}
    in_db = False
    current_table: str | None = None
    in_create = False
    pending_table: str | None = None
    pending_columns: list[str] = []

    dump_size = dump_path.stat().st_size
    bytes_read = 0
    if progress:
        progress.message(f"  Reading dump for `{source_db}` ({dump_size / 1_048_576:.0f} MB) …")
        progress.start("Scanning dump", dump_size)

    with dump_path.open("r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            bytes_read += len(line.encode("utf-8", errors="replace"))
            if progress and dump_size > 0:
                progress.set_fraction(bytes_read, dump_size, label="Scanning dump")

            use_m = USE_RE.match(line)
            if use_m:
                in_db = use_m.group(1) == source_db
                current_table = None
                in_create = False
                pending_table = None
                continue

            db_comment_m = DATABASE_COMMENT_RE.match(line.strip())
            if db_comment_m:
                in_db = db_comment_m.group(1) == source_db
                if in_db:
                    current_table = None
                    in_create = False
                    pending_table = None
                continue

            if not in_db:
                continue

            create_m = CREATE_RE.match(line)
            if create_m:
                tname = create_m.group(1)
                current_table = tname
                in_create = True
                if tname not in tables:
                    tables[tname] = TableData(name=tname)
                continue

            if in_create and current_table:
                ti = tables[current_table]
                if line.strip().startswith(")"):
                    in_create = False
                    current_table = None
                    continue
                col = parse_column_def(line)
                if col:
                    ti.columns.append(col[0])
                continue

            insert_m = INSERT_RE.match(line)
            if insert_m:
                tname = insert_m.group(1)
                if tname not in tables_to_load:
                    pending_table = None
                    continue
                if tname not in tables:
                    tables[tname] = TableData(name=tname)
                ti = tables[tname]
                pending_table = tname
                pending_columns = ti.columns
                _ingest_insert_line(line, ti, pending_columns)
                if line.rstrip().endswith(";"):
                    pending_table = None
                continue

            stripped = line.lstrip()
            if pending_table and stripped.startswith("("):
                ti = tables[pending_table]
                _ingest_insert_line(line, ti, pending_columns)
                if line.rstrip().endswith(";"):
                    pending_table = None

    if progress:
        progress.done(f"{sum(len(t.rows) for t in tables.values()):,} rows loaded")

    return tables


def _ingest_insert_line(line: str, ti: TableData, columns: list[str]) -> None:
    if not columns:
        return
    payload = line if "VALUES" in line else f"VALUES {line}"
    for tup in extract_tuples_from_insert_line(payload):
        vals = split_sql_values(tup)
        ti.rows.append(row_dict(vals, columns))
