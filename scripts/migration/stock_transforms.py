"""Stock-centric archetype transforms (VW)."""

from __future__ import annotations

import json
from collections import defaultdict
from decimal import Decimal
from typing import Any

from migration.pos_common import (
    build_legacy_user_name_map,
    created_by_fields,
    legacy_map,
    new_cuid,
    parse_decimal,
    parse_int,
    parse_tx_date,
    row_date_on_or_after,
    table_rows,
    transform_contacts,
    transform_items,
)
from migration.types import TableData, TransformResult


def _bin_by_variation(tables: dict[str, TableData]) -> dict[str, str]:
    bins: dict[str, str] = {}
    for rack in table_rows(tables, "product_racks"):
        vid = str(rack.get("variation_id") or "")
        if not vid:
            continue
        parts = [
            str(rack.get("rack") or "").strip(),
            str(rack.get("row") or "").strip(),
            str(rack.get("position") or "").strip(),
        ]
        label = "/".join(p for p in parts if p)
        if label:
            bins[vid] = label
    return bins


def _movement_status_purchase(raw: Any) -> str:
    s = str(raw or "").lower()
    if s == "received":
        return "Received"
    if s in ("pending", "ordered"):
        return "Pending"
    return "Received"


def _movement_status_sell() -> str:
    return "Delivered"


