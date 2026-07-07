"""Essentials HRM → Vonos Payroll / PayrollGroup / PayComponent transforms."""

from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

from migration.pos_common import (
    build_legacy_user_name_map,
    new_cuid,
    parse_decimal,
    parse_int,
    parse_tx_date,
    row_date_in_range,
    table_rows,
)
from migration.types import TableData, TransformResult


def _user_display_name(user: dict[str, Any] | None, user_id: int) -> str:
    if not user:
        return f"Employee #{user_id}"
    parts = [
        str(user.get("first_name") or "").strip(),
        str(user.get("last_name") or "").strip(),
        str(user.get("surname") or "").strip(),
    ]
    name = " ".join(p for p in parts if p)
    return name or str(user.get("username") or f"Employee #{user_id}")


def _sum_json_amounts(blob: Any, amounts_key: str) -> Decimal:
    if blob is None or blob == "" or blob == "NULL":
        return Decimal("0")
    try:
        data = json.loads(blob) if isinstance(blob, str) else blob
        if not isinstance(data, dict):
            return Decimal("0")
        total = Decimal("0")
        for value in data.get(amounts_key, []):
            total += parse_decimal(value)
        return total
    except (json.JSONDecodeError, TypeError, ValueError):
        return Decimal("0")


def _map_payroll_status(raw: Any) -> str:
    status = str(raw or "final").lower()
    if status in ("draft", "final", "paid"):
        return status
    return "final"


def _map_payment_status(raw: Any) -> str:
    status = str(raw or "due").lower()
    if status in ("paid", "due", "partial"):
        return status
    return "due"


def _location_code(
    location_id: Any,
    locations: dict[int, dict[str, Any]],
) -> str | None:
    loc_id = parse_int(location_id, 0)
    if loc_id <= 0:
        return None
    loc = locations.get(loc_id)
    if not loc:
        return str(loc_id)
    name = str(loc.get("name") or "").strip()
    return name or str(loc_id)


