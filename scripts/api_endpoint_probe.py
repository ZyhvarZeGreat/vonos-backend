#!/usr/bin/env python3
"""
Full NestJS API endpoint probe for Vonos.

Phases:
  1. Static inventory of controller routes
  2. Authenticated GET matrix (static paths) — hunt 404/5xx
  3. Detail GETs from list samples
  4. CRUD: sales, purchases, expenses, customers (tagged PROBE-AUDIT-*)
  5. Soft-delete cleanup + JSON/markdown report

Env:
  VONOS_API_URL     default https://api-copy-production-c1e5.up.railway.app
  VA_SMOKE_EMAIL    default admin@va.vonos
  VA_SMOKE_PASSWORD default password
  PROBE_SKIP_WRITES set to 1 to skip Phase 4/5 writes
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
API_SRC = ROOT / "apps" / "api" / "src"
TMP = ROOT / "tmp"

DEFAULT_API = "https://api-copy-production-c1e5.up.railway.app"
API = os.environ.get("VONOS_API_URL", DEFAULT_API).rstrip("/")
EMAIL = os.environ.get("VA_SMOKE_EMAIL", "admin@va.vonos")
PASSWORD = os.environ.get("VA_SMOKE_PASSWORD", "password")
# Used when login returns super_admin with tenantId null (VAG).
DEFAULT_VIEWING_TENANT = os.environ.get("VONOS_VIEWING_TENANT", "tenant_va_001")
SKIP_WRITES = os.environ.get("PROBE_SKIP_WRITES", "").strip() in ("1", "true", "yes")
TIMEOUT = float(os.environ.get("PROBE_TIMEOUT", "45"))

TAG = f"PROBE-AUDIT-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
VIEWING_TENANT: str | None = None

# Static GETs that need query params (otherwise 400).
GET_QUERY_OVERRIDES: dict[str, str] = {
    "/reports/run": "reportId=profit-loss&from=2020-01-01&to=2030-12-31",
    "/reports/group/run": "reportId=profit-loss&from=2020-01-01&to=2030-12-31",
    "/media/legacy": "url=https://hq6.vonosautomarket.com/uploads/img/probe.png",
    "/items/source-availability": "sku=PROBE",
    "/tenants/:id/config": "",  # param route — handled in detail phase only
}

# VA business location (catalogPresets BUSINESS_LOCATION_PRESETS.VA).
VA_LOCATION = "VA"

# Destructive / side-effect GETs we skip in Phase 2.
SKIP_STATIC_GETS: set[str] = {
    "/overview/cache/flush",  # POST only, but keep list clean
    # Proxy needs a real legacy image URL; probing with a fake path yields 502.
    "/media/legacy",
}

# VAG-only routes — expected 403 for tenant-scoped users (not counted as probe bugs).
VAG_ONLY_PREFIXES: tuple[str, ...] = (
    "/ledger/group",
    "/overview/group",
    "/overview/cache/",
    "/reports/group",
)

# List endpoints used to seed Phase 3 detail IDs.
LIST_SEED: list[tuple[str, str]] = [
    ("sales", "/sales?limit=5&includeSummary=0"),
    ("stock-movements", "/stock-movements?limit=5&type=inbound"),
    ("expenses", "/expenses?limit=5&includeSummary=0"),
    ("customers", "/customers?limit=5&includeSummary=0&lite=1"),
    ("suppliers", "/suppliers?limit=5"),
    ("items", "/items?limit=5"),
    ("jobs", "/jobs?limit=5"),
    ("vehicles", "/vehicles?limit=5"),
    ("payment-accounts", "/payment-accounts?limit=10&openOnly=1&lite=1"),
    ("invoices", "/invoices?limit=5"),
    ("users", "/users?limit=5"),
    ("tenant-roles", "/tenant-roles"),
    ("discounts", "/discounts?limit=5"),
    ("variations", "/variations?limit=5"),
    ("requisitions", "/requisitions?limit=5"),
    ("notifications", "/notifications"),
    ("cafe-tables", "/cafe-tables?limit=5"),
    ("appointments", "/appointments?limit=5"),
    ("salon-services", "/salon-services?limit=5"),
    ("expense-categories", "/expenses/categories?limit=5"),
    ("catalog-categories", "/catalog-meta/categories?limit=5"),
    ("catalog", "/catalog?limit=5"),
    ("hrm-employees", "/hrm/employees?limit=5"),
    ("hrm-payroll", "/hrm/payroll?limit=5"),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def inventory_routes() -> list[dict[str, str]]:
    """Parse Nest controller files into method+path rows."""
    routes: list[dict[str, str]] = []
    for path in sorted(API_SRC.rglob("*.controller.ts")):
        text = path.read_text(encoding="utf-8")
        parts = re.split(r"(?=@Controller\()", text)
        for part in parts:
            m = re.match(
                r"@Controller\((?:'([^']*)'|\"([^\"]*)\"|)\)",
                part,
            )
            if not m:
                continue
            prefix = (m.group(1) or m.group(2) or "").strip("/")
            for dm in re.finditer(
                r"@(Get|Post|Patch|Put|Delete)\((?:'([^']*)'|\"([^\"]*)\"|)\)",
                part,
            ):
                method = dm.group(1).upper()
                sub = (dm.group(2) or dm.group(3) or "").strip("/")
                segs = [p for p in [prefix, sub] if p]
                full = "/" + "/".join(segs) if segs else "/"
                full = re.sub(r"/+", "/", full)
                routes.append(
                    {
                        "method": method,
                        "path": full,
                        "file": str(path.relative_to(API_SRC)),
                        "has_params": "yes" if ":" in full else "no",
                    }
                )
    # de-dupe
    seen: set[tuple[str, str]] = set()
    unique: list[dict[str, str]] = []
    for row in routes:
        key = (row["method"], row["path"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique


def request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
    timeout: float = TIMEOUT,
) -> tuple[int, Any, float]:
    url = f"{API}{path}" if path.startswith("/") else f"{API}/{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if VIEWING_TENANT:
        headers["X-Viewing-Tenant"] = VIEWING_TENANT
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode()
            ms = (time.perf_counter() - t0) * 1000
            payload: Any = {}
            if raw:
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    payload = raw[:500]
            return resp.status, payload, ms
    except urllib.error.HTTPError as exc:
        ms = (time.perf_counter() - t0) * 1000
        raw = exc.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = raw[:500]
        return exc.code, payload, ms
    except Exception as exc:  # noqa: BLE001
        ms = (time.perf_counter() - t0) * 1000
        return 0, {"error": str(exc)}, ms


def classify(status: int) -> str:
    if status in (200, 201, 204):
        return "ok"
    if status == 404:
        return "404"
    if status in (401, 403):
        return "auth"
    if status in (400, 422):
        return "bad_request"
    if status >= 500:
        return "5xx"
    if status == 0:
        return "network"
    return f"http_{status}"


def rows_from_payload(payload: Any) -> list[dict]:
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("items", "data", "rows", "results", "page"):
        val = payload.get(key)
        if isinstance(val, list):
            return [r for r in val if isinstance(r, dict)]
        if isinstance(val, dict) and isinstance(val.get("items"), list):
            return [r for r in val["items"] if isinstance(r, dict)]
    # payroll / workforce wrappers
    for key in ("employees", "payrolls", "groups", "components"):
        val = payload.get(key)
        if isinstance(val, list):
            return [r for r in val if isinstance(r, dict)]
    return []


def first_id(rows: list[dict]) -> str | None:
    for row in rows:
        rid = row.get("id")
        if isinstance(rid, str) and rid:
            return rid
    return None


def snippet(payload: Any, n: int = 160) -> str:
    text = payload if isinstance(payload, str) else json.dumps(payload, default=str)
    text = text.replace("\n", " ")
    return text[:n]


def main() -> int:
    TMP.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report_path = TMP / f"api_endpoint_probe_{ts}.json"
    md_path = TMP / f"api_endpoint_probe_{ts}.md"

    print(f"API endpoint probe → {API}")
    print(f"Tag: {TAG}")
    print(f"Skip writes: {SKIP_WRITES}\n")

    # --- Phase 1: inventory ---
    routes = inventory_routes()
    static_gets = [
        r
        for r in routes
        if r["method"] == "GET" and r["has_params"] == "no" and r["path"] not in SKIP_STATIC_GETS
    ]
    print(f"[Phase 1] Inventoried {len(routes)} routes ({len(static_gets)} static GETs)\n")

    report: dict[str, Any] = {
        "at": now_iso(),
        "api": API,
        "tag": TAG,
        "inventoryCount": len(routes),
        "staticGetCount": len(static_gets),
        "routes": routes,
        "login": None,
        "phase2": [],
        "phase3": [],
        "phase4": [],
        "cleanup": [],
        "summary": {},
    }

    # --- Login ---
    status, login, ms = request("POST", "/auth/login", body={"email": EMAIL, "password": PASSWORD})
    report["login"] = {"status": status, "ms": round(ms, 1), "body": snippet(login)}
    if status not in (200, 201) or not isinstance(login, dict):
        print(f"[FAIL] Login HTTP {status}: {snippet(login)}")
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 1
    token = login.get("accessToken") or login.get("token")
    if not token:
        print("[FAIL] Login: no access token")
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        return 1
    global VIEWING_TENANT
    # Prefer JWT claims — login JSON may omit tenantId/role at the top level.
    claims: dict[str, Any] = {}
    try:
        payload_b64 = token.split(".")[1]
        pad = "=" * (-len(payload_b64) % 4)
        claims = json.loads(
            __import__("base64").urlsafe_b64decode(payload_b64 + pad).decode()
        )
    except Exception:  # noqa: BLE001
        claims = {}
    tenant_id = login.get("tenantId") or claims.get("tenantId")
    role = login.get("role") or claims.get("role")
    if not tenant_id and role == "super_admin":
        VIEWING_TENANT = DEFAULT_VIEWING_TENANT
        tenant_id = VIEWING_TENANT
        print(
            f"[PASS] Login role={role} tenant=null → viewing {VIEWING_TENANT} ({ms:.0f}ms)\n"
        )
    else:
        VIEWING_TENANT = tenant_id if role == "super_admin" else None
        # Tenant-scoped admins already have tenant in JWT; header optional.
        if role == "super_admin" and tenant_id:
            VIEWING_TENANT = tenant_id
        print(
            f"[PASS] Login role={role} tenant={tenant_id} ({ms:.0f}ms)\n"
        )

    # Health without auth
    st, body, ms = request("GET", "/health")
    print(f"[{'PASS' if st == 200 else 'FAIL'}] GET /health → {st} ({ms:.0f}ms)")

    # --- Phase 2: static GET matrix ---
    print("\n[Phase 2] Static GET matrix…")
    phase2_counts: dict[str, int] = {}
    for row in static_gets:
        path = row["path"]
        qs = GET_QUERY_OVERRIDES.get(path)
        if qs == "" and ":" in path:
            continue
        probe_path = path
        if qs:
            probe_path = f"{path}?{qs}"
        elif path not in ("/", "/health") and "?" not in path:
            # Prefer small pages for list-ish endpoints
            sep = "&" if "?" in path else "?"
            probe_path = f"{path}{sep}limit=5"

        # Auth: health + root can work without token; still send token for rest
        use_token = None if path in ("/health",) else token
        st, payload, ms = request("GET", probe_path, token=use_token)
        kind = classify(st)
        if kind == "auth" and any(
            path.startswith(p) or probe_path.startswith(p) for p in VAG_ONLY_PREFIXES
        ):
            kind = "vag_only"
        phase2_counts[kind] = phase2_counts.get(kind, 0) + 1
        entry = {
            "method": "GET",
            "path": probe_path,
            "status": st,
            "class": kind,
            "ms": round(ms, 1),
            "detail": snippet(payload) if kind not in ("ok", "vag_only") else "",
        }
        report["phase2"].append(entry)
        if kind == "ok":
            print(f"  [PASS] GET {probe_path} → {st} ({ms:.0f}ms)")
        elif kind == "vag_only":
            print(f"  [SKIP] GET {probe_path} → {st} vag_only")
        else:
            print(f"  [FAIL] GET {probe_path} → {st} {kind} — {snippet(payload, 100)}")

    print(f"\n  Phase2 classes: {phase2_counts}")

    # --- Phase 3: detail GETs ---
    print("\n[Phase 3] Detail GETs from list seeds…")
    ids: dict[str, str] = {}
    for name, list_path in LIST_SEED:
        st, payload, ms = request("GET", list_path, token=token)
        rows = rows_from_payload(payload)
        rid = first_id(rows)
        entry = {
            "list": list_path,
            "name": name,
            "status": st,
            "class": classify(st),
            "rows": len(rows),
            "id": rid,
            "ms": round(ms, 1),
        }
        report["phase3"].append({"type": "list", **entry})
        if rid:
            ids[name] = rid
            print(f"  [PASS] seed {name}: {rid[:12]}… ({len(rows)} rows)")
        else:
            print(f"  [SKIP] seed {name}: no id (HTTP {st}, rows={len(rows)})")

    detail_paths: list[tuple[str, str]] = []
    if "sales" in ids:
        sid = ids["sales"]
        detail_paths += [
            (f"/sales/{sid}", "sale"),
            (f"/sales/{sid}/meta", "sale-meta"),
            (f"/sales/{sid}/view", "sale-view"),
            (f"/sales/{sid}/payments", "sale-payments"),
            (f"/sales/{sid}/invoice-url", "sale-invoice-url"),
        ]
    if "stock-movements" in ids:
        mid = ids["stock-movements"]
        detail_paths += [
            (f"/stock-movements/{mid}", "movement"),
            (f"/stock-movements/{mid}/view", "movement-view"),
            (f"/stock-movements/{mid}/payments", "movement-payments"),
        ]
    if "expenses" in ids:
        eid = ids["expenses"]
        detail_paths.append((f"/expenses/{eid}", "expense"))
    if "customers" in ids:
        cid = ids["customers"]
        detail_paths += [
            (f"/customers/{cid}", "customer"),
            (f"/customers/{cid}/contact", "customer-contact"),
            (f"/customers/{cid}/summary", "customer-summary"),
            (f"/customers/{cid}/view", "customer-view"),
            (f"/customers/{cid}/ledger?limit=5", "customer-ledger"),
        ]
    if "suppliers" in ids:
        sid = ids["suppliers"]
        detail_paths += [
            (f"/suppliers/{sid}", "supplier"),
            (f"/suppliers/{sid}/summary", "supplier-summary"),
            (f"/suppliers/{sid}/meta", "supplier-meta"),
        ]
    if "items" in ids:
        iid = ids["items"]
        detail_paths += [
            (f"/items/{iid}", "item"),
            (f"/items/{iid}/meta", "item-meta"),
            (f"/items/{iid}/stock-history", "item-stock-history"),
        ]
    if "jobs" in ids:
        jid = ids["jobs"]
        detail_paths += [
            (f"/jobs/{jid}", "job"),
            (f"/jobs/{jid}/meta", "job-meta"),
            (f"/jobs/{jid}/shell", "job-shell"),
            (f"/jobs/{jid}/costs", "job-costs"),
        ]
    if "vehicles" in ids:
        vid = ids["vehicles"]
        detail_paths += [
            (f"/vehicles/{vid}", "vehicle"),
            (f"/vehicles/{vid}/history", "vehicle-history"),
        ]
    if "payment-accounts" in ids:
        aid = ids["payment-accounts"]
        detail_paths.append((f"/payment-accounts/{aid}", "payment-account"))
        detail_paths.append((f"/payments/account-book/{aid}?limit=5", "account-book"))
    if "invoices" in ids:
        detail_paths.append((f"/invoices/{ids['invoices']}", "invoice"))
    if "users" in ids:
        detail_paths.append((f"/users/{ids['users']}", "user"))
    if "tenant-roles" in ids:
        detail_paths.append((f"/tenant-roles/{ids['tenant-roles']}", "tenant-role"))
    if tenant_id:
        detail_paths.append((f"/tenants/{tenant_id}/config", "tenant-config"))

    for path, label in detail_paths:
        st, payload, ms = request("GET", path, token=token)
        kind = classify(st)
        report["phase3"].append(
            {
                "type": "detail",
                "label": label,
                "path": path,
                "status": st,
                "class": kind,
                "ms": round(ms, 1),
                "detail": snippet(payload) if kind != "ok" else "",
            }
        )
        mark = "PASS" if kind == "ok" else "FAIL"
        extra = f" — {snippet(payload, 80)}" if kind != "ok" else f" ({ms:.0f}ms)"
        print(f"  [{mark}] GET {path} → {st}{extra}")

    # --- Phase 4: writes ---
    created: dict[str, str] = {}
    if SKIP_WRITES:
        print("\n[Phase 4] Skipped (PROBE_SKIP_WRITES=1)")
    else:
        print(f"\n[Phase 4] CRUD ops tagged {TAG}…")

        # Customer create/patch/delete
        st, cust, ms = request(
            "POST",
            "/customers",
            token=token,
            body={"name": f"{TAG} Customer", "phone": "08000000000"},
        )
        ok = classify(st) == "ok" and isinstance(cust, dict) and cust.get("id")
        report["phase4"].append(
            {"op": "customer.create", "status": st, "class": classify(st), "ms": round(ms, 1), "detail": snippet(cust)}
        )
        print(f"  [{'PASS' if ok else 'FAIL'}] POST /customers → {st}")
        if ok:
            created["customer"] = cust["id"]
            st, patched, ms = request(
                "PATCH",
                f"/customers/{cust['id']}",
                token=token,
                body={"name": f"{TAG} Customer Updated"},
            )
            report["phase4"].append(
                {
                    "op": "customer.patch",
                    "status": st,
                    "class": classify(st),
                    "ms": round(ms, 1),
                    "detail": snippet(patched),
                }
            )
            print(f"  [{'PASS' if classify(st)=='ok' else 'FAIL'}] PATCH /customers/:id → {st}")

        # Pick helpers for sale/purchase
        item_id = ids.get("items")
        item_sku = "PROBE-SKU"
        item_name = "Probe Item"
        if item_id:
            st, item, _ = request("GET", f"/items/{item_id}", token=token)
            if isinstance(item, dict):
                item_sku = item.get("sku") or item_sku
                item_name = item.get("name") or item_name

        account_id = ids.get("payment-accounts")
        supplier_id = ids.get("suppliers")
        customer_id = created.get("customer") or ids.get("customers")
        staff_id = ids.get("hrm-employees")

        # Sale as quotation (VA stock consumer — no stock debit)
        sale_body: dict[str, Any] = {
            "reference": f"{TAG}-SALE",
            "customerId": customer_id,
            "customerName": f"{TAG} Customer",
            "locationCode": VA_LOCATION,
            "status": "quotation",
            "notes": TAG,
            "lines": [
                {
                    "itemId": item_id,
                    "sku": item_sku,
                    "name": item_name,
                    "quantity": 1,
                    "unitPrice": 100,
                }
            ],
        }
        if staff_id:
            sale_body["serviceStaffEmployeeId"] = staff_id
            sale_body["cleanerName"] = "Probe Staff"
        # drop null itemId
        if not item_id:
            sale_body["lines"][0].pop("itemId", None)

        st, sale, ms = request("POST", "/sales", token=token, body=sale_body)
        ok = classify(st) == "ok" and isinstance(sale, dict) and sale.get("id")
        report["phase4"].append(
            {"op": "sale.create", "status": st, "class": classify(st), "ms": round(ms, 1), "detail": snippet(sale)}
        )
        print(f"  [{'PASS' if ok else 'FAIL'}] POST /sales → {st} — {snippet(sale, 100)}")
        if ok:
            created["sale"] = sale["id"]
            sale_body["notes"] = f"{TAG} updated"
            sale_body["lines"][0]["unitPrice"] = 150
            st, sale2, ms = request(
                "PATCH", f"/sales/{sale['id']}", token=token, body=sale_body
            )
            report["phase4"].append(
                {
                    "op": "sale.patch",
                    "status": st,
                    "class": classify(st),
                    "ms": round(ms, 1),
                    "detail": snippet(sale2),
                }
            )
            print(f"  [{'PASS' if classify(st)=='ok' else 'FAIL'}] PATCH /sales/:id → {st}")

        # Purchase (inbound) — needs real itemId
        if item_id and supplier_id:
            purchase_body = {
                "type": "inbound",
                "reference": f"{TAG}-PO",
                "status": "Ordered",
                "supplierId": supplier_id,
                "locationCode": VA_LOCATION,
                "notes": TAG,
                "lines": [
                    {
                        "itemId": item_id,
                        "sku": item_sku,
                        "name": item_name,
                        "quantity": 1,
                        "unitCost": 50,
                    }
                ],
            }
            st, purchase, ms = request(
                "POST", "/stock-movements", token=token, body=purchase_body
            )
            ok = classify(st) == "ok" and isinstance(purchase, dict) and purchase.get("id")
            report["phase4"].append(
                {
                    "op": "purchase.create",
                    "status": st,
                    "class": classify(st),
                    "ms": round(ms, 1),
                    "detail": snippet(purchase),
                }
            )
            print(
                f"  [{'PASS' if ok else 'FAIL'}] POST /stock-movements → {st} — {snippet(purchase, 100)}"
            )
            if ok:
                created["purchase"] = purchase["id"]
                purchase_body["notes"] = f"{TAG} updated"
                st, purchase2, ms = request(
                    "PATCH",
                    f"/stock-movements/{purchase['id']}",
                    token=token,
                    body=purchase_body,
                )
                report["phase4"].append(
                    {
                        "op": "purchase.patch",
                        "status": st,
                        "class": classify(st),
                        "ms": round(ms, 1),
                        "detail": snippet(purchase2),
                    }
                )
                print(
                    f"  [{'PASS' if classify(st)=='ok' else 'FAIL'}] PATCH /stock-movements/:id → {st}"
                )
                # Optional pay if we have account
                if account_id:
                    st, pay, ms = request(
                        "POST",
                        f"/stock-movements/{purchase['id']}/pay",
                        token=token,
                        body={
                            "amount": 50,
                            "method": "cash",
                            "accountId": account_id,
                            "note": TAG,
                        },
                    )
                    report["phase4"].append(
                        {
                            "op": "purchase.pay",
                            "status": st,
                            "class": classify(st),
                            "ms": round(ms, 1),
                            "detail": snippet(pay),
                        }
                    )
                    print(
                        f"  [{'PASS' if classify(st)=='ok' else 'FAIL'}] POST /stock-movements/:id/pay → {st}"
                    )
        else:
            print("  [SKIP] purchase CRUD — need item + supplier seeds")

        # Expense
        expense_body: dict[str, Any] = {
            "totalAmount": 25.5,
            "note": TAG,
            "refNo": f"{TAG}-EXP",
            "paymentStatus": "due",
        }
        if account_id:
            expense_body["accountId"] = account_id
            expense_body["paymentMethod"] = "cash"
            expense_body["paymentStatus"] = "paid"
        st, expense, ms = request(
            "POST", "/expenses", token=token, body=expense_body
        )
        ok = classify(st) == "ok" and isinstance(expense, dict) and expense.get("id")
        report["phase4"].append(
            {
                "op": "expense.create",
                "status": st,
                "class": classify(st),
                "ms": round(ms, 1),
                "detail": snippet(expense),
            }
        )
        print(f"  [{'PASS' if ok else 'FAIL'}] POST /expenses → {st} — {snippet(expense, 100)}")
        if ok:
            created["expense"] = expense["id"]
            st, expense2, ms = request(
                "PATCH",
                f"/expenses/{expense['id']}",
                token=token,
                body={"note": f"{TAG} updated", "totalAmount": 30},
            )
            report["phase4"].append(
                {
                    "op": "expense.patch",
                    "status": st,
                    "class": classify(st),
                    "ms": round(ms, 1),
                    "detail": snippet(expense2),
                }
            )
            print(f"  [{'PASS' if classify(st)=='ok' else 'FAIL'}] PATCH /expenses/:id → {st}")

    # --- Phase 5: cleanup ---
    print("\n[Phase 5] Cleanup (soft-delete)…")
    for key, path_tpl in (
        ("sale", "/sales/{id}"),
        ("purchase", "/stock-movements/{id}"),
        ("expense", "/expenses/{id}"),
        ("customer", "/customers/{id}"),
    ):
        rid = created.get(key)
        if not rid:
            continue
        path = path_tpl.format(id=rid)
        st, body, ms = request("DELETE", path, token=token)
        report["cleanup"].append(
            {
                "op": f"{key}.delete",
                "path": path,
                "status": st,
                "class": classify(st),
                "ms": round(ms, 1),
                "detail": snippet(body),
            }
        )
        print(f"  [{'PASS' if classify(st)=='ok' else 'FAIL'}] DELETE {path} → {st}")

    # --- Summary ---
    def collect(cls: str) -> list[dict]:
        out = []
        for e in report["phase2"]:
            if e["class"] == cls:
                out.append(e)
        for e in report["phase3"]:
            if e.get("class") == cls:
                out.append(e)
        for e in report["phase4"]:
            if e["class"] == cls:
                out.append(e)
        for e in report["cleanup"]:
            if e["class"] == cls:
                out.append(e)
        return out

    not_found = collect("404")
    server_err = collect("5xx")
    auth_err = collect("auth")
    bad_req = [e for e in report["phase2"] if e["class"] == "bad_request"]
    vag_only = [e for e in report["phase2"] if e["class"] == "vag_only"]
    write_fail = [e for e in report["phase4"] if e["class"] != "ok"]
    write_ok = [e for e in report["phase4"] if e["class"] == "ok"]
    cleanup_fail = [e for e in report["cleanup"] if e["class"] != "ok"]

    report["summary"] = {
        "phase2": phase2_counts,
        "404_count": len(not_found),
        "5xx_count": len(server_err),
        "auth_count": len(auth_err),
        "bad_request_count": len(bad_req),
        "write_ok": len(write_ok),
        "write_fail": len(write_fail),
        "cleanup_ok": sum(1 for e in report["cleanup"] if e["class"] == "ok"),
        "cleanup_fail": len(cleanup_fail),
        "created": created,
        "404s": [
            {"method": e.get("method", "GET"), "path": e.get("path"), "status": e.get("status")}
            for e in not_found
        ],
        "5xx": [
            {
                "path": e.get("path") or e.get("op"),
                "status": e.get("status"),
                "detail": e.get("detail"),
            }
            for e in server_err
        ],
        "bad_requests": [
            {"path": e.get("path"), "status": e.get("status"), "detail": e.get("detail")}
            for e in bad_req
        ],
    }

    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    md_lines = [
        f"# API endpoint probe — {ts}",
        "",
        f"- **API:** `{API}`",
        f"- **Tag:** `{TAG}`",
        f"- **Inventory:** {len(routes)} routes, {len(static_gets)} static GETs probed",
        f"- **Login:** HTTP {report['login']['status']} ({report['login']['ms']} ms)",
        "",
        "## Summary",
        "",
        f"- Phase 2 classes: `{phase2_counts}`",
        f"- **404s:** {len(not_found)}",
        f"- **5xx:** {len(server_err)}",
        f"- **Auth failures:** {len(auth_err)}",
        f"- **Bad request (400/422):** {len(bad_req)}",
        f"- **Writes OK / fail:** {len(write_ok)} / {len(write_fail)}",
        f"- **Cleanup OK / fail:** {sum(1 for e in report['cleanup'] if e['class']=='ok')} / {len(cleanup_fail)}",
        "",
    ]
    if not_found:
        md_lines += ["## 404 list", ""]
        for e in not_found:
            md_lines.append(f"- `{e.get('method', 'GET')} {e.get('path')}`")
        md_lines.append("")
    if server_err:
        md_lines += ["## 5xx list", ""]
        for e in server_err:
            md_lines.append(
                f"- `{e.get('path') or e.get('op')}` → {e.get('status')} — {e.get('detail', '')[:120]}"
            )
        md_lines.append("")
    if bad_req:
        md_lines += ["## Bad request (400/422)", ""]
        for e in bad_req:
            md_lines.append(
                f"- `{e.get('path')}` → {e.get('status')} — {str(e.get('detail', ''))[:160]}"
            )
        md_lines.append("")
    if vag_only:
        md_lines += ["## VAG-only (expected 403 for tenant roles)", ""]
        for e in vag_only:
            md_lines.append(f"- `{e.get('path')}` → {e.get('status')}")
        md_lines.append("")
    if write_ok:
        md_lines += ["## Write ops (OK)", ""]
        for e in write_ok:
            md_lines.append(f"- `{e.get('op')}` → {e.get('status')}")
        md_lines.append("")
    if write_fail:
        md_lines += ["## Write failures", ""]
        for e in write_fail:
            md_lines.append(
                f"- `{e.get('op')}` → {e.get('status')} — {e.get('detail', '')[:120]}"
            )
        md_lines.append("")
    md_lines += [
        "## Artifacts",
        "",
        f"- JSON: `{report_path.relative_to(ROOT)}`",
        f"- Markdown: `{md_path.relative_to(ROOT)}`",
        "",
    ]
    md_path.write_text("\n".join(md_lines), encoding="utf-8")

    print("\n======== SUMMARY ========")
    print(f"404s: {len(not_found)}")
    for e in not_found:
        print(f"  - {e.get('method', 'GET')} {e.get('path')}")
    print(f"5xx: {len(server_err)}")
    for e in server_err:
        print(f"  - {e.get('path') or e.get('op')} → {e.get('status')}")
    print(f"Writes: {len(write_ok)} ok, {len(write_fail)} fail")
    print(f"Report: {report_path}")
    print(f"Markdown: {md_path}")

    # Exit non-zero if any 404 or 5xx on probes
    return 1 if (not_found or server_err or write_fail) else 0


if __name__ == "__main__":
    sys.exit(main())
