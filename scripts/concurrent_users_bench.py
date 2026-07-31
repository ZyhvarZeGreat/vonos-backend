#!/usr/bin/env python3
"""
Concurrent-user bench for Vonos API (reads + light writes).

Simulates peak concurrent staff (default 12–15) hitting sales, ledger,
sale detail (print payload), overview, and optional expense creates.

Usage:
  python3 scripts/concurrent_users_bench.py
  USERS=15 ROUNDS=3 python3 scripts/concurrent_users_bench.py
  WRITE=1 python3 scripts/concurrent_users_bench.py   # include expense writes

Env:
  VONOS_API_URL   default http://localhost:3001
  VA_SMOKE_EMAIL / VA_SMOKE_PASSWORD
  USERS           concurrent workers (default 12)
  ROUNDS          waves per scenario (default 2)
  WRITE           1 = create small expenses under concurrency (default 0)
"""

from __future__ import annotations

import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field

API = os.environ.get("VONOS_API_URL", "http://localhost:3001").rstrip("/")
EMAIL = os.environ.get("VA_SMOKE_EMAIL", "admin@va.vonos")
PASSWORD = os.environ.get("VA_SMOKE_PASSWORD", "password")
USERS = max(1, int(os.environ.get("USERS", "12")))
ROUNDS = max(1, int(os.environ.get("ROUNDS", "2")))
DO_WRITE = os.environ.get("WRITE", "0") in ("1", "true", "yes")
TIMEOUT = float(os.environ.get("TIMEOUT", "90"))


@dataclass
class Hit:
    name: str
    ok: bool
    status: int
    ms: int
    detail: str = ""


@dataclass
class ScenarioResult:
    name: str
    hits: list[Hit] = field(default_factory=list)

    @property
    def ok_count(self) -> int:
        return sum(1 for h in self.hits if h.ok)

    @property
    def fail_count(self) -> int:
        return len(self.hits) - self.ok_count

    def latencies(self) -> list[int]:
        return [h.ms for h in self.hits if h.ok]


def request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    body: dict | None = None,
) -> tuple[int, object, int]:
    url = f"{API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            raw = resp.read().decode()
            payload: object = json.loads(raw) if raw else {}
            return resp.status, payload, int((time.perf_counter() - t0) * 1000)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw)
        except Exception:
            payload = raw[:240]
        return e.code, payload, int((time.perf_counter() - t0) * 1000)
    except Exception as e:
        return 0, str(e), int((time.perf_counter() - t0) * 1000)


def pct(sorted_vals: list[int], p: float) -> int:
    if not sorted_vals:
        return 0
    idx = min(len(sorted_vals) - 1, max(0, int(round((p / 100) * (len(sorted_vals) - 1)))))
    return sorted_vals[idx]


def summarize(sr: ScenarioResult, wall_ms: int, target_ms: int = 5000) -> None:
    lats = sorted(sr.latencies())
    avg = int(statistics.mean(lats)) if lats else 0
    p95 = pct(lats, 95)
    flag = "✓" if p95 <= target_ms and sr.fail_count == 0 else "✗"
    print(
        f"  [{flag}] {sr.name}: {sr.ok_count}/{len(sr.hits)} ok | "
        f"wall={wall_ms}ms avg={avg}ms p50={pct(lats,50)}ms "
        f"p95={p95}ms max={lats[-1] if lats else 0}ms  (target p95≤{target_ms}ms)"
    )
    fails = [h for h in sr.hits if not h.ok]
    for h in fails[:8]:
        print(f"    FAIL {h.name} http={h.status} {h.ms}ms {h.detail[:140]}")
    if len(fails) > 8:
        print(f"    … {len(fails) - 8} more failures")


def run_pool(name: str, jobs: list[tuple[str, callable]], workers: int) -> ScenarioResult:
    sr = ScenarioResult(name=name)
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(fn): label for label, fn in jobs}
        for fut in as_completed(futs):
            label = futs[fut]
            try:
                hit = fut.result()
            except Exception as e:
                hit = Hit(label, False, 0, 0, str(e))
            sr.hits.append(hit)
    wall = int((time.perf_counter() - t0) * 1000)
    summarize(sr, wall)
    return sr


