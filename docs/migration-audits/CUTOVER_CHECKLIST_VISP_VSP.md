# VISP + VSP Cutover Checklist (B1–B7)

Operational checklist for [VISP_VSP_CUTOVER_PLAN.md](./VISP_VSP_CUTOVER_PLAN.md). Run at T₀ maintenance window.

---

## B1 — Vonos deployed with valid SSL

- [ ] Production URL: `https://app.vonosautos.com/VISP` and `/VSP`
- [ ] API health responds
- [ ] Login page loads (auth template)

## B2 — Delta MySQL import through cutover freeze

- [ ] Legacy POS frozen at T₀; final dump exported
- [ ] Dry-run per [DELTA_ETL_RUNBOOK.md](./DELTA_ETL_RUNBOOK.md)
- [ ] Write import with `--confirm-tenant VISP` and `VSP`
- [ ] `entity_sql_delta.py` shows no material drift
- [ ] `sql-financial-audit.ts` — `revenueTieOutPass: true` both tenants
- [ ] VISP payroll rows present if Essentials payroll used

## B3 — Staff accounts invited

- [ ] `admin@visp.vonos` / `admin@vsp.vonos` active
- [ ] Entity managers invited and accepted
- [ ] Roles assigned (admin / manager / staff)

## B4 — POS smoke test (both tenants)

- [ ] `/VISP/pos-terminal` — create sale, add payment
- [ ] `/VSP/pos-terminal` — same
- [ ] Ledger entry appears in Finance tab
- [ ] Stock decrements on catalog item (if applicable)

## B5 — Finance / Reports spot check

- [ ] Overview KPIs load without error
- [ ] Finance ledger tab — recent sales visible
- [ ] Profit & Loss report runs
- [ ] Sell payment report runs

## B6 — `/VSS/*` redirect

- [ ] `/VSS/sales` → `/VISP/sales` (301/308)
- [ ] `/VSS/*` other routes redirect to VISP equivalents

## B7 — VAG group overview

- [ ] Super admin login → Group Overview
- [ ] All 7 operating entity rows visible
- [ ] Roll-up charts load

---

## Rollback (7-day window)

- [ ] Legacy sites remain read-only backup until T+7
- [ ] Document last good Vonos import timestamp
- [ ] Staff comms: revert URL to legacy if blocking issue

## Post-cutover (T+30)

- [ ] Decommission visp.vonosautomarket.com / vsp.vonosautomarket.com cPanel
- [ ] Archive final SQL dumps offline
