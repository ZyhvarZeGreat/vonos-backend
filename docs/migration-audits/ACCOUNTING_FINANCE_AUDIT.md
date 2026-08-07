# Accounting & finance audit — Vonos app

**Date:** 2026-08-05  
**Scope:** How money is recorded, displayed, and rolled up across sales, purchases, expenses, payroll, payment accounts, Finance, and P&amp;L reports.  
**Not in scope:** Stock quantity mechanics (see prior stock write-up), tax engines, multi-currency FX.

Related: [FINANCIAL_ENDPOINTS_AUDIT.md](./FINANCIAL_ENDPOINTS_AUDIT.md) (legacy → Vonos mapping), [BACKEND_ENDPOINT_PROBE_AUDIT.md](./BACKEND_ENDPOINT_PROBE_AUDIT.md).

---

## Executive summary

Vonos is **not** a double-entry general ledger. It is three loosely coupled books plus operational rollups:

| Book | Tables | Question it answers |
|------|--------|---------------------|
| **Cash / tills** | `PaymentAccount`, `AccountTransaction`, `Payment` | How much is in each till/bank? |
| **P&amp;L pointer ledger** | `LedgerEntry` | Chronological revenue / cost / expense lines for Finance |
| **Daily rollup** | `TenantDailyFinance` | Fast KPI totals (can diverge from ledger rows) |
| **Ops documents** | `Sale`, `StockMovement`, `Expense`, `Payroll`, `Invoice`, customer/supplier totals | What is due, invoiced, paid? |

**Critical finding:** Finance KPIs, the Finance ledger table, the expense list, and the HQ6 P&amp;L report **do not share one definition of profit**. Mixing them will disagree.

**Recommended north star (not yet implemented):** pick **accrual** (recognize sale/purchase/expense on document finalize) **or cash** (recognize on payment). Post cash only to the till book. Never post the same economic event as both full-document P&amp;L and a second P&amp;L line on payment.

---

## 1. Data model

### 1.1 Cash book

- `PaymentAccount` — till / cash / bank (no stored balance; sum txns).
- `AccountTransaction` — `credit` | `debit`, `subType` (`sale_payment`, `purchase_payment`, `deposit`, `fund_transfer`, `opening_balance`, `payroll`, expense debit).
- `Payment` — application of money to a sale (`saleId`), purchase (`paymentFor: purchase`), or payroll (`paymentFor: payroll`). Optional `accountId`, `invoiceId`.

Writer: [`recordPaymentAccountTxn.ts`](../../apps/api/src/common/utils/recordPaymentAccountTxn.ts).

### 1.2 P&amp;L ledger

`LedgerEntry`: `type` ∈ `revenue` | `cost` | `expense`, `amount`, `category`, `description`, `linkedRecordType/Id`, `invoiceId?`, `isInternalTransfer`, `date`.

There is **no** chart of accounts, journals, or balancing debit/credit pair.

### 1.3 Daily finance rollup

`TenantDailyFinance` per tenant × UTC day: `revenue`, `costs`, `expenses`, `net`.

Updated via `applyDailyFinanceDelta()` — fire-and-forget from some writers, skipped by others. Rebuild exists: `rebuildTenantDailyFinance` from `LedgerEntry` (would **not** match live rollup if expenses only hit rollup and not `LedgerEntry`).

### 1.4 Contact balances

`Customer.totalSell*` / `totalAdvance` and `Supplier.totalPurchase*` are denormalized rollups refreshed after pay/sale — **not** derived from `LedgerEntry`.

---

## 2. Event → what gets written

### Sale (final invoice, not quotation/draft)

