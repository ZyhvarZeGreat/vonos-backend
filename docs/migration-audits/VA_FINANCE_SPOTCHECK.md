# VA / HQ6 Finance Spot-Check

Manual and automated validation for Vonos Automotive (`tenant_va_001`) finance parity after ETL.

## Automated checks

### Database spot-check (run after every VA import)

```bash
cd apps/api && npm run prisma:va-finance-spotcheck
```

Validates:

- Job, HRM, expense, payment account, and inbound purchase counts
- Cost ledger ≈ inbound movements
- Job revenue ledger present (VA does not use `Sale` tie-out)
- No leftover data in retired `tenant_vm_001` / `tenant_vms_001`
- Recent jobs linked to customers via `customerId`

Exit code `0` = all checks passed; `1` = one or more failures.

### Full VA audit

```bash
cd apps/api && npx ts-node prisma/scripts/sql-va-audit.ts
```

### Cross-tenant financial counts

```bash
cd apps/api && npx ts-node prisma/scripts/sql-financial-audit.ts
python3 scripts/financial_coverage_mysql.py
```

## API smoke test

With API running locally (or set `VONOS_API_URL`):

```bash
python3 scripts/va_smoke_test.py
```

Environment:

- `VONOS_API_URL` — default `http://localhost:3001`
- `VA_SMOKE_EMAIL` — default `admin@va.vonos`
- `VA_SMOKE_PASSWORD` — default `password`

Covers ledger, expenses, payment accounts, HRM payroll, jobs, customer profile, invoice settings, and profit-loss report.

## Manual UI walk (B5 cutover gate)

On `/VA`:

1. **Finance** — ledger tab loads; P&L summary shows revenue / costs / net
2. **Expenses** — list non-empty; categories available
3. **Payment accounts** — ~104 accounts; trial balance / cash flow reports run
4. **Reports → Profit & Loss** — HQ6 two-column layout for All time
5. **Reports → Expense, Purchase & Sale, Supplier & Customer** — non-empty for wide date range
6. **HRM → Payroll** — payroll list + groups
7. **Jobs** — open 5 recent jobs: reference, customer, quote/invoice amounts, linked customer profile
8. **Customers** — profile shows transaction history + balance due
9. **Invoice Settings** — layouts/schemes loaded; terms save correctly
10. **Sales** (VISP/VSP tenants) — sale detail → Preview receipt

## Known VA caveats

| Check | Note |
|-------|------|
| `revenueTieOutPass` (sale vs ledger) | N/A for VA — revenue is job-driven |
| Expense table vs ledger expense | Ledger is higher (payroll + manual entries) |
| Payment total vs ledger revenue | Expected mismatch — payments include purchases/expenses |

## Invoice layouts migration

Legacy `invoice_layouts` and `invoice_schemes` from Ultimate POS dumps are imported via ETL (`catalog_transforms.py`) on the next entity re-import. Tenants without legacy data get default layouts from `GET /invoice-settings`.
