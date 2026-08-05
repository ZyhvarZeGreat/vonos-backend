# Backend endpoint full probe audit

**Date:** 2026-08-05  
**Target:** `https://api-copy-production-c1e5.up.railway.app`  
**Auth:** `admin@va.vonos` (JWT `role=admin`, `tenantId=tenant_va_001`)  
**Script:** [`scripts/api_endpoint_probe.py`](../../scripts/api_endpoint_probe.py)  
**Canonical run:** `tmp/api_endpoint_probe_20260805T001301Z.json` (local artifact, not committed)

Probe tagged writes with `PROBE-AUDIT-*` and soft-deleted them afterward.

---

## Headline

| Metric | Value |
|--------|------:|
| Routes inventoried | 277 |
| Static GETs in inventory | 80 |
| Phase 2 OK | 66 |
| VAG-only (expected 403) | 12 |
| **404s** | **0** |
| **5xx** | **0** |
| Unexpected auth failures | 0 |
| Phase 3 detail GETs | 53 / 53 OK |
| Write ops | 9 / 9 OK |
| Soft-delete cleanup | 4 / 4 OK |

No missing/mismatched controller paths. CRUD for sales, purchases, expenses, and customers works end-to-end on VA.

---

## Issue fixed

### `GET /audit` and `GET /audit/recent` → 400

**Symptom (live):**

```json
{
  "statusCode": 400,
  "message": "Tenant context required. Super admins must send X-Viewing-Tenant header."
}
```

**Cause:** [`AuditController`](../../apps/api/src/modules/audit/audit.controller.ts) had no `JwtAuthGuard` / `TenantGuard` / `RolesGuard`. JWT was never applied, so `TenantDbService.requireTenantId()` saw no user/tenant and always 400’d. Activity feeds that call `/audit` and `/audit/recent` were broken.

**Fix:** Apply the same guard trio used by other tenant-scoped controllers. Regression test: [`audit.controller.spec.ts`](../../apps/api/src/modules/audit/audit.controller.spec.ts).

**Deploy:** publish `vonos-backend` so Railway picks up the controller change. Until then the copy API will still return 400.

---

## Write flows (all passed)

| Flow | Ops | HTTP |
|------|-----|------|
| Customer | POST → PATCH → DELETE | 201 / 200 / 200 |
| Sale (quotation) | POST → PATCH → DELETE | 201 / 200 / 200 |
| Purchase (inbound) | POST → PATCH → pay → DELETE | 201 / 200 / 201 / 200 |
| Expense | POST → PATCH → DELETE | 201 / 200 / 200 |

Probe rows created then cleaned:

- customer `cmsfc6vh6000qmm0pc7drvs40`
- sale `cmsfc70l3000ymm0p3sjk29af`
- purchase `cmsfc76ue001amm0pg6w3qeqp`
- expense `cmsfc7eib001tmm0p0h320ba2`

---

## Detail GETs

First IDs from list seeds. All returned **200**:

- Sale: `/sales/:id`, `/meta`, `/view`, `/payments`, `/invoice-url`
- Purchase: `/stock-movements/:id`, `/view`, `/payments`
- Expense, customer (contact / summary / view / ledger), supplier (summary / meta)
- Item (meta / stock-history), job (meta / shell / costs)
- Payment account + `/payments/account-book/:id`
- Invoice, user, tenant-role

Empty seeds (no detail hit — expected on VA): vehicles, discounts, variations, requisitions, cafe-tables, appointments, salon-services.

---

## Expected 403 (VAG / `super_admin` only)

Tenant `admin` correctly cannot call:

- `/ledger/group`, `/ledger/group/charts`, `/ledger/group/categories`, `/ledger/group/summary`, `/ledger/group/by-entity`
- `/overview/group`, `/overview/group/summary`, `/overview/group/details`
- `/overview/cache/stats`, `/overview/cache/metrics`
- `/reports/group`, `/reports/group/run`

Not bugs.

---

## Skipped / out of scope

| Item | Reason |
|------|--------|
| `GET /media/legacy` | Needs a real allowed `/uploads/` image URL; fake URL 502s |
| HRM payroll pay / attendance clock-in | Plan out of scope |
| VAG unscoped group writes | Plan out of scope |
| Hard-delete of production master data | Never done |

---

## How to re-run

```bash
VONOS_API_URL=https://api-copy-production-c1e5.up.railway.app \
  python3 scripts/api_endpoint_probe.py
```

Read-only (no CRUD):

```bash
PROBE_SKIP_WRITES=1 python3 scripts/api_endpoint_probe.py
```