| Event | `Payment` | Cash txn | `LedgerEntry` | Daily rollup | Other |
|-------|-----------|----------|---------------|--------------|--------|
| Create final sale ₦100k + pay ₦40k | yes 40k | credit `sale_payment` 40k | **revenue 100k Sales** + **revenue 40k Customer Payment** | **+100k revenue only** (sale total) | Invoice, stock −qty, customer rollup |
| Later pay ₦30k | yes 30k | credit 30k | **revenue 30k Customer Payment** | **no delta** | sale `paymentStatus` |
| Edit final total | — | — | update sale-linked ledger amount | delta on revenue | invoice sync |
| Delete sale | soft-delete payments + cash txns | | soft-delete sale-linked ledger (payment-linked rows may remain) | −sale total revenue | stock restore |
| Sale return | — | **no cash refund txn** | **expense** Sales Returns | +expense | stock +qty, return sale doc |

Quotations / drafts: no stock, no sale ledger, no rollup.

### Purchase (inbound)

| Event | `Payment` | Cash txn | `LedgerEntry` | Daily rollup |
|-------|-----------|----------|---------------|--------------|
| Status → Received | — | — | **cost** Purchases (full PO) | +cost |
| `POST …/pay` | yes | debit `purchase_payment` | **cost** Supplier Payment | **no delta** |
| Supplier pay-due | yes (split) | debit | **cost** Supplier Payment | **no delta** |

### Expense

| Path | `Expense` row | Cash | `LedgerEntry` | Rollup |
|------|---------------|------|---------------|--------|
| Expenses UI `POST /expenses` | yes | debit if paid+account | **none created** | +expense |
| Finance bar `POST /ledger` (Add Expense modal) | **no** | **no** | expense row | +expense |
| Delete expense | soft-delete | reverse cash txns | soft-delete *if* linked rows exist | −expense |

Two different “add expense” buttons write **different books**.

### Payroll

Pay → `Payment` + cash **debit** `payroll` + invoice paid. **No `LedgerEntry`.** P&amp;L report reads payroll from the `Payroll` table separately.

### Till-only (no P&amp;L)

Opening balance, deposit, fund transfer between accounts.

---

## 3. How screens read money

| Screen | Source | Basis |
|--------|--------|--------|
| Finance KPIs | `GET /ledger/summary` → rollup if non-zero, else ledger `groupBy`, else **sum of non-draft sales** (includes quotations) | Mixed |
| Finance ledger table | `GET /ledger` → `LedgerEntry` rows | Shows sale totals **and** customer/supplier payment lines |
| Finance P&amp;L charts | `GET /ledger/charts` → ledger + helpers | Mixed |
| Finance Expenses tab | UI tab; ops expenses live on `/expenses` | `Expense` table |
| Report `profit-loss` | Sales totals + job totals + inbound JSON + stock valuation + ledger **expense** categories + payroll table | HQ6-style hybrid; **not** Finance KPIs |
| Report `expense` | **`Expense` table** (handler comment: match list rows) | Accrual expense docs |
| List Accounts / cash flow | `AccountTransaction` sums | Cash |
| Customer due | `Sale` − `Payment` / rollup columns | Accrual AR |
| Supplier due | purchase totals − payments / rollup | Accrual AP |
| Overview finance KPIs | `TenantDailyFinance` | Same as Finance rollup |

Outstanding on Finance = open sale balances in the **date window** (`due`/`partial`), not a balance-sheet all-time AP/AR view (all-time helper exists but is not what summary uses).

---

## 4. Findings (severity)

### P0 — Mixed accrual + cash in `LedgerEntry` (double-count in the ledger table)

Final sale posts **full invoice revenue**. Each payment posts **another revenue** line (“Customer Payment”). Same for purchases (full PO cost at Received + “Supplier Payment” cost on pay).

Example: ₦100k sale, ₦70k collected → ledger revenue **₦170k**; rollup/KPI revenue **₦100k**.

**Fix direction:** stop creating Customer/Supplier Payment `LedgerEntry` rows. Cash book alone should record collections/disbursements. Optionally a non-P&amp;L “cash movement” report from `AccountTransaction`.

### P0 — Two expense pipelines

