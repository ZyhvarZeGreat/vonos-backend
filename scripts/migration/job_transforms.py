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
    table_rows,
    transform_contacts,
    transform_items,
)
from migration.types import TableData, TransformResult

EntityCode = Literal["VM", "VMS"]


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
    if entity_code == "VMS" and status == "ordered":
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
) -> TransformResult:
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
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
                "id": new_cuid(),
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
) -> TransformResult:
    merged = TransformResult()
    user_names = build_legacy_user_name_map(tables)

    contact_result = transform_contacts(tables, tenant_id, user_names=user_names)
    merged.merge(contact_result)

    item_result = transform_items(tables, tenant_id, available_for_retail=False, user_names=user_names)
    merged.merge(item_result)

    customer_legacy = legacy_map(merged.legacy_ids, "customer")
    item_legacy = legacy_map(merged.legacy_ids, "item")

    job_result = transform_jobs(
        tables,
        tenant_id,
        customer_legacy,
        entity_code=entity_code,
        reference_prefix=f"{entity_code}-",
        user_names=user_names,
    )
    merged.merge(job_result)

    job_legacy = legacy_map(merged.legacy_ids, "job")
    mat_result = transform_job_materials(tables, job_legacy, item_legacy)
    merged.merge(mat_result)

    expense_result = transform_expense_ledger(tables, tenant_id)
    merged.merge(expense_result)

    return merged
