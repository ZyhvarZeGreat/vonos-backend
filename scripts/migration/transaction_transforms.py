"""Transaction-centric archetype transforms (VSS, VC)."""

from __future__ import annotations

from migration.pos_common import (
    build_legacy_user_name_map,
    legacy_map,
    transform_contacts,
    transform_items,
    transform_sales,
)
from migration.stock_transforms import transform_expense_ledger
from migration.types import TableData, TransformResult


def run_transaction_migration(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    available_for_retail: bool,
    reference_prefix: str = "",
    since: str | None = None,
    existing_legacy: dict[str, dict[int, str]] | None = None,
    backfill_lines: bool = False,
) -> TransformResult:
    merged = TransformResult()
    user_names = build_legacy_user_name_map(tables)
    existing = existing_legacy or {}

    item_result = transform_items(
        tables,
        tenant_id,
        available_for_retail=available_for_retail,
        user_names=user_names,
        existing_item_legacy=existing.get("item"),
    )
    merged.merge(item_result)

    contact_result = transform_contacts(
        tables,
        tenant_id,
        user_names=user_names,
        existing_customer_legacy=existing.get("customer"),
        existing_supplier_legacy=existing.get("supplier"),
    )
    merged.merge(contact_result)

    item_legacy = {**existing.get("item", {}), **legacy_map(merged.legacy_ids, "item")}
    customer_legacy = {**existing.get("customer", {}), **legacy_map(merged.legacy_ids, "customer")}

    sale_result = transform_sales(
        tables,
        tenant_id,
        item_legacy,
        customer_legacy,
        reference_prefix=reference_prefix,
        user_names=user_names,
        since=since,
        existing_sale_legacy=existing.get("sale"),
        backfill_lines=backfill_lines,
    )
    merged.merge(sale_result)

    expense_result = transform_expense_ledger(tables, tenant_id, since=since)
    merged.merge(expense_result)

    return merged