| | Ops expense | Finance “Add Expense” |
|--|-------------|------------------------|
| API | `POST /expenses` | `POST /ledger` |
| Appears on Expenses list | yes | no |
| Appears on Finance ledger | no (no ledger row) | yes |
| Hits till | if paid + account | never |
| Hits rollup / Finance KPI costs | yes | yes |
| Hits P&amp;L “Total Expense” (ledger expense types) | **no** | yes |
| Hits report `expense` | yes | **no** |

Staff can “add an expense” in two places and get incompatible books.

**Fix direction:** Finance modal should call `POST /expenses` (or create both atomically). Always write `LedgerEntry` type `expense` linked to the `Expense` id when using ops expenses — **or** stop using `LedgerEntry` for expenses and point Finance + P&amp;L at `Expense`.

### P0 — Finance KPIs ≠ Finance ledger totals

Summary prefers `TenantDailyFinance`. Payment ledger lines are **not** rolled up. Ledger tab sums raw `LedgerEntry`. Users reconciling the two numbers will fail.

`addPayment` / purchase `pay` do not call `applyDailyFinanceDelta`. Sale delete reverses rollup for sale total only, not payment ledger lines (those lines may also not be soft-deleted — delete filters `linkedRecordType: 'sale'`).

### P1 — P&amp;L report is a third profit definition

[`buildProfitLossSummaryFromContext`](../../apps/api/src/modules/reports/aggregators/profitLossQueries.ts):

- Revenue = `computeSalesRevenueTotal` (**all sales with `status ≠ draft`**, including **quotations**) + job revenue  
- COGS ≈ reconstructed opening stock + inbound totals − closing stock + job direct cost  
- Expenses = `LedgerEntry` type expense (missing ops `Expense` rows; includes sales returns posted as expense)  
- Payroll = `Payroll` table, not ledger  
- Opening stock sale-price line uses a **heuristic** (`closing − purchase×1.1 + sales×0.1`)

VA job+sale can double-count revenue (job total + linked sale total).

Quotations inflating “Total Sales” is a live correctness bug.

### P1 — Payroll missing from Finance ledger / rollup

Paying payroll drains the till but does not post expense/cost to `LedgerEntry` or `TenantDailyFinance`. Finance net profit ignores wages; P&amp;L report includes them. Cash vs P&amp;L diverge.

### P1 — Sale returns don’t reverse cash

Return posts `LedgerEntry` expense “Sales Returns” and restocks. No automatic `Payment` refund / till debit. Customer rollup / AR may stay wrong unless handled elsewhere.

### P1 — `isInternalTransfer` unused on write

Flag + text markers exist for VAG group P&amp;L elimination. Requisition fulfill **does not** write ledger rows (stock only). Inbound Received still posts **Purchases** cost on the receiving tenant with `isInternalTransfer: false`. Group consolidation can double-count VW sale + VA/VISP sale of the same goods, and count internal inbound as external COGS.

AGENTS.md §13/15: elimination **deferred** — still true.

### P2 — Revenue fallback includes quotations

[`computeSalesRevenueTotal`](../../apps/api/src/common/utils/salesRevenue.ts): `status: { not: 'draft' }` — quotations included. Used when rollup revenue is 0 **and** as P&amp;L total sales.

### P2 — Outstanding is period-sliced AR only

Finance “Outstanding” is sales dated in the filter window with due/partial — not supplier AP, not all-time AR. Label implies a balance-sheet number.

### P2 — Rollup rebuild vs live writers

Live expenses update rollup **without** `LedgerEntry`. Rebuilding rollup from ledger would **drop** ops expenses and **keep** payment revenue lines — opposite of live KPI behavior.

### P2 — No AP outstanding on Finance

Supplier dues exist on supplier/purchase UIs only.

### P3 — Permissions

Manual ledger expense: manager+. Payment account deposit/transfer/close: manager+. Viewer is read-only on Finance (route-level). Matches AGENTS.md roughly.

### P3 — Invoices are documents, not the books

Invoice hub links/print. Payment status on invoices is updated in some paths (payroll) and inferred in others. Do not treat invoice totals as the GL.

---

## 5. Worked example (VA)

