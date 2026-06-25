# Spare Shop (VSS) — Reports Data Map

What each sidebar report reads from Postgres for **Vonos Spare Shop** (`tenant_vss_001`, transaction archetype).

Use **All time** on the date picker when viewing migrated historical sales (2019–2024).

---

## Migrated data (baseline)

| Table | Rows (Jun 15 export) | Used by |
|-------|---------------------:|---------|
| `Sale` + `SaleLine` | 3,013 / 18,454 | Sales, product, register, tax, trending reports |
| `LedgerEntry` (revenue) | 3,013 | Profit/Loss, Purchase & Sale (purchase side uses `cost` — sparse for VSS) |
| `Customer` | 4,667 | Contact + customer segment reports |
| `Supplier` | 130 | Supplier & Customer report |
| `Item` | 2,540 | Low stock, items sold, trending (via `itemId` on lines) |
| `AuditLog` | partial | Activity log (grows on new actions) |

**Not migrated:** `Payment` rows from legacy `transaction_payments` — Sell Payment report falls back to `Sale.paymentStatus`.

---

## Report → data source

| Report | Primary tables | Notes |
|--------|----------------|-------|
| **All Reports** (hub) | `Sale`, `SaleLine` | Sales Summary + Daily Closeout tabs |
| **Profit / Loss** | `LedgerEntry` | Revenue vs cost/expense by category |
| **Expense** | `LedgerEntry` (`type: expense`) | Manual expenses from migration |
| **Purchase & Sale** | `Sale`, `LedgerEntry` (`type: cost`) | Purchases = cost ledger; often ₦0 for VSS |
| **Tax** | `Sale`, `SaleLine` | Tax-inclusive prices; shows discounts + payment status |
| **Supplier & Customer** | `Customer`, `Supplier`, `Sale` | Top customers by revenue in period |
| **Customer Groups** | `Sale`, `Customer` | Walk-in vs A–Z account buckets |
| **Low Stock** | `Item` | `status`, `quantity`, `reorderPoint` |
| **Stock Expiry** | `Item` | No expiry field — shows low/out-of-stock SKUs |
| **Trending Products** | `SaleLine` | Units + revenue, prior-period comparison |
| **Items / Product Sell** | `SaleLine`, `Item` | Units sold + on-hand qty |
| **Sell Payment** | `Payment` → fallback `Sale.paymentStatus` | Live POS writes `Payment` |
| **Purchase Payment** | `Payment`, `LedgerEntry` expense | Sparse for retail-only VSS |
| **Register** | `Sale` | Daily transaction + revenue roll-up |
| **Sales Representative** | `Sale.createdByName` | From migration `created_by` map |
| **Activity Log** | `AuditLog` | Last 200 entries in range |

---

## Payment Accounts section (sidebar)

Balance Sheet, Trial Balance, etc. use `PaymentAccount` + `AccountTransaction` — separate from the registry reports above.

---

## API

- Hub: `GET /reports/dashboard?tab=sales|closeout&from=&to=`
- Detail: `GET /reports/run?reportId=<registry-id>&from=&to=`

Handlers live in `apps/api/src/modules/reports/aggregators/transactionReportHandlers.ts`.

---

## Gaps / next data work

1. Import historical `Payment` rows for accurate Sell Payment report.
2. Post `LedgerEntry` `type: cost` when purchasing stock for true Purchase & Sale margin.
3. Add `expiryDate` on `Item` if expiry report should match legacy POS.
4. Customer group taxonomy (legacy `customer_groups` table) if segment report should match Ultimate POS.
