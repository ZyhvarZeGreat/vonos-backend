# HQ6 → Vonos Page & Route Map

Source of truth for HQ6: local folder `hq6.vonosautomarket.com/` (gitignored Laravel Ultimate POS + Essentials HRM).

Vonos routing: `/{tenantCode}/{slug}` via `apps/web/app/(dashboard)/[tenant]/[listSlug]/page.tsx`; overview at `/{tenantCode}/overview`. Slugs from `posNavSections.ts` + `entityPages.tsx`.

Replace `{code}` with any entity tenant (`VW`, `VISP`, `VSP`, `VC`, `VA`, `VS`, `VKW`).

## 1. Home / Overview Dashboard

| HQ6 page | HQ6 shell route | HQ6 data endpoints | Vonos route | Vonos view | Vonos API |
|----------|-----------------|-------------------|-------------|------------|-----------|
| Home dashboard | `GET /home` | `GET /home/get-totals` | `/{code}/overview` | `TenantOverviewView` / `WarehouseOverviewView` (VW) | `GET /overview/dashboard` |
| Stock alert panel | (embedded) | `GET /home/product-stock-alert` | same | `OverviewLiveBody` panels | `GET /overview/panels/stock-alert` |
| Purchase payment due | (embedded) | `GET /home/purchase-payment-dues` | same | panels | `GET /overview/panels/purchase-payment-dues` |
| Sales payment due | (embedded) | `GET /home/sales-payment-dues` | same | panels | `GET /overview/panels/sales-payment-dues` |

HQ6 JS: `hq6.vonosautomarket.com/public/js/home.js`

## 2. Contacts

| HQ6 page | HQ6 shell route | HQ6 data endpoints | Vonos route | Vonos API |
|----------|-----------------|-------------------|-------------|-----------|
| Suppliers | `GET /contacts?type=supplier` | `GET /contacts` (ajax) | `/{code}/suppliers` | `GET /suppliers` |
| Customers | `GET /contacts?type=customer` | `GET /contacts` (ajax) | `/{code}/customers` | `GET /customers` |
| Add contact | `GET /contacts/create` | `POST /contacts` | create modal | `POST /suppliers`, `POST /customers` |
| Row actions | — | `GET /get-contact-due/{id}`, `/contacts/ledger`, `/contacts/payments/{id}` | — | `GET /contacts/:id/summary` |

## 3. Purchases

| HQ6 page | HQ6 shell route | HQ6 data endpoints | Vonos route | Vonos API |
|----------|-----------------|-------------------|-------------|-----------|
| List Purchases | `GET /purchases` | `GET /purchases` (DataTable) | `/{code}/inbound` | `GET /stock-movements?type=inbound` |
| Add Purchase | `GET /purchases/create` | `POST /purchases` | `/{code}/add-purchase` | `POST /stock-movements` |
| Purchase Return list | `GET /purchase-return` | `GET /purchase-return` | `/{code}/purchase-returns` | `GET /stock-movements?type=outbound&source=purchase_return` |

## 4. Expenses

| HQ6 page | HQ6 shell route | HQ6 data endpoints | Vonos route | Vonos API |
|----------|-----------------|-------------------|-------------|-----------|
| All Expenses | `GET /expenses` | `GET /expenses` | `/{code}/expenses` | `GET /expenses` |
| Add Expense | `GET /expenses/create` | `POST /expenses` | `/{code}/add-expense` | `POST /expenses` |
| Expense Categories | `GET /expense-categories` | `GET /expense-categories` | `/{code}/expense-categories` | `GET/POST/PATCH/DELETE /expenses/categories` |

## 5. Reports (15 pages)

| HQ6 page | HQ6 route | HQ6 data endpoint | Vonos route | Vonos report id |
|----------|-----------|-------------------|-------------|-----------------|
| Profit / Loss | `/reports/profit-loss` | `/reports/get-profit/{by}` | `/{code}/report-profit-loss` | `profit-loss` |
| Purchase & Sale | `/reports/purchase-sell` | `/reports/purchase-sell` | `/{code}/report-purchase-sale` | `purchase-sale` |
| Supplier & Customer | `/reports/customer-supplier` | `/reports/customer-supplier` | `/{code}/report-supplier-customer` | `supplier-customer` |
| Customer Groups | `/reports/customer-group` | `/reports/customer-group` | `/{code}/report-customer-groups` | `customer-groups` |
| Stock Report | `/reports/stock-report` | `/reports/stock-report` | `/{code}/report-stock` | `stock` |
| Trending Products | `/reports/trending-products` | `/reports/trending-products` | `/{code}/report-trending` | `trending` |
| Items Report | `/reports/items-report` | `/reports/items-report` | `/{code}/report-items` | `items` |
| Product Purchase | `/reports/product-purchase-report` | `/reports/product-purchase-report` | `/{code}/report-product-purchase` | `product-purchase` |
| Product Sell | `/reports/product-sell-report` | `/reports/product-sell-report` (+ grouped tabs) | `/{code}/report-product-sell` | `product-sell` |
| Purchase Payment | `/reports/purchase-payment-report` | `/reports/purchase-payment-report` | `/{code}/report-purchase-payment` | `purchase-payment` |
| Sell Payment | `/reports/sell-payment-report` | `/reports/sell-payment-report` | `/{code}/report-sell-payment` | `sell-payment` |
| Expense Report | `/reports/expense-report` | `/reports/expense-report` | `/{code}/report-expense` | `expense` |
| Register Report | `/reports/register-report` | `/reports/register-report` | `/{code}/report-register` | `register` |
| Sales Rep | `/reports/sales-representative-report` | `/reports/sales-representative-total-*` | `/{code}/report-sales-rep` | `sales-rep` |
| Activity Log | `/reports/activity-log` | `/reports/activity-log` | `/{code}/report-activity-log` | `activity-log` |