Sale ₦100,000 finalized, ₦40,000 at till, later ₦30,000.

| Store | After create | After 2nd pay | “Correct” accrual | “Correct” cash |
|-------|--------------|---------------|-------------------|----------------|
| Till Cash | +40k | +70k | n/a | +70k |
| Sale due | 60k | 30k | 30k due | n/a |
| Ledger Sales | 100k | 100k | 100k rev | — |
| Ledger Customer Payment | 40k | 70k | **should be 0** | 70k if cash P&amp;L |
| Finance KPI revenue (rollup) | 100k | 100k | 100k | 70k |
| Finance ledger Σ revenue | 140k | 170k | 100k | 70k |
| P&amp;L Total Sales | ~100k (+quotes/jobs) | same | 100k | 70k |

---

## 6. Target architecture (proposed)

1. **Document layer (accrual):** Sale / inbound Received / Expense / Payroll recognize P&amp;L once on finalize. One `LedgerEntry` (or stop using ledger and aggregate docs directly).  
2. **Cash layer:** `Payment` + `AccountTransaction` only. Never a second P&amp;L type.  
3. **Single expense API:** `Expense` is source of truth; Finance “Add Expense” creates an `Expense` (optional till debit).  
4. **Rollup** = projection of the chosen P&amp;L source only; rebuild must match writers.  
5. **Reports** consume the same summary helper as Finance KPIs.  
6. **VAG:** mark internal inbound/requisition costs `isInternalTransfer` and exclude from group net.  
7. **P&amp;L sales filter:** `status in (completed, refunded, partially_refunded, written_off)` — exclude quotation/draft. Decide whether returns reduce revenue or sit in expenses (pick one).

---

## 7. Suggested fix order

1. Stop payment `LedgerEntry` creates (sale pay, customer pay-due, purchase pay, supplier pay-due). Backfill: soft-delete category `Customer Payment` / `Supplier Payment`.  
2. Point Finance Add Expense at `POST /expenses`; write linked `LedgerEntry` from expense CRUD **or** switch P&amp;L expense line to `Expense` table everywhere.  
3. Exclude quotations from `computeSalesRevenueTotal`.  
4. Post payroll to expense ledger + rollup (or include `Payroll` in Finance summary explicitly).  
5. Align P&amp;L report revenue/COGS/expense with Finance summary helper.  
6. Sale return → optional refund payment / till debit.  
7. Tag internal transfers; VAG elimination.  
8. Rebuild `TenantDailyFinance` after backfill; add a reconciliation script (rollup vs sales vs ledger vs cash).

---

## 8. Key files

| Area | Path |
|------|------|
| Cash writer | `apps/api/src/common/utils/recordPaymentAccountTxn.ts` |
| Sale money | `apps/api/src/modules/sales/sales.service.ts` |
| Purchase money | `apps/api/src/modules/stock-movements/stock-movements.service.ts` |
| Expenses | `apps/api/src/modules/expenses/expenses.service.ts` |
| Ledger API | `apps/api/src/modules/ledger/ledger.service.ts` |
| Rollup | `apps/api/src/common/utils/dailyFinanceRollup.ts` |
| P&amp;L report | `apps/api/src/modules/reports/aggregators/profitLossQueries.ts` |
| Sales revenue fallback | `apps/api/src/common/utils/salesRevenue.ts` |
| Finance UI | `apps/web/components/pages/FinanceView.tsx` |
| Finance add expense | `apps/web/components/organisms/AddExpenseModal.tsx` → `createManualExpense` |

---

## 9. What this audit did not run

No live SQL reconciliation against production VA/VW totals (would need DB access and a dated window). Next empirical step: script comparing for `tenant_va_001` last 90 days:

- Σ final sale totals vs Σ ledger `Sales` vs rollup revenue vs P&amp;L Total Sales  
- Σ `Expense.totalAmount` vs Σ ledger type expense vs rollup expenses  
- Till balances vs Σ account txns  
- AR (sale due) vs Finance Outstanding  
