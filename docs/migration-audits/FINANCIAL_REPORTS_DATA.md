# Financial Reports — Data Dependencies

What each **financial** registry report reads from Postgres, which legacy MySQL tables feed it, and which ETL gaps zero out the report.

**API:** `GET /reports/run?reportId={id}&from=&to=` → [`reportRunner.ts`](../../apps/api/src/modules/reports/reportRunner.ts).

**Registry:** [`packages/types/src/reportRegistry.ts`](../../packages/types/src/reportRegistry.ts).

Use **All time** or wide date ranges when validating migrated historical data.

---

## Transaction archetype (VISP, VSP, VC)

### Hub dashboard

| Tab | Endpoint | Tables | Legacy source |
|---|---|---|---|
| Sales summary | `GET /reports/dashboard?tab=sales` | `Sale`, `SaleLine` | `transactions` sell + `transaction_sell_lines` |
| Daily closeout | `GET /reports/dashboard?tab=closeout` | `Sale`, `Payment` | sells + `transaction_payments` |

Handler: [`transactionReports.ts`](../../apps/api/src/modules/reports/aggregators/transactionReports.ts).

### Registry reports

| Report id | Handler | Primary Postgres tables | Legacy MySQL | ETL gap if empty |
|---|---|---|---|---|
| `profit-loss` | `buildProfitLossReport` | `LedgerEntry` (revenue, cost, expense) | sells, purchases, expenses, account txns | Missing ledger types; duplicate revenue (VISP) |
| `expense` | `buildExpenseReport` | `LedgerEntry` `type=expense` | `transactions` expense | Expense txns not → ledger |
| `purchase-sale` | `buildPurchaseSaleReport` | `LedgerEntry` cost + revenue; `Sale` | purchases + sells | VA: no cost ledger; retail: OK if purchases imported |
| `tax` | `buildTaxReport` | `Sale`, `SaleLine` | sell tax fields | Sales not imported |
| `supplier-customer` | `buildContactsSummaryReport` | `Customer`, `Supplier`, `Sale` | `contacts`, sells | Contacts OK on all tenants |
| `customer-groups` | `buildCustomerGroupsReport` | `Sale`, `Customer` | `customer_groups` | Group taxonomy partial |
| `purchase-payment` | `buildPurchasePaymentReport` | `Payment`, `LedgerEntry` expense | `transaction_payments` on purchases | VA: sparse; VISP: partial |
| `sell-payment` | `buildSellPaymentReport` | `Payment` → fallback `Sale.paymentStatus` | `transaction_payments` | Payment import incomplete → fallback mode |
| `register` | `buildRegisterReport` | `Sale` | `cash_registers`, sells | Register sessions not migrated |
| `sales-rep` | `buildSalesRepReport` | `Sale.createdByName` | `transactions.created_by` | OK if sales imported |
| `trending` | `buildTrendingProductsReport` | `SaleLine` | `transaction_sell_lines` | Sales lines |
| `items` | `buildItemsReport` | `SaleLine`, `Item` | sell lines + products | OK |
| `product-purchase` | `buildProductPurchaseReport` | inbound `StockMovement` lines | `purchase_lines` | VISP/VSP: needs inbound ETL |
| `product-sell` | `buildProductSellReport` | `SaleLine`, `Item` | sell lines | OK |
| `activity-log` | audit handler | `AuditLog` | `activity_log` | Partial migration |

Finance handlers: [`financeReportHandlers.ts`](../../apps/api/src/modules/reports/aggregators/financeReportHandlers.ts).  
Transaction handlers: [`transactionReportHandlers.ts`](../../apps/api/src/modules/reports/aggregators/transactionReportHandlers.ts).

### Payment account reports (sidebar section)

| Report id | Handler | Postgres tables | Legacy | Gap |
|---|---|---|---|---|
| `balance-sheet` | `buildBalanceSheetReport` | `PaymentAccount`, `AccountTransaction` | `accounts`, `account_transactions` | VW: 0 accounts |
| `trial-balance` | `buildTrialBalanceReport` | same | same | same |
| `cash-flow` | `buildCashFlowReport` | same | same | same |
| `account-summary` | `buildPaymentAccountReport` | same | same | same |

Handler file: [`paymentAccountReportHandlers.ts`](../../apps/api/src/modules/reports/aggregators/paymentAccountReportHandlers.ts).

---

## Stock archetype (VW, VKW)

| Report id | Handler | Tables | VW legacy | Notes |
|---|---|---|---|---|
| `profit-loss` | `buildProfitLossReport` | `LedgerEntry` | sell outbounds | Revenue from outbound only |
| `purchase-sale` | `buildPurchaseSaleReport` | `LedgerEntry` | sells only | Purchases = 0 by design |
| `stock` | stock valuation | `Item`, `ItemLocationStock` | `variation_location_details` | OK |
| `low-stock` | low stock | `Item` | products | OK |
| `movement` | dashboard tab | `StockMovement` | transfers/sells | VW outbound OK |
| `product-sell` | product sell | `SaleLine` or movements | sells | VW uses movements not Sale |