Vonos API: `GET /reports/run?reportId=…` via `reportRunner.ts`.

## 6. HRM / Payroll

| HQ6 page | HQ6 route | HQ6 data endpoint | Vonos route | Vonos API |
|----------|-----------|-------------------|-------------|-----------|
| Payroll (All) | `GET /hrm/payroll` | `GET /hrm/payroll` (ajax) | `/{code}/hr/payroll` | `GET /hrm/payroll` |
| Payroll Groups | same | `GET /hrm/payroll-group-datatable` | `/{code}/hr/payroll` (tab) | `GET /hrm/payroll-groups` |
| Pay Components | same | `GET /essentials/allowance-deduction` | tab | `GET /hrm/pay-components` |
| Create payroll | `GET /hrm/payroll/create` | `POST /hrm/payroll` | — | `POST /hrm/payroll` |

Full HRM routes: `hq6.vonosautomarket.com/Modules/Essentials/Routes/web.php`

## 7. Naming mismatches

| HQ6 | Vonos slug | Reason |
|-----|------------|--------|
| `/purchases` | `inbound` | Stock-centric movement terminology |
| `/home` | `overview` | Dashboard template |
| `/contacts?type=` | `suppliers` / `customers` | Split list pages |

---

## 8. VA-only (Vonos Automotive) — HQ6 reference scope

**HQ6** (`hq6.vonosautomarket.com`) is the **automotive** reference only. Retail tenants (VISP, VSP, VW, VC) use their own legacy sites and audit docs — do not use HQ6 job/HRM flows for retail cutover.

**Legacy sources:** `vonomglk_Quotation` (VM, `VM-` job prefix) + `vonomglk_OPS` (VMS, `VMS-` prefix) → `tenant_va_001`.

**Expected dump files:** `vonomglk_Quotation.sql` + `vonomglk_OPS.sql` (or combined `localhost.sql`).

**Import wrapper:** `./scripts/migrate_va.sh` (composite) or `./scripts/migrate_va.sh --hrm-only` for Essentials HRM only.

| HQ6 / Essentials area | Vonos route | Backend module | ETL status | API | UI |
|----------------------|-------------|----------------|------------|-----|-----|
| Jobs / quotations | `/VA/jobs` | `jobs` | ✓ ~9,666 jobs (VM-/VMS-) | ✓ | ✓ |
| Job materials / labour | `/VA/jobs/:id` | `jobs` | ✓ | ✓ | ✓ |
| Customers | `/VA/customers` | `customers` | ✓ | ✓ | ✓ |
| Vehicles | `/VA/vehicles` | vehicles (via jobs) | ○ partial | ○ | ○ |
| Requisitions | `/VA/requisitions` | `requisitions` | ✓ | ✓ | ✓ |
| HRM Payroll (All) | `/VA/hr/payroll`, `/VA/payroll` | `hrm` | ✓ 787 payrolls, 61 groups, 4 components | ✓ | ✓ |
| HRM Payroll Groups | tab on payroll | `hrm` | ✓ | ✓ | ✓ |
| Pay Components (allowances/deductions) | tab on payroll | `hrm` | ✓ | ✓ | ✓ |
| Expenses | `/VA/expenses` | `expenses` | ○ ledger + Expense table | ✓ | ✓ |
| Expense categories | `/VA/expense-categories` | `expenses` | ○ | ✓ | ✓ |
| Finance / ledger | `/VA/finance` | `ledger` | ✓ ~37k ledger rows | ✓ | ✓ |
| Reports | `/VA/reports/*` | `reports` | ○ derived from upstream | ✓ | ✓ |
| Overview | `/VA/overview` | `overview` | ○ job KPIs | ✓ | ✓ |
| Users | `/VA/users` | `users` | ✗ re-invite manual | ✓ | ✓ |
| Leave / attendance / holidays | Essentials stubs | — | ✗ out of v1 scope | ✗ | ○ stub nav |

**Dry-run target:** [dryruns/VA_MIGRATION_DRYRUN.json](./dryruns/VA_MIGRATION_DRYRUN.json) — HRM-only import: 787 payrolls, 61 groups, 4 pay components.

**Verification:** `cd apps/api && npx ts-node prisma/scripts/sql-va-audit.ts` — compare Postgres counts to dry-run JSON.

**Field map:** [VA_MIGRATION_MAP.md](./VA_MIGRATION_MAP.md)
