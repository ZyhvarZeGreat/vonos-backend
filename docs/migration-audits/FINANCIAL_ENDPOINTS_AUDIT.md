# Financial Endpoints Audit — Legacy Ultimate POS → Vonos

**Scope:** Expenses, payment accounts, finance/ledger, HRM payroll, and registry reports (data paths only — not filter UI parity).

**Legacy reference sites** (same Ultimate POS shell; module flags differ):

| Site folder | `DB_DATABASE` | Vonos tenant |
|---|---|---|
| `hq6.vonosautomarket.com` | `vonomglk_hq3temp` | VA (live ops; ETL uses Quotation+OPS+h3 delta) |
| `visp.vonosautomarket.com` | `vonomglk_vsp` | VISP |
| `vsp.vonosautomarket.com` | `vonomglk_spmarket` | VSP |
| `audit.vonosautos.com` | `vonomglk_audit` | VW |
| `cafe.vonosautos.com` | `vonomglk_cafe` | VC |

Canonical mapping: [`apps/web/lib/registries/migrationSources.ts`](../../apps/web/lib/registries/migrationSources.ts).

Related: [HQ6_ENDPOINTS_AUDIT.md](./HQ6_ENDPOINTS_AUDIT.md), [HQ6_INFRASTRUCTURE_SYNC_PLAN.md](./HQ6_INFRASTRUCTURE_SYNC_PLAN.md) §7–9.

---

## Critical split: two expense surfaces

| Surface | Legacy MySQL | Vonos Postgres | Vonos API | Used by |
|---|---|---|---|---|
| **Expense CRUD** | `transactions.type=expense` | `Expense` + `ExpenseCategory` | `GET/POST/PATCH/DELETE /expenses` | Expenses list/add/categories UI |
| **Expense report / P&L** | same txns → ledger | `LedgerEntry` `type=expense` | `GET /reports/run?reportId=expense`, `GET /ledger` | Reports + Finance tabs |

Both must be imported and reconciled separately.

---

## 1. Expenses

### Legacy (all installs)

| Page | Shell route | AJAX / data | MySQL tables | Key columns |
|---|---|---|---|---|
| All Expenses | `GET /expenses` | `GET /expenses` (DataTable) | `transactions` | `type=expense`, `final_total`, `expense_category_id`, `transaction_date` |
| Add Expense | `GET /expenses/create` | `POST /expenses` | `transactions`, `transaction_payments` (optional) | creates expense txn |
| Expense Categories | `GET /expense-categories` | `GET /expense-categories` | `expense_categories` | `name`, `code` |

Controller: `ExpenseController` (Laravel app). JS: `public/js/expense.js`.

### Vonos

| Page | Route | View | API |
|---|---|---|---|
| Expenses list | `/{code}/expenses` | `ExpensesViews` | `GET /expenses?from=&to=` |
| Add expense | `/{code}/add-expense` | `ExpensesViews` | `POST /expenses` |
| Categories | `/{code}/expense-categories` | `ExpensesViews` | `GET/POST/PATCH/DELETE /expenses/categories` |

Nav: [`apps/web/lib/registries/expenseNav.ts`](../../apps/web/lib/registries/expenseNav.ts).  
Client: [`apps/web/lib/api/expenses.ts`](../../apps/web/lib/api/expenses.ts).  
Backend: [`apps/api/src/modules/expenses/`](../../apps/api/src/modules/expenses/).

### Report linkage

| Report id | Legacy ajax | Vonos | Data source |
|---|---|---|---|
| `expense` | `GET /reports/expense-report` | `GET /reports/run?reportId=expense` | `LedgerEntry` `type=expense` (not `Expense` table) |

---

## 2. Payment Accounts

### Legacy

| Page | Shell route | AJAX | MySQL tables |
|---|---|---|---|
| List accounts | `GET /account` | account DataTable | `accounts` |
| Deposit / transfer | account actions | POST account routes | `accounts`, `account_transactions` |
| Balance Sheet | `GET /account-report/balance-sheet` | report ajax | `account_transactions`, `accounts` |
| Trial Balance | `GET /account-report/trial-balance` | report ajax | `account_transactions` |
| Cash Flow | `GET /account-report/cash-flow` | report ajax | `account_transactions` |
| Payment Account Report | `GET /account-report/payment-account-report` | report ajax | `accounts`, `account_transactions` |

### Vonos

