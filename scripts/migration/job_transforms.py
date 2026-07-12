"""Job-centric archetype transforms (VM, VMS)."""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Any, Literal

from migration.pos_common import (
    build_legacy_user_name_map,
    contact_display_name,
    created_by_fields,
    legacy_map,
    map_payment_status,
    new_cuid,
    parse_decimal,
    parse_int,
    parse_tx_date,
    row_date_in_range,
    table_rows,
    transform_contacts,
    transform_items,
    transform_sales,
)
from migration.types import TableData, TransformResult

EntityCode = Literal["VM", "VMS", "HQ3", "HQ2"]


def is_job_candidate(txn: dict[str, Any]) -> bool:
    tx_type = str(txn.get("type") or "")
    status = str(txn.get("status") or "").lower()
    sub_status = str(txn.get("sub_status") or "").lower()
    is_quotation = parse_int(txn.get("is_quotation")) == 1

    if status == "draft":
        return False
    if is_quotation:
        return True
    if sub_status in ("quotation", "proforma"):
        return True
    if tx_type == "sell" and status in ("final", "received"):
        return True
    return False


def map_job_status(txn: dict[str, Any], entity_code: EntityCode) -> str | None:
    status = str(txn.get("status") or "").lower()
    sub_status = str(txn.get("sub_status") or "").lower()
    is_quotation = parse_int(txn.get("is_quotation")) == 1
    payment = map_payment_status(txn.get("payment_status"))

    if status == "draft":
        return None
    if is_quotation or sub_status in ("quotation", "proforma"):
        return "Quoted"
    if status == "received":
        return "Received"
    if entity_code in ("VMS", "HQ3", "HQ2") and status == "ordered":
        return "Approved"
    if status == "final":
        if payment == "paid":
            return "Delivered"
        return "In Progress"
    return "Received"


def transform_jobs(
    tables: dict[str, TableData],
    tenant_id: str,
    customer_legacy: dict[int, str],
    *,
    entity_code: EntityCode,
    reference_prefix: str = "",
    user_names: dict[int, str] | None = None,
    user_vonos: dict[int, str] | None = None,
    since: str | None = None,
    until: str | None = None,
    existing_job_legacy: dict[int, str] | None = None,
) -> TransformResult:
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
    existing_job_legacy = existing_job_legacy or {}
    customer_names = {
        parse_int(r.get("id")): contact_display_name(r)
        for r in table_rows(tables, "contacts")
        if r.get("id") is not None
    }

    seen_references: set[str] = set()

    for txn in table_rows(tables, "transactions"):
        if not is_job_candidate(txn):
            continue
        legacy_tx_id = parse_int(txn.get("id"))
        if legacy_tx_id <= 0:
            continue
        if legacy_tx_id in existing_job_legacy:
            continue
        if not row_date_in_range(txn, "transaction_date", since=since, until=until):
            continue

        job_status = map_job_status(txn, entity_code)
        if job_status is None:
            continue

        job_id = new_cuid()
        ref_raw = str(txn.get("invoice_no") or txn.get("ref_no") or f"JOB-{legacy_tx_id}").strip()
        reference = ref_raw if not reference_prefix else (
            ref_raw if ref_raw.startswith(reference_prefix) else f"{reference_prefix}{ref_raw}"
        )
        if reference in seen_references:
            reference = f"{reference}-{legacy_tx_id}"
        seen_references.add(reference)

        contact_id = parse_int(txn.get("contact_id")) if txn.get("contact_id") not in (None, "", "NULL") else 0
        customer_name = customer_names.get(contact_id)
        if not customer_name and contact_id in customer_legacy:
            customer_name = f"Customer-{contact_id}"

        notes = str(txn.get("additional_notes") or "").strip()
        shipping = str(txn.get("shipping_details") or "").strip()
        description_parts = [p for p in (notes, shipping) if p]
        description = " — ".join(description_parts) if description_parts else f"Legacy job {reference}"

        sub_status = str(txn.get("sub_status") or "").lower()
        is_quotation = parse_int(txn.get("is_quotation")) == 1
        has_quote = is_quotation or sub_status in ("quotation", "proforma")
        quote_amount = str(parse_decimal(txn.get("final_total"))) if has_quote else None
        due_date = parse_tx_date(txn.get("transaction_date"))

        result.jobs.append({
            "id": job_id,
            "tenantId": tenant_id,
            "reference": reference,
            "description": description,
            "status": job_status,
            "hasQuote": has_quote,
            "quoteAmount": quote_amount,
            "customerId": customer_legacy.get(contact_id) if contact_id > 0 else None,
            "customerName": customer_name,
            "vehicleId": None,
            "assignedStaffIds": [],
            "dueDate": due_date,
            "legacyTransactionId": legacy_tx_id,
            **created_by_fields(txn.get("created_by"), user_names, user_vonos),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "job",
            "legacyId": legacy_tx_id,
            "newId": job_id,
        })

        if str(txn.get("status") or "").lower() == "final":
            total = parse_decimal(txn.get("final_total"))
            result.ledger_entries.append({
                "id": f"mig_ledger_{job_id}",
                "tenantId": tenant_id,
                "type": "revenue",
                "amount": str(total),
                "currency": "NGN",
                "category": "Jobs",
                "description": f"Job {reference}",
                "linkedRecordType": "job",
                "linkedRecordId": job_id,
                "date": due_date,
            })

    return result


