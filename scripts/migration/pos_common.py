"""Shared Ultimate POS → Vonos transform helpers."""

from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from migration.types import TableData, TransformResult


def build_legacy_user_name_map(tables: dict[str, TableData]) -> dict[int, str]:
    from migration.audit_transforms import build_legacy_user_name_map as _map

    return _map(tables)


def created_by_fields(
    created_by_raw: Any,
    user_names: dict[int, str],
    user_vonos: dict[int, str] | None = None,
) -> dict[str, Any]:
    from migration.audit_transforms import created_by_fields as _fields

    return _fields(created_by_raw, user_names, user_vonos)


def new_cuid() -> str:
    return f"mig_{uuid.uuid4().hex[:24]}"


def parse_decimal(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    if value is None or value == "":
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return default


def parse_int(value: Any, default: int = 0) -> int:
    if value is None or value == "":
        return default
    try:
        return int(float(str(value)))
    except (ValueError, TypeError):
        return default


def contact_display_name(row: dict[str, Any]) -> str:
    for key in ("name", "supplier_business_name"):
        v = row.get(key)
        if v and str(v).strip():
            return str(v).strip()
    parts = [str(row.get("first_name") or "").strip(), str(row.get("last_name") or "").strip()]
    joined = " ".join(p for p in parts if p)
    return joined or f"Contact-{row.get('id')}"


def derive_stock_status(quantity: int, reorder_point: int | None) -> str:
    if quantity <= 0:
        return "out_of_stock"
    if reorder_point is not None and quantity <= reorder_point:
        return "low_stock"
    return "in_stock"


def map_payment_status(raw: Any) -> str | None:
    if raw is None:
        return "paid"
    s = str(raw).lower()
    if s in ("paid", "partial", "due"):
        return s
    return "paid"


def map_sale_status(raw: Any) -> str:
    s = str(raw or "").lower()
    if s == "final":
        return "completed"
    if s == "draft":
        return "draft"
    return "completed"


def parse_tx_date(raw: Any) -> str:
    if raw is None or str(raw).strip() in ("", "NULL"):
        return datetime.utcnow().isoformat()
    return str(raw).strip()


def row_date_on_or_after(row: dict[str, Any], field: str, since: str) -> bool:
    """True when row[field] is on or after since (YYYY-MM-DD comparison)."""
    raw = row.get(field)
    if raw is None or str(raw).strip() in ("", "NULL"):
        return False
    return str(raw).strip()[:10] >= since.strip()[:10]


def row_date_on_or_before(row: dict[str, Any], field: str, until: str) -> bool:
    """True when row[field] is on or before until (YYYY-MM-DD comparison)."""
    raw = row.get(field)
    if raw is None or str(raw).strip() in ("", "NULL"):
        return False
    return str(raw).strip()[:10] <= until.strip()[:10]


def row_date_in_range(
    row: dict[str, Any],
    field: str,
    *,
    since: str | None = None,
    until: str | None = None,
) -> bool:
    """True when row[field] falls within optional since/until bounds (inclusive)."""
    if since and not row_date_on_or_after(row, field, since):
        return False
    if until and not row_date_on_or_before(row, field, until):
        return False
    return True


def table_rows(tables: dict[str, TableData], name: str) -> list[dict[str, Any]]:
    return tables.get(name, TableData(name)).rows


def legacy_map(legacy_ids: list[dict[str, Any]], entity_type: str) -> dict[int, str]:
    return {
        entry["legacyId"]: entry["newId"]
        for entry in legacy_ids
        if entry.get("entityType") == entity_type
    }


def transform_items(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    available_for_retail: bool = False,
    bin_by_variation: dict[str, str] | None = None,
    user_names: dict[int, str] | None = None,
    user_vonos: dict[int, str] | None = None,
    existing_item_legacy: dict[int, str] | None = None,
    brand_legacy: dict[int, str] | None = None,
) -> TransformResult:
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
    brand_id_legacy = brand_legacy or {}
    products = {str(r["id"]): r for r in table_rows(tables, "products") if r.get("id") is not None}
    variation_rows = table_rows(tables, "variations")
    categories = {
        str(r["id"]): r.get("name")
        for r in table_rows(tables, "categories")
        if r.get("id") is not None
    }
    product_item_mapped: set[str] = set()

    qty_by_variation: dict[str, int] = defaultdict(int)
    for vld in table_rows(tables, "variation_location_details"):
        vid = str(vld.get("variation_id") or "")
        qty_by_variation[vid] += parse_int(vld.get("qty_available"))

    opening_qty: dict[str, int] = defaultdict(int)
    opening_tx_ids = {
        str(t["id"])
        for t in table_rows(tables, "transactions")
        if str(t.get("type") or "") == "opening_stock"
    }
    for pl in table_rows(tables, "purchase_lines"):
        if str(pl.get("transaction_id") or "") in opening_tx_ids:
            vid = str(pl.get("variation_id") or "")
            opening_qty[vid] += parse_int(pl.get("quantity"))

    for variation in variation_rows:
        vid = str(variation.get("id") or "")
        pid = str(variation.get("product_id") or "")
        if not vid:
            continue
        legacy_vid = int(vid)
        if existing_item_legacy and legacy_vid in existing_item_legacy:
            continue
        product = products.get(pid, {})
        if not product:
            result.warnings.append(f"variation {vid} missing product {pid}")
            continue

        sku = str(variation.get("sub_sku") or product.get("sku") or f"SKU-{vid}")
        name = str(product.get("name") or "Unknown")
        if str(product.get("type") or "") == "variable":
            vname = str(variation.get("name") or "")
            if vname and vname.upper() != "DUMMY":
                name = f"{name} — {vname}"

        cat_id = product.get("category_id")
        category = categories.get(str(cat_id)) if cat_id is not None else None
        legacy_brand_id = parse_int(product.get("brand_id"), 0)
        brand_id = (
            brand_id_legacy.get(legacy_brand_id)
            if legacy_brand_id > 0
            else None
        )

        qty = qty_by_variation.get(vid, 0)
        if qty <= 0 and opening_qty.get(vid, 0) > 0:
            qty = opening_qty[vid]

        reorder = parse_int(product.get("alert_quantity"), default=0)
        reorder_point = reorder if reorder > 0 else None
        new_id = new_cuid()
        bin_location = (bin_by_variation or {}).get(vid)

        result.items.append({
            "id": new_id,
            "tenantId": tenant_id,
            "sku": sku,
            "name": name,
            "category": category,
            "brandId": brand_id,
            "quantity": qty,
            "binLocation": bin_location,
            "costPrice": str(parse_decimal(variation.get("default_purchase_price"))),
            "reorderPoint": reorder_point,
            "currency": "NGN",
            "status": derive_stock_status(qty, reorder_point),
            "availableForRetail": available_for_retail,
            "legacyVariationId": int(vid),
            **created_by_fields(product.get("created_by"), user_names, user_vonos),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "item",
            "legacyId": int(vid),
            "newId": new_id,
        })
        if pid and pid not in product_item_mapped:
            product_item_mapped.add(pid)
            result.legacy_ids.append({
                "tenantId": tenant_id,
                "entityType": "product",
                "legacyId": int(pid),
                "newId": new_id,
            })

    return result


def transform_contacts(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    user_names: dict[int, str] | None = None,
    user_vonos: dict[int, str] | None = None,
    existing_customer_legacy: dict[int, str] | None = None,
    existing_supplier_legacy: dict[int, str] | None = None,
) -> TransformResult:
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
    for row in table_rows(tables, "contacts"):
        ctype = str(row.get("type") or "").lower()
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0:
            continue

        if ctype in ("customer", "both"):
            if not (existing_customer_legacy and legacy_id in existing_customer_legacy):
                new_id = new_cuid()
                result.customers.append({
                    "id": new_id,
                    "tenantId": tenant_id,
                    "name": contact_display_name(row),
                    "email": (str(row["email"]).strip() or None) if row.get("email") else None,
                    "phone": str(row.get("mobile") or "").strip() or None,
                    "legacyContactId": legacy_id,
                    **created_by_fields(row.get("created_by"), user_names, user_vonos),
                })
                result.legacy_ids.append({
                    "tenantId": tenant_id,
                    "entityType": "customer",
                    "legacyId": legacy_id,
                    "newId": new_id,
                })

        if ctype in ("supplier", "both"):
            if not (existing_supplier_legacy and legacy_id in existing_supplier_legacy):
                new_id = new_cuid()
                addr_parts = [str(row.get("address_line_1") or "").strip(), str(row.get("address_line_2") or "").strip()]
                address = ", ".join(p for p in addr_parts if p) or None
                result.suppliers.append({
                    "id": new_id,
                    "tenantId": tenant_id,
                    "name": str(row.get("supplier_business_name") or row.get("name") or f"Supplier-{legacy_id}"),
                    "contactName": contact_display_name(row) if ctype == "both" else None,
                    "email": (str(row["email"]).strip() or None) if row.get("email") else None,
                    "phone": str(row.get("mobile") or "").strip() or None,
                    "address": address,
                    "legacyContactId": legacy_id,
                    **created_by_fields(row.get("created_by"), user_names, user_vonos),
                })
                result.legacy_ids.append({
                    "tenantId": tenant_id,
                    "entityType": "supplier",
                    "legacyId": legacy_id,
                    "newId": new_id,
                })

    return result


def transform_sales(
    tables: dict[str, TableData],
    tenant_id: str,
    item_legacy: dict[int, str],
    customer_legacy: dict[int, str],
    *,
    reference_prefix: str = "",
    user_names: dict[int, str] | None = None,
    user_vonos: dict[int, str] | None = None,
    since: str | None = None,
    until: str | None = None,
    existing_sale_legacy: dict[int, str] | None = None,
    backfill_lines: bool = False,
) -> TransformResult:
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
    products = {str(r["id"]): r for r in table_rows(tables, "products") if r.get("id") is not None}
    variations = {str(r["id"]): r for r in table_rows(tables, "variations") if r.get("id") is not None}

    sell_txns = [
        t for t in table_rows(tables, "transactions")
        if str(t.get("type") or "") == "sell" and str(t.get("status") or "").lower() == "final"
    ]

    sell_lines_by_tx: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for sl in table_rows(tables, "transaction_sell_lines"):
        tid = str(sl.get("transaction_id") or "")
        sell_lines_by_tx[tid].append(sl)

    customer_names = {
        parse_int(r.get("id")): contact_display_name(r)
        for r in table_rows(tables, "contacts")
        if r.get("id") is not None
    }

    orphan_variations = 0
    seen_references: set[str] = set()
    for txn in sell_txns:
        legacy_tx_id = parse_int(txn.get("id"))
        if not row_date_in_range(txn, "transaction_date", since=since, until=until):
            continue

        existing_sale_id = (
            existing_sale_legacy.get(legacy_tx_id) if existing_sale_legacy else None
        )
        if existing_sale_id and not backfill_lines:
            continue
        if existing_sale_id:
            sale_id = existing_sale_id
        else:
            sale_id = new_cuid()
        ref_raw = str(txn.get("invoice_no") or txn.get("ref_no") or f"{reference_prefix}{legacy_tx_id}").strip()
        ref = ref_raw if not reference_prefix or ref_raw.startswith(reference_prefix) else f"{reference_prefix}{ref_raw}"
        if not existing_sale_id:
            if ref in seen_references:
                ref = f"{ref}-{legacy_tx_id}"
            seen_references.add(ref)

        contact_id_raw = txn.get("contact_id")
        customer_id = None
        if contact_id_raw is not None and str(contact_id_raw) not in ("", "NULL"):
            customer_id = customer_legacy.get(parse_int(contact_id_raw))

        total = parse_decimal(txn.get("final_total"))
        sale_date = parse_tx_date(txn.get("transaction_date"))

        lines = sell_lines_by_tx.get(str(legacy_tx_id), [])
        sale_lines_out: list[dict[str, Any]] = []

        for sl in lines:
            vid = parse_int(sl.get("variation_id"))
            item_id = item_legacy.get(vid)
            if vid and not item_id:
                orphan_variations += 1

            variation = variations.get(str(vid), {})
            product = products.get(str(sl.get("product_id") or variation.get("product_id") or ""), {})
            sku = str(variation.get("sub_sku") or product.get("sku") or f"SKU-{vid}")
            name = str(product.get("name") or "Line item")
            qty = parse_decimal(sl.get("quantity"), Decimal("1"))
            unit_price = parse_decimal(sl.get("unit_price_inc_tax") or sl.get("unit_price"))
            line_total = unit_price * qty

            line_id = new_cuid()
            sale_lines_out.append({
                "id": line_id,
                "saleId": sale_id,
                "itemId": item_id,
                "sku": sku,
                "name": name,
                "quantity": str(qty),
                "unitPrice": str(unit_price),
                "lineTotal": str(line_total),
                "discountAmount": None,
            })

        result.sale_lines.extend(sale_lines_out)
        if existing_sale_id:
            continue

        result.sales.append({
            "id": sale_id,
            "tenantId": tenant_id,
            "reference": ref,
            "customerId": customer_id,
            "total": str(total),
            "currency": "NGN",
            "status": map_sale_status(txn.get("status")),
            "paymentStatus": map_payment_status(txn.get("payment_status")),
            "date": sale_date,
            "itemCount": len(sale_lines_out),
            "legacyTransactionId": legacy_tx_id,
            **created_by_fields(txn.get("created_by"), user_names, user_vonos),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "sale",
            "legacyId": legacy_tx_id,
            "newId": sale_id,
        })
        result.ledger_entries.append({
            "id": f"mig_ledger_{sale_id}",
            "tenantId": tenant_id,
            "type": "revenue",
            "amount": str(total),
            "currency": "NGN",
            "category": "Sales",
            "description": f"Sale {ref}",
            "linkedRecordType": "sale",
            "linkedRecordId": sale_id,
            "date": sale_date,
        })

    if orphan_variations:
        result.warnings.append(f"{orphan_variations} sell lines reference unmapped variation_id")

    return result
