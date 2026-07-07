#!/usr/bin/env python3
"""API smoke test for Vonos Automotive (tenant_va_001) finance endpoints."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = os.environ.get("VONOS_API_URL", "http://localhost:3001")
EMAIL = os.environ.get("VA_SMOKE_EMAIL", "admin@va.vonos")
PASSWORD = os.environ.get("VA_SMOKE_PASSWORD", "password")
TENANT_ID = "tenant_va_001"

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


def request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
) -> tuple[int, object]:
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode()
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = raw
        return exc.code, payload


def main() -> int:
    print(f"VA finance smoke test → {API}\n")

    status, login = request("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    if status not in (200, 201):
        record("Login", False, f"HTTP {status}: {login}")
        return 1

    token = login.get("accessToken") or login.get("token")
    if not token:
        record("Login", False, "no access token in response")
        return 1
    record("Login", True, f"role={login.get('role')}, tenant={login.get('tenantId')}")

    status, ledger = request("GET", "/ledger?limit=20", token=token)
    ledger_rows = ledger if isinstance(ledger, list) else ledger.get("items", [])
    record("Ledger list", status == 200 and len(ledger_rows) > 0, f"{len(ledger_rows)} rows")

    status, summary = request("GET", "/ledger/summary", token=token)
    has_summary = (
        status == 200
        and isinstance(summary, dict)
        and "revenue" in summary
        and "net" in summary
    )
    record("Ledger summary", has_summary, str(summary)[:120] if isinstance(summary, dict) else str(summary))

    status, expenses = request("GET", "/expenses?limit=10", token=token)
    expense_rows = expenses if isinstance(expenses, list) else expenses.get("items", [])
    record("Expenses list", status == 200 and len(expense_rows) > 0, f"{len(expense_rows)} rows")

    status, accounts = request("GET", "/payment-accounts?limit=10", token=token)
    account_rows = accounts if isinstance(accounts, list) else accounts.get("items", [])
    record("Payment accounts", status == 200 and len(account_rows) > 0, f"{len(account_rows)} rows")

    status, payroll = request("GET", "/hrm/payroll?limit=5", token=token)
    payroll_rows = payroll if isinstance(payroll, list) else payroll.get("items", [])
    record("HRM payroll", status == 200 and len(payroll_rows) > 0, f"{len(payroll_rows)} rows")

    status, jobs = request("GET", "/jobs?limit=5", token=token)
    job_rows = jobs if isinstance(jobs, list) else jobs.get("items", [])
    record("Jobs list", status == 200 and len(job_rows) > 0, f"{len(job_rows)} rows")

    status, customers = request("GET", "/customers?limit=5", token=token)
    customer_rows = customers if isinstance(customers, list) else customers.get("items", [])
    record("Customers list", status == 200 and len(customer_rows) > 0, f"{len(customer_rows)} rows")

    if job_rows:
        job_id = job_rows[0].get("id")
        if job_id:
            status, job_detail = request("GET", f"/jobs/{job_id}", token=token)
            record("Job detail", status == 200 and isinstance(job_detail, dict), job_detail.get("reference", ""))

    if customer_rows:
        customer_id = customer_rows[0].get("id")
        if customer_id:
            status, profile = request("GET", f"/customers/{customer_id}", token=token)
            history_len = len(profile.get("transactionHistory", [])) if isinstance(profile, dict) else 0
            record("Customer profile", status == 200 and history_len >= 0, f"{history_len} history rows")

    status, invoice_settings = request("GET", "/invoice-settings", token=token)
    layout_count = len(invoice_settings.get("layouts", [])) if isinstance(invoice_settings, dict) else 0
    record("Invoice settings", status == 200 and layout_count > 0, f"{layout_count} layouts")

    status, report = request(
        "GET",
        "/reports/run?reportId=profit-loss&from=2020-01-01&to=2030-12-31",
        token=token,
    )
    has_pl = status == 200 and isinstance(report, dict) and "profitLoss" in report
    record("Profit & loss report", has_pl, "profitLoss block present" if has_pl else str(report)[:120])

    failed = [name for name, ok, _ in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