def main() -> int:
    print(f"Concurrent users bench → {API}")
    print(f"users={USERS} rounds={ROUNDS} write={DO_WRITE}\n")

    st, health, ms = request("GET", "/health")
    if st != 200:
        print(f"FAIL health http={st} {ms}ms {health}")
        print("Start the API first: npm run dev --workspace=api")
        return 1
    print(f"health ok ({ms}ms) {health if isinstance(health, dict) else ''}")

    st, login, ms = request(
        "POST",
        "/auth/login",
        body={"email": EMAIL, "password": PASSWORD},
    )
    tok = login.get("accessToken") if isinstance(login, dict) else None
    if not tok or st not in (200, 201):
        print(f"FAIL login http={st} {ms}ms {login}")
        return 1
    print(f"login ok ({ms}ms)")

    # Warm + pick a sale for detail/print path (rows-only, matches HQ6 UI)
    st, sales, ms = request("GET", "/sales?limit=20&includeSummary=0", token=tok)
    items = (sales.get("items") if isinstance(sales, dict) else None) or []
    sale_id = items[0]["id"] if items else None
    print(f"warm sales http={st} {ms}ms n={len(items)} sale_id={sale_id}")

    st, ledger, ms = request("GET", "/ledger?limit=20", token=tok)
    print(f"warm ledger http={st} {ms}ms")

    # READS — same shapes the web app uses for list pages
    read_paths: list[tuple[str, str]] = [
        ("sales_list", "/sales?limit=25&includeSummary=0"),
        ("ledger_list", "/ledger?limit=25"),
        ("overview", "/overview/dashboard"),
        ("payment_accounts", "/payment-accounts"),
        ("expenses", "/expenses?limit=25&includeSummary=0"),
    ]
    if sale_id:
        read_paths.append(("sale_detail", f"/sales/{sale_id}"))
        read_paths.append(("sale_payments", f"/sales/{sale_id}/payments"))

    all_results: list[ScenarioResult] = []

    # --- Scenario A: mixed concurrent reads (peak page browsing) ---
    for round_i in range(1, ROUNDS + 1):
        jobs = []
        for i in range(USERS):
            label, path = read_paths[i % len(read_paths)]

            def make(path=path, label=label, n=i):
                def fn() -> Hit:
                    st, body, ms = request("GET", path, token=tok)
                    detail = ""
                    if st != 200:
                        detail = str(body)[:200]
                    elif isinstance(body, dict) and "message" in body and st >= 400:
                        detail = str(body.get("message"))
                    return Hit(f"{label}#{n}", st == 200, st, ms, detail)

                return fn

            jobs.append((f"{label}#{i}", make()))
        all_results.append(
            run_pool(f"A mixed-reads r{round_i} ({USERS} concurrent)", jobs, USERS)
        )

    # --- Scenario B: stampede on same hot endpoints ---
    stampede = [
        ("sales_list", "/sales?limit=50&includeSummary=0"),
        ("sale_detail", f"/sales/{sale_id}" if sale_id else "/sales?limit=10&includeSummary=0"),
        ("ledger_list", "/ledger?limit=50"),
    ]
    for label, path in stampede:
        jobs = []
        for i in range(USERS):

            def make(path=path, label=label, n=i):
                def fn() -> Hit:
                    st, body, ms = request("GET", path, token=tok)
                    return Hit(
                        f"{label}#{n}",
                        st == 200,
                        st,
                        ms,
                        str(body)[:200] if st != 200 else "",
                    )

                return fn

            jobs.append((f"{label}#{i}", make()))
        all_results.append(
            run_pool(f"B stampede {label} x{USERS}", jobs, USERS)
        )

    # --- Scenario C: concurrent light writes (expense) ---
    if DO_WRITE:
        jobs = []
        for i in range(USERS):

            def make(n=i):
                def fn() -> Hit:
                    body = {
                        "amount": 1,
                        "currency": "NGN",
                        "category": "Bench",
                        "description": f"concurrent-bench-{int(time.time())}-{n}",
                        "date": time.strftime("%Y-%m-%d"),
                    }
                    st, resp, ms = request("POST", "/expenses", token=tok, body=body)
                    ok = st in (200, 201)
                    return Hit(
                        f"expense_create#{n}",
                        ok,
                        st,
                        ms,
                        str(resp)[:200] if not ok else "",
                    )

                return fn

            jobs.append((f"expense#{i}", make()))
        all_results.append(
            run_pool(f"C concurrent expense writes x{USERS}", jobs, USERS)
        )
    else:
        print("  (skip write scenario — set WRITE=1 to enable)")

    # --- Verdict ---
    total = sum(len(r.hits) for r in all_results)
    ok = sum(r.ok_count for r in all_results)
    fail = total - ok
    pool_errors = sum(
        1
        for r in all_results
        for h in r.hits
        if not h.ok
        and (
            "P2024" in h.detail
            or "pool" in h.detail.lower()
            or "timed out" in h.detail.lower()
            or h.status == 0
        )
    )

    print("\n=== SUMMARY ===")
    print(f"requests {ok}/{total} ok  failures={fail}  pool/timeout-ish={pool_errors}")
    print(
        "guidance: for 12–15 daily users, peak concurrent ~5–12 is the real load; "
        "raise PRISMA_CONNECTION_LIMIT only if pool/timeout failures appear."
    )

    if fail:
        print("RESULT: FAIL")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
