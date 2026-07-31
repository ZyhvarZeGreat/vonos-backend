#!/usr/bin/env python3
"""Smoke: payment account list + fund transfer + finance/HRM read paths (VA).

Deposit/transfer mutate data — run intentionally:
  python3 scripts/payment_accounts_smoke.py
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

API = os.environ.get("VONOS_API_URL", "http://localhost:3001")
EMAIL = os.environ.get("VA_SMOKE_EMAIL", "admin@va.vonos")
PASSWORD = os.environ.get("VA_SMOKE_PASSWORD", "password")
TENANT_Q = "tenantId=tenant_va_001"
MUTATE = os.environ.get("SMOKE_MUTATE", "1") == "1"

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(("PASS" if ok else "FAIL"), name, detail)


def req(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw)
        except Exception:
            payload = raw
        return e.code, payload
    except Exception as e:
        return 0, str(e)


def main() -> int:
    st, login = req("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    tok = login.get("accessToken") if isinstance(login, dict) else None
    record("login", st in (200, 201) and bool(tok), f"http={st}")
    if not tok:
        return 1

    st, accounts = req("GET", f"/payment-accounts?{TENANT_Q}&limit=50", token=tok)
    items = accounts if isinstance(accounts, list) else (
        accounts.get("items") if isinstance(accounts, dict) else []
    )
    if not isinstance(items, list):
        items = []
    record("list accounts", st == 200 and len(items) >= 1, f"http={st} n={len(items)}")

    for name, path in [
        ("expenses", f"/expenses?{TENANT_Q}&limit=5"),
        ("sales", f"/sales?{TENANT_Q}&limit=5"),
        ("stock movements", f"/stock-movements?{TENANT_Q}&limit=5"),
        ("ledger", f"/ledger?{TENANT_Q}&limit=5"),
        ("hrm employees", f"/hrm/employees?{TENANT_Q}&limit=5"),
        ("hrm payroll", f"/hrm/payroll?{TENANT_Q}&limit=5"),
        ("hrm leave", f"/hrm/leaves?{TENANT_Q}&limit=5"),
    ]:
        st, body = req("GET", path, token=tok)
        n = ""
        if isinstance(body, dict) and isinstance(body.get("items"), list):
            n = f" n={len(body['items'])}"
        elif isinstance(body, list):
            n = f" n={len(body)}"
        record(name, st == 200, f"http={st}{n}")

    if MUTATE and items:
        open_accts = [x for x in items if not x.get("isClosed")]
        a = open_accts[0] if open_accts else items[0]
        before = float(a.get("balance") or 0)
        amount = 50.25
        st, after_dep = req(
            "POST",
            f"/payment-accounts/{a['id']}/deposit?{TENANT_Q}",
            token=tok,
            body={
                "amount": amount,
                "note": f"smoke-deposit-{int(time.time())}",
                "paymentMethod": "cash",
            },
        )
        bal = float(after_dep.get("balance") or 0) if isinstance(after_dep, dict) else None
        msg = ""
        if isinstance(after_dep, dict) and after_dep.get("message"):
            msg = str(after_dep["message"])
        record(
            "deposit credit",
            st in (200, 201) and bal is not None and abs(bal - (before + amount)) < 0.02,
            f"http={st} before={before} after={bal} {msg}".strip(),
        )

        if len(open_accts) >= 2:
            src, dst = open_accts[0], open_accts[1]
            st, xfer_res = req(
                "POST",
                f"/payment-accounts/transfer?{TENANT_Q}",
                token=tok,
                body={
                    "fromAccountId": src["id"],
                    "toAccountId": dst["id"],
                    "amount": 25.0,
                    "note": "smoke-transfer",
                },
            )
            ok = st in (200, 201) and isinstance(xfer_res, dict)
            detail = f"http={st}"
            if ok:
                detail += (
                    f" from={xfer_res.get('from', {}).get('balance')}"
                    f" to={xfer_res.get('to', {}).get('balance')}"
                )
            record("fund transfer", ok, detail)

    failed = sum(1 for _, ok, _ in results if not ok)
    print(f"\n{len(results) - failed}/{len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