Dashboard: [`stockReports.ts`](../../apps/api/src/modules/reports/aggregators/stockReports.ts).

**VW gap:** Ledger revenue 2× vs payments — fix before P&L sign-off.

---

## Job archetype (VA)

| Surface | Endpoint | Tables | Legacy | Gap |
|---|---|---|---|---|
| Job costing tab | `GET /reports/dashboard?tab=costing` | `Job`, `JobMaterial`, `JobLabour`, `LedgerEntry` | job sells + materials | hq3temp 2026 jobs missing |
| Turnaround tab | `tab=turnaround` | `Job` status/dates | `transactions` sell (jobs) | same |
| Finance page | `GET /ledger` | `LedgerEntry` | all txn types | 2025 hole; hq3temp delta |
| `profit-loss` | registry | `LedgerEntry` | composite | Expense + revenue from jobs |
| `expense` | registry | `LedgerEntry` expense | expense txns | hq3temp expenses not imported |
| `supplier-customer` | registry | `Customer`, jobs | contacts | OK |

VA does **not** use `Sale` for primary revenue — job references (`VM-`, `VMS-`, future `HQ3-`) drive ledger.

Dashboard: [`jobReports.ts`](../../apps/api/src/modules/reports/aggregators/jobReports.ts).

---

## Appointment archetype (VS)

No legacy import. Financial reports (`profit-loss`, `expense`) work on live `LedgerEntry` only. `customer-groups` and `sales-rep` apply when appointments post revenue.

---

## VAG group roll-up

| Endpoint | Handler | Scope | Tables |
|---|---|---|---|
| `GET /reports/group` | `buildGroupReports` | `AUTOS_GROUP_CODES`: VW, VA, VISP, VSP | cross-tenant `LedgerEntry`, `Job`, `Sale` |
| `GET /reports/group/run?reportId=` | group runner | per-report `byEntity` breakdown | same |

**Excluded today:** VC, VS, VKW — not in [`AUTOS_GROUP_CODES`](../../apps/api/src/modules/reports/aggregators/groupReports.ts).

Group queries: [`groupReportQueries.ts`](../../apps/api/src/modules/reports/aggregators/groupReportQueries.ts).

---

## Expenses UI vs Expense report

| UI | API | Table | Report id | Table |
|---|---|---|---|---|
| Expenses list | `GET /expenses` | `Expense` | `expense` | `LedgerEntry` |
| Add expense | `POST /expenses` | `Expense` | — | — |
| Manual finance entry | `POST /ledger` | `LedgerEntry` | `expense`, `profit-loss` | same |

Migrating `transactions.type=expense` should populate **both** `Expense` and `LedgerEntry` (or document why not).

---

## Payroll (not a registry report)

| UI | API | Postgres | Legacy |
|---|---|---|---|
| HRM payroll tab | `GET /hrm/payroll` | `Payroll` | `transactions` `type=payroll` |
| Payroll groups | `GET /hrm/payroll-groups` | `PayrollGroup` | `essentials_payroll_groups` |

Payroll may also post `LedgerEntry` expense. **VA:** 787 in PG vs 1,212 across Quotation+OPS+hq3temp.

---

## Report kill matrix (ETL gap → broken report)

| If this is missing in Postgres | These reports degrade |
|---|---|
| `LedgerEntry` revenue | P&L, purchase-sale (revenue side), group roll-up |
| `LedgerEntry` cost | P&L margin, purchase-sale (purchase side) |
| `LedgerEntry` expense | P&L, expense report |
| `Sale` / job revenue | Tax, register, trending, items, sell-payment |
| `Payment` rows | Sell/purchase payment reports (fallback to paymentStatus) |
| `AccountTransaction` | Balance sheet, trial balance, cash flow |
| Inbound `StockMovement` | Product purchase, cost ledger (retail) |
| `Expense` rows only (no ledger) | Expenses UI works; expense **report** still empty |

---

## Per-tenant quick reference

| Tenant | Trust P&L today? | Trust sell payment? | Trust expense report? | Trust account reports? |
|---|---|---|---|---|
| **VA** | 🟡 through Dec 2024; missing 2025–2026 | 🟡 high payment count | 🟡 ledger heavy | 🟡 |
| **VISP** | 🔴 revenue 2× | 🟡 | 🟡 thin expenses | 🟡 |
| **VSP** | 🔴 revenue 2× | 🟡 | ⚪ empty | 🟡 |
| **VW** | 🟡 revenue 2× | 🟡 | ⚪ | ⚪ no accounts |
| **VC** | 🟢 sales=ledger | 🟡 payment delta | 🟢 | 🟢 |

Full counts: [FINANCIAL_DATA_COVERAGE.md](./FINANCIAL_DATA_COVERAGE.md).

---

## Related

- [VSS_REPORTS_DATA.md](./VSS_REPORTS_DATA.md) — original retail report map (VSS retired → VISP/VSP)
- [FINANCIAL_ENDPOINTS_AUDIT.md](./FINANCIAL_ENDPOINTS_AUDIT.md)
- [HQ6_ENDPOINTS_AUDIT.md](./HQ6_ENDPOINTS_AUDIT.md) §5 Reports
