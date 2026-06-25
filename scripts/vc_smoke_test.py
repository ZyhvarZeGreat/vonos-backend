#!/usr/bin/env python3
"""API smoke test for Vonos Cafe (tenant_vc_001)."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

API = os.environ.get("VONOS_API_URL", "http://localhost:3001")
EMAIL = os.environ.get("VC_SMOKE_EMAIL", "admin@vc.vonos")
PASSWORD = os.environ.get("VC_SMOKE_PASSWORD", "password")

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
    print(f"VC smoke test → {API}\n")

    status, login = request("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    if status != 201 and status != 200:
        record("Login", False, f"HTTP {status}: {login}")
        return 1

    token = login.get("accessToken") or login.get("token")
    if not token:
        record("Login", False, "no access token in response")
        return 1
    record("Login", True, f"role={login.get('role')}, tenant={login.get('tenantId')}")

    status, tenant = request("GET", "/tenants/tenant_vc_001/config", token=token)
    location_code = "BL0001"  # VC preset from catalogPresets
    if status == 200 and isinstance(tenant, dict):
        locations = tenant.get("businessLocations") or []
        if locations:
            location_code = locations[0].get("code") or location_code
    record("Tenant config", status == 200, f"location={location_code}")

    status, items = request("GET", "/items?limit=100", token=token)
    item_count = len(items) if isinstance(items, list) else 0
    record("Menu items", status == 200 and item_count >= 59, f"{item_count} items")

    categorized = 0
    if isinstance(items, list):
        categorized = sum(1 for i in items if i.get("category"))
    record("Menu categories", categorized >= 59, f"{categorized}/{item_count} categorized")

    sample = items[0] if isinstance(items, list) and items else None
    if not sample:
        record("POS create sale", False, "no items to sell")
    else:
        qty_before = sample.get("quantity", 0)
        ref = f"SMOKE-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        sale_body = {
            "reference": ref,
            "customerName": "Smoke Test Customer",
            **({"locationCode": location_code} if location_code else {}),
            "lines": [
                {
                    "itemId": sample["id"],
                    "sku": sample.get("sku", "SMOKE"),
                    "name": sample.get("name", "Smoke item"),
                    "quantity": 1,
                    "unitPrice": float(sample.get("costPrice") or 100),
                }
            ],
            "payments": [{"amount": float(sample.get("costPrice") or 100), "method": "cash"}],
        }
        status, sale = request("POST", "/sales", token=token, body=sale_body)
        sale_ok = status in (200, 201) and isinstance(sale, dict) and sale.get("id")
        record("POS create sale", sale_ok, ref if sale_ok else str(sale))

        if sale_ok:
            status, items_after = request("GET", f"/items?search={sample.get('sku','')}", token=token)
            qty_after = None
            if isinstance(items_after, list):
                for it in items_after:
                    if it.get("id") == sample["id"]:
                        qty_after = it.get("quantity")
                        break
            stock_ok = qty_after is not None and qty_after == qty_before - 1
            record("Stock decrement", stock_ok, f"{qty_before} → {qty_after}")

            status, ledger = request("GET", "/ledger?limit=20", token=token)
            ledger_ok = status == 200
            if ledger_ok and isinstance(ledger, list):
                linked = any(
                    e.get("type") == "revenue"
                    and (
                        e.get("linkedRecordId") == sale["id"]
                        or (e.get("linkedRecord") or {}).get("id") == sale["id"]
                    )
                    for e in ledger
                )
                record("Ledger revenue row", linked, f"sale {sale['id']}")
            else:
                record("Ledger revenue row", False, f"HTTP {status}")

    status, summary = request("GET", "/ledger/summary", token=token)
    record("Finance summary", status == 200 and isinstance(summary, dict), str(summary)[:80] if summary else "")

    status, report = request("GET", "/reports/dashboard?tab=closeout", token=token)
    record("Reports daily closeout", status == 200, f"HTTP {status}")

    failed = sum(1 for _, ok, _ in results if not ok)
    print(f"\n{len(results) - failed}/{len(results)} passed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