| Page | Route | API |
|---|---|---|
| Payment accounts | `/{code}/payment-accounts` | `GET/POST /payment-accounts`, `POST /payment-accounts/transfer` |
| Balance sheet | `/{code}/report-balance-sheet` | `GET /reports/run?reportId=balance-sheet` |
| Trial balance | `/{code}/report-trial-balance` | `GET /reports/run?reportId=trial-balance` |
| Cash flow | `/{code}/report-cash-flow` | `GET /reports/run?reportId=cash-flow` |
| Account summary | `/{code}/report-account-summary` | `GET /reports/run?reportId=account-summary` |

Backend: [`payment-accounts.controller.ts`](../../apps/api/src/modules/payment-accounts/payment-accounts.controller.ts), handlers in [`paymentAccountReportHandlers.ts`](../../apps/api/src/modules/reports/aggregators/paymentAccountReportHandlers.ts).

---

## 3. Finance / Ledger (Vonos Finance page)

### Legacy

Ultimate POS has no single “Finance” page; ledger is spread across:
- Account module (`account_transactions`)
- Expense transactions
- Sell/purchase payment dues on home dashboard
- Profit/Loss report

### Vonos

| Tab | Route | API | Postgres |
|---|---|---|---|
| Transaction ledger | `/{code}/finance` | `GET /ledger?type=&from=&to=` | `LedgerEntry` |
| P&L summary | same (chart tab) | `GET /ledger/summary?from=&to=` | `LedgerEntry` by type |
| Manual expense | Finance action bar | `POST /ledger` (`type: expense`) | creates `LedgerEntry` |
| VAG consolidated | `/admin/finance` | `GET /ledger/group`, `GET /ledger/group/summary` | unscoped roll-up |

View: [`FinanceView.tsx`](../../apps/web/components/pages/FinanceView.tsx).  
Backend: [`ledger.controller.ts`](../../apps/api/src/modules/ledger/ledger.controller.ts).

---

## 4. HRM / Payroll

### Legacy (Essentials module)

| Page | Shell route | AJAX | MySQL tables |
|---|---|---|---|
| Payroll (All) | `GET /hrm/payroll` | `GET /hrm/payroll` | `transactions` `type=payroll`, join `users` on `expense_for` |
| Payroll Groups | tab | `GET /hrm/payroll-group-datatable` | `essentials_payroll_groups`, `essentials_payroll_group_transactions` |
| Pay Components | tab | `GET /essentials/allowance-deduction` | `essentials_allowances_and_deductions` |
| Create payroll | `GET /hrm/payroll/create` | `POST /hrm/payroll` | `transactions`, group junction |

Query source: `EssentialsUtil::getPayrollQuery()` in Essentials module.  
Routes: `Modules/Essentials/Routes/web.php`.

**VA-only in practice:** automotive staff payroll lives in Quotation + OPS + hq3temp. VISP has payroll group metadata but no `type=payroll` transaction rows in export.

### Vonos

| Page | Route | API | Postgres |
|---|---|---|---|
| HRM hub | `/{code}/hr` or `/{code}/payroll` | tabs | — |
| Payroll list | payroll tab | `GET /hrm/payroll` | `Payroll` |
| Payroll groups | tab | `GET /hrm/payroll-groups` | `PayrollGroup` |
| Pay components | tab | `GET /hrm/pay-components` | `PayComponent` |
| Workforce | tab | `GET /hrm/workforce` | `User` |

Backend: [`hrm.controller.ts`](../../apps/api/src/modules/hrm/hrm.controller.ts).  
ETL: [`scripts/migration/hrm_transforms.py`](../../scripts/migration/hrm_transforms.py).

Payroll posts expense-side ledger on import when configured; not a registry report.

---

## 5. Financial registry reports

All shell routes: `GET /reports/{slug}`.  
All Vonos detail pages: `GET /reports/run?reportId={id}&from=&to=` via [`reportRunner.ts`](../../apps/api/src/modules/reports/reportRunner.ts).