def transform_job_materials(
    tables: dict[str, TableData],
    job_legacy: dict[int, str],
    item_legacy: dict[int, str],
) -> TransformResult:
    result = TransformResult()
    products = {str(r["id"]): r for r in table_rows(tables, "products") if r.get("id") is not None}
    variations = {str(r["id"]): r for r in table_rows(tables, "variations") if r.get("id") is not None}

    lines_by_tx: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for sl in table_rows(tables, "transaction_sell_lines"):
        lines_by_tx[str(sl.get("transaction_id") or "")].append(sl)

    for legacy_tx_id, job_id in job_legacy.items():
        for sl in lines_by_tx.get(str(legacy_tx_id), []):
            vid = parse_int(sl.get("variation_id"))
            variation = variations.get(str(vid), {})
            product = products.get(str(sl.get("product_id") or variation.get("product_id") or ""), {})
            name = str(product.get("name") or "Material")
            qty = parse_decimal(sl.get("quantity"), Decimal("1"))
            unit_cost = parse_decimal(sl.get("unit_price_inc_tax") or sl.get("unit_price"))
            total_cost = qty * unit_cost
            product_type = str(product.get("type") or "").lower()

            if product_type == "service":
                result.job_labours.append({
                    "id": new_cuid(),
                    "jobId": job_id,
                    "staffId": "legacy-import",
                    "hours": str(qty),
                    "rate": str(unit_cost),
                    "totalCost": str(total_cost),
                })
                continue

            result.job_materials.append({
                "id": new_cuid(),
                "jobId": job_id,
                "itemId": item_legacy.get(vid),
                "name": name,
                "quantity": str(qty),
                "unitCost": str(unit_cost),
                "totalCost": str(total_cost),
                "source": "legacy_pos",
            })

    return result


def transform_expense_ledger(
    tables: dict[str, TableData],
    tenant_id: str,
) -> TransformResult:
    from migration.stock_transforms import transform_expense_ledger as stock_expense

    return stock_expense(tables, tenant_id)


def run_job_migration(
    tables: dict[str, TableData],
    tenant_id: str,
    entity_code: EntityCode,
    *,
    reference_prefix: str | None = None,
    since: str | None = None,
    until: str | None = None,
    existing_legacy: dict[str, dict[int, str]] | None = None,
    include_purchases: bool = False,
    include_sales: bool = False,
) -> TransformResult:
    merged = TransformResult()
    user_names = build_legacy_user_name_map(tables)
    existing = existing_legacy or {}
    prefix = reference_prefix if reference_prefix is not None else f"{entity_code}-"

    contact_result = transform_contacts(
        tables,
        tenant_id,
        user_names=user_names,
        existing_customer_legacy=existing.get("customer"),
        existing_supplier_legacy=existing.get("supplier"),
    )
    merged.merge(contact_result)

    item_result = transform_items(
        tables,
        tenant_id,
        available_for_retail=False,
        user_names=user_names,
        existing_item_legacy=existing.get("item"),
        brand_legacy=existing.get("brand"),
    )
    merged.merge(item_result)

    customer_legacy = {
        **legacy_map(merged.legacy_ids, "customer"),
        **(existing.get("customer") or {}),
    }
    item_legacy = {
        **legacy_map(merged.legacy_ids, "item"),
        **(existing.get("item") or {}),
    }
    supplier_legacy = {
        **legacy_map(merged.legacy_ids, "supplier"),
        **(existing.get("supplier") or {}),
    }

    job_result = transform_jobs(
        tables,
        tenant_id,
        customer_legacy,
        entity_code=entity_code,
        reference_prefix=prefix,
        user_names=user_names,
        since=since,
        until=until,
        existing_job_legacy=existing.get("job"),
    )
    merged.merge(job_result)

    job_legacy = {
        **legacy_map(merged.legacy_ids, "job"),
        **(existing.get("job") or {}),
    }
    mat_result = transform_job_materials(tables, job_legacy, item_legacy)
    merged.merge(mat_result)

    from migration.stock_transforms import transform_expense_records, transform_stock_movements

    expense_result = transform_expense_records(
        tables,
        tenant_id,
        user_names=user_names,
        since=since,
        until=until,
        existing_category_legacy=existing.get("expense_category"),
        existing_expense_legacy=existing.get("expense"),
    )
    merged.merge(expense_result)

    if include_sales:
        # Also materialize HQ6/Ultimate POS sells as Sale rows (Sell UI),
        # while keeping the job mapping above for workshop workflow.
        sale_result = transform_sales(
            tables,
            tenant_id,
            item_legacy,
            customer_legacy,
            reference_prefix=prefix,
            user_names=user_names,
            since=since,
            until=until,
            existing_sale_legacy=existing.get("sale"),
        )
        merged.merge(sale_result)

    if include_purchases:
        purchase_result = transform_stock_movements(
            tables,
            tenant_id,
            item_legacy,
            supplier_legacy=supplier_legacy,
            user_names=user_names,
            since=since,
            until=until,
            existing_movement_legacy=existing.get("stock_movement"),
            # Purchases (+ opening stock) only — do not map sells to outbound
            # (VA sells are jobs + optional Sale rows).
            scope="retail_purchases",
        )
        merged.merge(purchase_result)

    return merged
