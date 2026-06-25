"""Import legacy payment accounts, account book, and transaction payments."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from migration.pos_common import (
    build_legacy_user_name_map,
    legacy_map,
    new_cuid,
    parse_decimal,
    parse_int,
    parse_tx_date,
    row_date_on_or_after,
    table_rows,
)
from migration.types import TableData, TransformResult


def _account_type_name(types: dict[int, dict[str, Any]], type_id: Any) -> str | None:
    tid = parse_int(type_id, 0)
    if tid <= 0:
        return None
    row = types.get(tid)
    if not row:
        return None
    name = str(row.get("name") or "").strip()
    parent_id = parse_int(row.get("parent_account_type_id"), 0)
    if parent_id > 0:
        parent = types.get(parent_id)
        if parent:
            return f"{parent.get('name', '')} / {name}".strip(" /")
    return name or None


def transform_accounts(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    user_names: dict[int, str] | None = None,
    since: str | None = None,
    existing_legacy: dict[str, dict[int, str]] | None = None,
) -> TransformResult:
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
    existing = existing_legacy or {}

    account_types = {
        parse_int(r.get("id"), 0): r
        for r in table_rows(tables, "account_types")
        if r.get("id") is not None
    }

    account_legacy: dict[int, str] = {**existing.get("payment_account", {})}
    payment_legacy: dict[int, str] = {**existing.get("payment", {})}
    sale_legacy = existing.get("sale", {})
    supplier_legacy = existing.get("supplier", {})

    for row in table_rows(tables, "accounts"):
        if row.get("deleted_at") not in (None, "", "NULL"):
            continue
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in account_legacy:
            continue
        if since and row.get("created_at"):
            if not row_date_on_or_after(row, "created_at", since):
                continue

        acct_id = new_cuid()
        created_by = parse_int(row.get("created_by"), 0)
        result.payment_accounts.append({
            "id": acct_id,
            "tenantId": tenant_id,
            "name": str(row.get("name") or f"Account {legacy_id}"),
            "accountNumber": str(row.get("account_number") or str(legacy_id)),
            "accountType": _account_type_name(account_types, row.get("account_type_id")),
            "accountSubType": None,
            "accountDetails": str(row.get("account_details") or "") or None,
            "note": str(row.get("note") or "") or None,
            "isClosed": bool(parse_int(row.get("is_closed"), 0)),
            "currency": "NGN",
            "createdByName": user_names.get(created_by),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "payment_account",
            "legacyId": legacy_id,
            "newId": acct_id,
        })
        account_legacy[legacy_id] = acct_id

    account_legacy = {**account_legacy, **legacy_map(result.legacy_ids, "payment_account")}

    for row in table_rows(tables, "account_transactions"):
        if row.get("deleted_at") not in (None, "", "NULL"):
            continue
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0:
            continue
        if since and not row_date_on_or_after(row, "operation_date", since):
            continue

        legacy_acct = parse_int(row.get("account_id"))
        account_id = account_legacy.get(legacy_acct)
        if not account_id:
            continue

        tx_type = str(row.get("type") or "debit").lower()
        if tx_type not in ("debit", "credit"):
            tx_type = "debit"

        legacy_sale = parse_int(row.get("transaction_id"), 0)
        sale_id = sale_legacy.get(legacy_sale) if legacy_sale > 0 else None

        result.account_transactions.append({
            "id": new_cuid(),
            "tenantId": tenant_id,
            "accountId": account_id,
            "type": tx_type,
            "subType": str(row.get("sub_type") or "") or None,
            "amount": str(parse_decimal(row.get("amount"))),
            "refNo": str(row.get("reff_no") or "") or None,
            "operationDate": parse_tx_date(row.get("operation_date")),
            "note": str(row.get("note") or "") or None,
            "paymentMethod": None,
            "paymentDetails": None,
            "saleId": sale_id,
            "paymentId": None,
            "createdByName": user_names.get(parse_int(row.get("created_by"), 0)),
        })

    for row in table_rows(tables, "transaction_payments"):
        legacy_id = parse_int(row.get("id"))
        if legacy_id <= 0 or legacy_id in payment_legacy:
            continue
        if since and row.get("paid_on"):
            if not row_date_on_or_after(row, "paid_on", since):
                continue

        legacy_acct = parse_int(row.get("account_id"), 0)
        account_id = account_legacy.get(legacy_acct) if legacy_acct > 0 else None

        legacy_sale = parse_int(row.get("transaction_id"), 0)
        sale_id = sale_legacy.get(legacy_sale) if legacy_sale > 0 else None

        payment_for_id = parse_int(row.get("payment_for"), 0)
        payment_for = None
        if payment_for_id > 0:
            payment_for = supplier_legacy.get(payment_for_id) or f"contact:{payment_for_id}"

        pay_id = new_cuid()
        result.payments.append({
            "id": pay_id,
            "tenantId": tenant_id,
            "amount": str(parse_decimal(row.get("amount"))),
            "currency": "NGN",
            "method": str(row.get("method") or "") or None,
            "paymentRefNo": str(row.get("payment_ref_no") or row.get("transaction_no") or "") or None,
            "paidOn": parse_tx_date(row.get("paid_on")) if row.get("paid_on") else None,
            "paymentFor": payment_for,
            "accountId": account_id,
            "saleId": sale_id,
            "isReturn": bool(parse_int(row.get("is_return"), 0)),
            "note": str(row.get("note") or "") or None,
            "createdByName": user_names.get(parse_int(row.get("created_by"), 0)),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "payment",
            "legacyId": legacy_id,
            "newId": pay_id,
        })

    return result