| Report id | HQ6 route | HQ6 ajax | Legacy tables | Vonos slug | Handler |
|---|---|---|---|---|---|
| `profit-loss` | `/reports/profit-loss` | `/reports/get-profit/{by}` | sells, purchases, expenses, `account_transactions` | `report-profit-loss` | `buildProfitLossReport` |
| `purchase-sale` | `/reports/purchase-sell` | `/reports/purchase-sell` | `transactions` purchase+sell | `report-purchase-sale` | `buildPurchaseSaleReport` |
| `tax` | `/reports/tax` | `/reports/tax-report` | sell lines, tax fields | `report-tax` | `buildTaxReport` |
| `supplier-customer` | `/reports/customer-supplier` | `/reports/customer-supplier` | `contacts`, dues | `report-supplier-customer` | `buildContactsSummaryReport` |
| `customer-groups` | `/reports/customer-group` | `/reports/customer-group` | `customer_groups`, sells | `report-customer-groups` | customer groups handler |
| `purchase-payment` | `/reports/purchase-payment-report` | same | `transaction_payments` on purchases | `report-purchase-payment` | purchase payment handler |
| `sell-payment` | `/reports/sell-payment-report` | same | `transaction_payments` on sells | `report-sell-payment` | sell payment handler |
| `expense` | `/reports/expense-report` | same | expense txns / ledger | `report-expense` | `buildExpenseReport` |
| `register` | `/reports/register-report` | same | `cash_registers`, sells | `report-register` | register handler |
| `sales-rep` | `/reports/sales-representative-report` | `sales-representative-total-*` | sells by `created_by` | `report-sales-rep` | sales rep handler |
| `balance-sheet` | account report routes | account ajax | `account_transactions` | `report-balance-sheet` | payment account handlers |
| `trial-balance` | account report routes | account ajax | `account_transactions` | `report-trial-balance` | payment account handlers |
| `cash-flow` | account report routes | account ajax | `account_transactions` | `report-cash-flow` | payment account handlers |
| `account-summary` | account report routes | account ajax | `accounts` | `report-account-summary` | payment account handlers |
| `activity-log` | `/reports/activity-log` | same | `activity_log` | `report-activity-log` | audit handler |

Registry source: [`packages/types/src/reportRegistry.ts`](../../packages/types/src/reportRegistry.ts).  
Web wiring: [`entityPages.tsx`](../../apps/web/lib/registries/entityPages.tsx), [`ReportsView.tsx`](../../apps/web/components/pages/ReportsView.tsx), [`ReportRunView.tsx`](../../apps/web/components/organisms/ReportDetailSheet.tsx).

### Archetype dashboard tabs (separate from registry)

| Archetype | Tenants | Endpoint | Aggregator |
|---|---|---|---|
| `stock` | VW, VKW | `GET /reports/dashboard?tab=` | `stockReports.ts` |
| `transaction` | VISP, VSP, VC | `GET /reports/dashboard?tab=sales\|closeout` | `transactionReports.ts` |
| `job` | VA | `GET /reports/dashboard?tab=costing\|turnaround` | `jobReports.ts` |
| `appointment` | VS | `GET /reports/dashboard?tab=stylist\|noshow` | `appointmentReports.ts` |
| VAG group | VAG | `GET /reports/group` | `groupReports.ts` |

---

## 6. Vonos frontend wiring summary

| Area | Registry / page | API client |
|---|---|---|
| Expenses UI | `expenseNav.ts`, `ExpensesViews.tsx` | `lib/api/expenses.ts` |
| Finance | `FinanceView.tsx` | `lib/api/ledger.ts` (if present) / overview finance |
| Reports hub | `ReportsView.tsx`, `reportNavSections.ts` | `lib/api/reports.ts` |
| Report detail | `ReportRunView.tsx` | `GET /reports/run` |
| Payment accounts | entity pages | `lib/api/paymentAccounts.ts` |
| Payroll | `PayrollView.tsx`, `HrmPageView.tsx` | `lib/api/hrm.ts` |

---

## 7. Legacy site module notes

Financial modules depend on `modules_statuses.json` per install:

| Module | Affects |
|---|---|
| `account` | Payment accounts, balance sheet, trial balance |
| `essentials` | HRM payroll, allowances |
| `expenses` | Expense list/categories |

HQ6 (hq3temp) runs Essentials + account for VA automotive ops. VISP/VSP typically have account module; payroll groups present on VISP only. VW audit install has no purchases and no payment accounts by design.

---

## 8. Verification commands

```bash
# MySQL financial counts per database
python3 scripts/financial_coverage_mysql.py

# Postgres financial counts per tenant
cd apps/api && npx ts-node prisma/scripts/sql-financial-audit.ts

# Full cPanel dump table inventory (includes tx type breakdown)
python3 scripts/audit_mysql_dump.py ~/Downloads/localhost.sql
```

Outputs: [dryruns/FINANCIAL_MYSQL_COUNTS.json](./dryruns/FINANCIAL_MYSQL_COUNTS.json), [dryruns/FINANCIAL_POSTGRES_COUNTS.json](./dryruns/FINANCIAL_POSTGRES_COUNTS.json).

Coverage matrix: [FINANCIAL_DATA_COVERAGE.md](./FINANCIAL_DATA_COVERAGE.md).  
Report data dependencies: [FINANCIAL_REPORTS_DATA.md](./FINANCIAL_REPORTS_DATA.md).