def _build_line(
    sl: dict[str, Any],
    item_legacy: dict[int, str],
    products: dict[str, dict[str, Any]],
    variations: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    vid = parse_int(sl.get("variation_id"))
    item_id = item_legacy.get(vid)
    variation = variations.get(str(vid), {})
    product = products.get(str(sl.get("product_id") or variation.get("product_id") or ""), {})
    sku = str(variation.get("sub_sku") or product.get("sku") or f"SKU-{vid}")
    name = str(product.get("name") or "Line item")
    qty = parse_decimal(sl.get("quantity"), Decimal("1"))
    unit_cost = parse_decimal(sl.get("unit_price_inc_tax") or sl.get("unit_price") or sl.get("purchase_price"))
    return {
        "itemId": item_id,
        "sku": sku,
        "name": name,
        "quantity": str(qty),
        "unitCost": str(unit_cost),
    }


def transform_stock_movements(
    tables: dict[str, TableData],
    tenant_id: str,
    item_legacy: dict[int, str],
    *,
    supplier_legacy: dict[int, str] | None = None,
    user_names: dict[int, str] | None = None,
    user_vonos: dict[int, str] | None = None,
    since: str | None = None,
    existing_movement_legacy: dict[int, str] | None = None,
) -> TransformResult:
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
    supplier_legacy = supplier_legacy or {}
    products = {str(r["id"]): r for r in table_rows(tables, "products") if r.get("id") is not None}
    variations = {str(r["id"]): r for r in table_rows(tables, "variations") if r.get("id") is not None}

    purchase_lines_by_tx: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for pl in table_rows(tables, "purchase_lines"):
        purchase_lines_by_tx[str(pl.get("transaction_id") or "")].append(pl)

    sell_lines_by_tx: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for sl in table_rows(tables, "transaction_sell_lines"):
        sell_lines_by_tx[str(sl.get("transaction_id") or "")].append(sl)

    for txn in table_rows(tables, "transactions"):
        tx_type = str(txn.get("type") or "")
        status = str(txn.get("status") or "").lower()
        legacy_tx_id = parse_int(txn.get("id"))
        if legacy_tx_id <= 0:
            continue
        if since and not row_date_on_or_after(txn, "transaction_date", since):
            continue
        if existing_movement_legacy and legacy_tx_id in existing_movement_legacy:
            continue

        ref = str(txn.get("invoice_no") or txn.get("ref_no") or f"TX-{legacy_tx_id}").strip()
        tx_date = parse_tx_date(txn.get("transaction_date"))
        contact_id = parse_int(txn.get("contact_id"), 0)
        supplier_id = supplier_legacy.get(contact_id) if contact_id > 0 else None
        contact_note = ""
        if supplier_id is None and contact_id > 0:
            contact_note = f"Supplier legacy id: {contact_id}"

        if tx_type == "purchase" and status in ("received", "pending", "ordered"):
            lines_raw = purchase_lines_by_tx.get(str(legacy_tx_id), [])
            lines = [
                ln for ln in (
                    _build_line(pl, item_legacy, products, variations)
                    for pl in lines_raw
                )
                if ln is not None
            ]
            if not lines:
                continue
            mov_id = new_cuid()
            total = parse_decimal(txn.get("final_total"))
            result.stock_movements.append({
                "id": mov_id,
                "tenantId": tenant_id,
                "type": "inbound",
                "reference": ref,
                "status": _movement_status_purchase(txn.get("status")),
                "lines": lines,
                "notes": contact_note or None,
                "supplierId": supplier_id,
                "source": "standard",
                "date": tx_date,
                **created_by_fields(txn.get("created_by"), user_names, user_vonos),
            })
            result.legacy_ids.append({
                "tenantId": tenant_id,
                "entityType": "stock_movement",
                "legacyId": legacy_tx_id,
                "newId": mov_id,
            })
            result.ledger_entries.append({
                "id": new_cuid(),
                "tenantId": tenant_id,
                "type": "cost",
                "amount": str(total),
                "currency": "NGN",
                "category": "Purchases",
                "description": f"Purchase {ref}",
                "linkedRecordType": "stock_movement",
                "linkedRecordId": mov_id,
                "date": tx_date,
            })
            continue

        if tx_type == "purchase_return" and status in ("final", "received"):
            lines_raw = purchase_lines_by_tx.get(str(legacy_tx_id), [])
            lines = [
                ln for ln in (
                    _build_line(pl, item_legacy, products, variations)
                    for pl in lines_raw
                )
                if ln is not None
            ]
            if not lines:
                continue
            mov_id = new_cuid()
            total = parse_decimal(txn.get("final_total"))
            result.stock_movements.append({
                "id": mov_id,
                "tenantId": tenant_id,
                "type": "outbound",
                "reference": ref,
                "status": "Delivered",
                "lines": lines,
                "notes": contact_note or None,
                "supplierId": supplier_id,
                "source": "purchase_return",
                "date": tx_date,
                **created_by_fields(txn.get("created_by"), user_names, user_vonos),
            })
            result.legacy_ids.append({
                "tenantId": tenant_id,
                "entityType": "stock_movement",
                "legacyId": legacy_tx_id,
                "newId": mov_id,
            })
            result.ledger_entries.append({
                "id": new_cuid(),
                "tenantId": tenant_id,
                "type": "cost",
                "amount": str(-abs(total)),
                "currency": "NGN",
                "category": "Purchase Returns",
                "description": f"Purchase return {ref}",
                "linkedRecordType": "stock_movement",
                "linkedRecordId": mov_id,
                "date": tx_date,
            })
            continue

        if tx_type == "sell" and status == "final":
            lines_raw = sell_lines_by_tx.get(str(legacy_tx_id), [])
            lines = [
                ln for ln in (
                    _build_line(sl, item_legacy, products, variations)
                    for sl in lines_raw
                )
                if ln is not None
            ]
            if not lines:
                continue
            mov_id = new_cuid()
            total = parse_decimal(txn.get("final_total"))
            result.stock_movements.append({
                "id": mov_id,
                "tenantId": tenant_id,
                "type": "outbound",
                "reference": ref,
                "status": _movement_status_sell(),
                "lines": lines,
                "notes": None,
                "date": tx_date,
                **created_by_fields(txn.get("created_by"), user_names, user_vonos),
            })
            result.legacy_ids.append({
                "tenantId": tenant_id,
                "entityType": "stock_movement",
                "legacyId": legacy_tx_id,
                "newId": mov_id,
            })
            result.ledger_entries.append({
                "id": new_cuid(),
                "tenantId": tenant_id,
                "type": "revenue",
                "amount": str(total),
                "currency": "NGN",
                "category": "Sales",
                "description": f"Sale {ref}",
                "linkedRecordType": "stock_movement",
                "linkedRecordId": mov_id,
                "date": tx_date,
            })
            continue

        if tx_type == "sell_transfer" and status == "final":
            lines_raw = sell_lines_by_tx.get(str(legacy_tx_id), [])
            lines = [
                ln for ln in (
                    _build_line(sl, item_legacy, products, variations)
                    for sl in lines_raw
                )
                if ln is not None
            ]
            if not lines:
                continue
            mov_id = new_cuid()
            result.stock_movements.append({
                "id": mov_id,
                "tenantId": tenant_id,
                "type": "transfer",
                "reference": ref,
                "status": "Shipped",
                "lines": lines,
                "notes": str(txn.get("shipping_details") or "") or None,
                "date": tx_date,
                **created_by_fields(txn.get("created_by"), user_names, user_vonos),
            })
            result.legacy_ids.append({
                "tenantId": tenant_id,
                "entityType": "stock_movement",
                "legacyId": legacy_tx_id,
                "newId": mov_id,
            })

    return result


def transform_expense_ledger(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    since: str | None = None,
) -> TransformResult:
    result = TransformResult()
    categories = {
        str(r.get("id")): str(r.get("name") or "Other")
        for r in table_rows(tables, "expense_categories")
        if r.get("id") is not None
    }

    for txn in table_rows(tables, "transactions"):
        tx_type = str(txn.get("type") or "")
        if tx_type not in ("expense", "payroll"):
            continue
        legacy_tx_id = parse_int(txn.get("id"))
        if legacy_tx_id <= 0:
            continue
        if since and not row_date_on_or_after(txn, "transaction_date", since):
            continue
        amount = parse_decimal(txn.get("final_total"))
        if amount <= 0:
            continue
        cat_id = str(txn.get("expense_category_id") or "")
        category = categories.get(cat_id, "Payroll" if tx_type == "payroll" else "Other")
        ref = str(txn.get("ref_no") or txn.get("invoice_no") or f"EXP-{legacy_tx_id}").strip()
        result.ledger_entries.append({
            "id": new_cuid(),
            "tenantId": tenant_id,
            "type": "expense",
            "amount": str(amount),
            "currency": "NGN",
            "category": category,
            "description": f"{tx_type.title()} {ref}",
            "linkedRecordType": None,
            "linkedRecordId": None,
            "date": parse_tx_date(txn.get("transaction_date")),
        })

    return result


def run_stock_migration(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    since: str | None = None,
    existing_legacy: dict[str, dict[int, str]] | None = None,
) -> TransformResult:
    merged = TransformResult()
    user_names = build_legacy_user_name_map(tables)
    bins = _bin_by_variation(tables)
    existing = existing_legacy or {}

    item_result = transform_items(
        tables,
        tenant_id,
        available_for_retail=False,
        bin_by_variation=bins,
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
    supplier_legacy = {**existing.get("supplier", {}), **legacy_map(merged.legacy_ids, "supplier")}
    mov_result = transform_stock_movements(
        tables,
        tenant_id,
        item_legacy,
        supplier_legacy=supplier_legacy,
        user_names=user_names,
        since=since,
        existing_movement_legacy=existing.get("stock_movement"),
    )
    merged.merge(mov_result)

    expense_result = transform_expense_ledger(tables, tenant_id, since=since)
    merged.merge(expense_result)

    return merged


def serialize_movement_lines(movement: dict[str, Any]) -> dict[str, Any]:
    """Ensure lines are JSON-serializable for Postgres Json column."""
    out = dict(movement)
    out["lines"] = json.loads(json.dumps(movement.get("lines", [])))
    out.setdefault("source", "standard")
    out.setdefault("supplierId", None)
    return out