def transform_hrm_records(
    tables: dict[str, TableData],
    tenant_id: str,
    *,
    user_names: dict[int, str] | None = None,
    since: str | None = None,
    until: str | None = None,
    existing_group_legacy: dict[int, str] | None = None,
    existing_payroll_legacy: dict[int, str] | None = None,
    existing_component_legacy: dict[int, str] | None = None,
) -> TransformResult:
    """Map Essentials payroll tables to Vonos HRM models."""
    result = TransformResult()
    user_names = user_names or build_legacy_user_name_map(tables)
    existing_group_legacy = existing_group_legacy or {}
    existing_payroll_legacy = existing_payroll_legacy or {}
    existing_component_legacy = existing_component_legacy or {}

    users = {
        parse_int(row.get("id")): row
        for row in table_rows(tables, "users")
        if parse_int(row.get("id")) > 0
    }
    locations = {
        parse_int(row.get("id")): row
        for row in table_rows(tables, "business_locations")
        if parse_int(row.get("id")) > 0
    }

    group_legacy: dict[int, str] = dict(existing_group_legacy)
    for group in table_rows(tables, "essentials_payroll_groups"):
        legacy_id = parse_int(group.get("id"))
        if legacy_id <= 0 or legacy_id in group_legacy:
            continue
        new_id = new_cuid()
        created_at = parse_tx_date(group.get("created_at"))
        result.payroll_groups.append({
            "id": new_id,
            "tenantId": tenant_id,
            "name": str(group.get("name") or f"Payroll group {legacy_id}"),
            "createdAt": created_at,
            "updatedAt": parse_tx_date(group.get("updated_at") or group.get("created_at")),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "payroll_group",
            "legacyId": legacy_id,
            "newId": new_id,
        })
        group_legacy[legacy_id] = new_id

    txn_to_group: dict[int, int] = {}
    for link in table_rows(tables, "essentials_payroll_group_transactions"):
        group_id = parse_int(link.get("payroll_group_id"))
        txn_id = parse_int(link.get("transaction_id"))
        if group_id > 0 and txn_id > 0:
            txn_to_group[txn_id] = group_id

    payroll_txns = [
        row for row in table_rows(tables, "transactions")
        if str(row.get("type") or "") == "payroll"
    ]
    if not payroll_txns and table_rows(tables, "essentials_payroll_group_transactions"):
        junction_count = len(table_rows(tables, "essentials_payroll_group_transactions"))
        result.warnings.append(
            f"HRM: {junction_count} payroll group links found but no transactions with type=payroll "
            "(employee payroll rows missing from legacy export)"
        )

    for txn in payroll_txns:
        legacy_id = parse_int(txn.get("id"))
        if legacy_id <= 0 or legacy_id in existing_payroll_legacy:
            continue
        if not row_date_in_range(txn, "transaction_date", since=since, until=until):
            continue

        employee_id = parse_int(txn.get("expense_for"), 0)
        employee_name = _user_display_name(users.get(employee_id), employee_id)
        if employee_id > 0 and employee_id in user_names:
            employee_name = user_names[employee_id]

        duration = parse_decimal(txn.get("essentials_duration"), Decimal("1"))
        rate = parse_decimal(txn.get("essentials_amount_per_unit_duration"))
        gross_pay = rate * duration if rate > 0 else parse_decimal(txn.get("total_before_tax"))
        total_allowance = _sum_json_amounts(txn.get("essentials_allowances"), "allowance_amounts")
        total_deduction = _sum_json_amounts(txn.get("essentials_deductions"), "deduction_amounts")
        net_pay = parse_decimal(txn.get("final_total"))
        if net_pay <= 0:
            net_pay = gross_pay + total_allowance - total_deduction

        group_legacy_id = txn_to_group.get(legacy_id)
        payroll_group_id = group_legacy.get(group_legacy_id) if group_legacy_id else None

        location_id = parse_int(txn.get("location_id"), 0)
        if location_id <= 0 and group_legacy_id:
            group_row = next(
                (
                    g for g in table_rows(tables, "essentials_payroll_groups")
                    if parse_int(g.get("id")) == group_legacy_id
                ),
                None,
            )
            if group_row:
                location_id = parse_int(group_row.get("location_id"), 0)

        note_parts = [
            str(txn.get("additional_notes") or "").strip(),
            str(txn.get("staff_note") or "").strip(),
            str(txn.get("ref_no") or "").strip(),
        ]
        note = " — ".join(p for p in note_parts if p) or None

        new_id = new_cuid()
        tx_date = parse_tx_date(txn.get("transaction_date"))
        result.payrolls.append({
            "id": new_id,
            "tenantId": tenant_id,
            "payrollGroupId": payroll_group_id,
            "employeeName": employee_name,
            "employeeId": str(employee_id) if employee_id > 0 else None,
            "locationCode": _location_code(location_id, locations),
            "grossPay": gross_pay,
            "totalAllowance": total_allowance,
            "totalDeduction": total_deduction,
            "netPay": net_pay,
            "status": _map_payroll_status(txn.get("status")),
            "paymentStatus": _map_payment_status(txn.get("payment_status")),
            "payrollMonth": tx_date,
            "note": note,
            "createdAt": parse_tx_date(txn.get("created_at") or txn.get("transaction_date")),
            "updatedAt": parse_tx_date(txn.get("updated_at") or txn.get("transaction_date")),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "payroll",
            "legacyId": legacy_id,
            "newId": new_id,
        })

    for component in table_rows(tables, "essentials_allowances_and_deductions"):
        legacy_id = parse_int(component.get("id"))
        if legacy_id <= 0 or legacy_id in existing_component_legacy:
            continue
        comp_type = str(component.get("type") or "allowance").lower()
        if comp_type not in ("allowance", "deduction"):
            comp_type = "allowance"
        new_id = new_cuid()
        result.pay_components.append({
            "id": new_id,
            "tenantId": tenant_id,
            "name": str(component.get("description") or f"Component {legacy_id}"),
            "type": comp_type,
            "amount": parse_decimal(component.get("amount")),
            "createdAt": parse_tx_date(component.get("created_at")),
            "updatedAt": parse_tx_date(component.get("updated_at") or component.get("created_at")),
        })
        result.legacy_ids.append({
            "tenantId": tenant_id,
            "entityType": "pay_component",
            "legacyId": legacy_id,
            "newId": new_id,
        })

    return result
