"""Stock-centric archetype transforms (VW)."""

from __future__ import annotations

import json
from collections import defaultdict
from decimal import Decimal
from typing import Any, Literal

from migration.pos_common import (
    build_legacy_user_name_map,
    created_by_fields,
    legacy_map,
    new_cuid,
    parse_decimal,
    parse_int,
    parse_tx_date,
    row_date_in_range,
    table_rows,
    transform_contacts,
    transform_items,
)
from migration.types import TableData, TransformResult

MovementScope = Literal["all", "retail_purchases"]


def _inbound_purchase_tx(tx_type: str, status: str, *, scope: MovementScope) -> bool:
    if tx_type == "purchase" and status in ("received", "pending", "ordered"):
        return True
    return scope == "retail_purchases" and tx_type == "opening_stock" and status == "received"


def _purchase_return_tx(tx_type: str, status: str) -> bool:
    return tx_type == "purchase_return" and status in ("final", "received")


def _sell_tx(tx_type: str, status: str) -> bool:
    return tx_type == "sell" and status == "final"


def _sell_transfer_tx(tx_type: str, status: str) -> bool:
    return tx_type == "sell_transfer" and status == "final"


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
    until: str | None = None,
    existing_movement_legacy: dict[int, str] | None = None,
    scope: MovementScope = "all",
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
        if not row_date_in_range(txn, "transaction_date", since=since, until=until):
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

        if _inbound_purchase_tx(tx_type, status, scope=scope):
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
            ledger_category = "Opening Stock" if tx_type == "opening_stock" else "Purchases"
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
                "category": ledger_category,
                "description": f"Purchase {ref}",
                "linkedRecordType": "stock_movement",
                "linkedRecordId": mov_id,
                "date": tx_date,
            })
            continue

        if _purchase_return_tx(tx_type, status):
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

        if scope == "all" and _sell_tx(tx_type, status):
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

        if scope == "all" and _sell_transfer_tx(tx_type, status):
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


def transform_expense_records(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    user_names: dict[int, str] | None = None,
    since: str | None = None,
    until: str | None = None,
    existing_category_legacy: dict[int, str] | None = None,
    existing_expense_legacy: dict[int, str] | None = None,
) -> TransformResult:
    """Map expense_categories + expense/payroll transactions to Vonos models."""
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
    existing_category_legacy = existing_category_legacy or {}
    existing_expense_legacy = existing_expense_legacy or {}

    for cat in table_rows(tables, "expense_categories"):
        legacy_id = parse_int(cat.get("id"))
        if legacy_id <= 0:
            continue
        if legacy_id in existing_category_legacy:
            continue
        new_id = new_cuid()
        code = str(cat.get("code") or "").strip() or None
        result.expense_categories.append({
            "id": new_id,
            "tenantId": tenant_id,
            "name": str(cat.get("name") or "Other"),
            "code": code,
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "expense_category",
            "legacyId": legacy_id,
            "newId": new_id,
        })

    category_legacy = {
        **existing_category_legacy,
        **{
            e["legacyId"]: e["newId"]
            for e in result.legacy_ids
            if e.get("entityType") == "expense_category"
        },
    }
    category_names = {
        str(r.get("id")): str(r.get("name") or "Other")
        for r in table_rows(tables, "expense_categories")
        if r.get("id") is not None
    }

    for txn in table_rows(tables, "transactions"):
        tx_type = str(txn.get("type") or "")
        if tx_type not in ("expense",):
            continue
        legacy_tx_id = parse_int(txn.get("id"))
        if legacy_tx_id <= 0:
            continue
        if legacy_tx_id in existing_expense_legacy:
            continue
        if not row_date_in_range(txn, "transaction_date", since=since, until=until):
            continue
        amount = parse_decimal(txn.get("final_total"))
        if amount <= 0:
            continue

        cat_id = parse_int(txn.get("expense_category_id"), 0)
        category_id = category_legacy.get(cat_id) if cat_id > 0 else None
        category_name = category_names.get(str(cat_id), "Payroll" if tx_type == "payroll" else "Other")
        ref = str(txn.get("ref_no") or txn.get("invoice_no") or f"EXP-{legacy_tx_id}").strip()
        tx_date = parse_tx_date(txn.get("transaction_date"))
        payment_status = str(txn.get("payment_status") or "due").lower()
        payment_due = Decimal("0") if payment_status == "paid" else amount

        expense_id = new_cuid()
        result.expenses.append({
            "id": expense_id,
            "tenantId": tenant_id,
            "refNo": ref,
            "categoryId": category_id,
            "subCategory": None,
            "locationCode": None,
            "expenseFor": str(txn.get("expense_for") or "") or None,
            "contactName": None,
            "totalAmount": str(amount),
            "taxAmount": str(parse_decimal(txn.get("tax_amount"))),
            "paymentStatus": payment_status,
            "paymentDue": str(payment_due),
            "note": str(txn.get("additional_notes") or txn.get("staff_note") or "") or None,
            "isRecurring": False,
            "recurInterval": None,
            "recurIntervalType": None,
            "expenseDate": tx_date,
            "createdById": None,
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "expense",
            "legacyId": legacy_tx_id,
            "newId": expense_id,
        })
        result.ledger_entries.append({
            "id": f"mig_ledger_{expense_id}",
            "tenantId": tenant_id,
            "type": "expense",
            "amount": str(amount),
            "currency": "NGN",
            "category": category_name,
            "description": f"{tx_type.title()} {ref}",
            "linkedRecordType": "expense",
            "linkedRecordId": expense_id,
            "date": tx_date,
        })

    return result


def transform_expense_ledger(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    since: str | None = None,
) -> TransformResult:
    """Backward-compatible ledger-only path (categories/expenses use transform_expense_records)."""
    records = transform_expense_records(tables, tenant_id, since=since)
    result = TransformResult()
    result.ledger_entries = records.ledger_entries
    result.warnings = records.warnings
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
        brand_legacy=existing.get("brand"),
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

    expense_result = transform_expense_records(tables, tenant_id, since=since)
    merged.merge(expense_result)

    return merged


def serialize_movement_lines(movement: dict[str, Any]) -> dict[str, Any]:
    """Ensure lines are JSON-serializable for Postgres Json column."""
    out = dict(movement)
    out["lines"] = json.loads(json.dumps(movement.get("lines", [])))
    out.setdefault("source", "standard")
    out.setdefault("supplierId", None)
    return out
