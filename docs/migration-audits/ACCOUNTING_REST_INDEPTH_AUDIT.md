# In-depth audit — remaining money issues

**Date:** 2026-08-05  
Companion to [ACCOUNTING_FINANCE_AUDIT.md](./ACCOUNTING_FINANCE_AUDIT.md) (overview + payment double-count + quotes in P&amp;L helper).

This doc goes **issue by issue**: what the code does, what the user sees, why it’s wrong, how to fix.

---

## Issue A — Two “Add expense” paths

### What staff see

| Place | Button | API | Result |
|--------|--------|-----|--------|
| `/{code}/add-expense` | Save | `POST /expenses` | Row on **Expenses list**. Optional till debit if marked paid + account. Invoice created (async). **No `LedgerEntry`.** Daily rollup **+expense**. |
| Finance / top-bar modal | Add Expense | `POST /ledger` | **Only** a `LedgerEntry` type expense. **Not** on Expenses list. **No till move.** Rollup **+expense**. |

Frontend:

- Ops: [`AddExpenseView`](../../apps/web/components/pages/ExpensesViews.tsx) → `createExpense`
- Finance: [`AddExpenseModal`](../../apps/web/components/organisms/AddExpenseModal.tsx) → `createManualExpense` → `/ledger`

### Backend

- [`ExpensesService.createExpense`](../../apps/api/src/modules/expenses/expenses.service.ts): create `Expense`; `syncExpenseAccountDebit` if paid; `applyDailyFinanceDelta(..., 'expense')`; `ensureExpenseInvoice` fire-and-forget. **Zero `ledgerEntry.create`.**
- Update expense: syncs till + invoice + rollup delta. Still no ledger row.
- Delete expense: soft-deletes expense, cash txns, invoices, and *any* ledger rows linked as `expense`/`id` (usually none for ops expenses).
- [`LedgerService.createManual`](../../apps/api/src/modules/ledger/ledger.service.ts): ledger + rollup only. Type hardcoded `'expense'`.

### Downstream readers

| Reader | Sees ops expense? | Sees Finance-modal expense? |
|--------|-------------------|------------------------------|
| Expenses list / report `expense` | Yes (`Expense` table) | No |
| Finance ledger table | No | Yes |
| Finance KPI (rollup) | Yes | Yes |
| P&amp;L “Total Expense” | **No** (uses ledger expense types, skips payroll category) | Yes |

### Impact

- Bookkeeper using Expenses list misses Finance-modal costs.
- P&amp;L misses almost all HQ6-style ops expenses.
- KPI includes both, so KPI ≠ list ≠ P&amp;L.
- Paid ops expense leaves till; Finance-modal “expense” never touches cash — fake cash-out.

### Fix

One write path: `POST /expenses`. Finance modal must call that (account optional). On create/update/delete expense, upsert one `LedgerEntry` `{ type: expense, linkedRecordType: 'expense', linkedRecordId }` so ledger tab and P&amp;L match the list. Deprecate `POST /ledger` or make it a wrapper.

---

## Issue B — Finance KPI vs Finance ledger table

### KPI (`GET /ledger/summary`)

Order of operations in [`LedgerService.summary`](../../apps/api/src/modules/ledger/ledger.service.ts):

1. If `TenantDailyFinance` has any revenue/costs/expenses in the window → use it.  
   - `costs` KPI = rollup.costs **+** rollup.expenses.  
   - Outstanding overwritten from open sales in the **same date window**.
2. Else `LedgerEntry.groupBy(type)`.
3. If revenue still 0 → `computeSalesRevenueTotal` (non-draft sales, **includes quotations**).

Rollup writers (incomplete):

| Writer | Updates rollup? |
|--------|-----------------|
| Final sale create/update/delete | Revenue ± sale **total** |
| Sale return | +expense (return total) |
| Inbound Received | +cost (PO total) |
| Ops expense CRUD | ±expense amount |
| Manual `/ledger` expense | +expense |
| Sale/purchase **payment** | **No** |
| Payroll pay | **No** |
| Till deposit/transfer | **No** (correct — not P&amp;L) |

### Ledger table (`GET /ledger`)

Raw `LedgerEntry` rows: Sales (full invoice) + Customer Payment + Purchases + Supplier Payment + Finance-modal expenses + Sales Returns. **Not** ops `Expense` rows. **Not** payroll.

### Impact

Same page: top “Revenue 100k”, table sums to 170k after collections. “Costs” KPI includes ops expenses; table may not list them.

### Fix

KPI and table must share one query helper. After stopping payment ledger lines and linking ops expenses into ledger, rebuild rollup from that helper. Never fall back to quotations.

---

## Issue C — P&amp;L report is a third profit

[`buildProfitLossSummaryFromContext`](../../apps/api/src/modules/reports/aggregators/profitLossQueries.ts)

| P&amp;L line | Source | Problems |
|--------------|--------|----------|
| Total Sales | `computeSalesRevenueTotal` + job totals | Quotes included. Jobs without sales added; jobs *with* sales skipped in job loader (good) but quoteAmount used if invoiceAmount empty. |
| Total purchase | Sum inbound movement JSON (all statuses?) | Not “Received only” necessarily — `sumMovementValuesByType` sums typed movements in date window. Ordered-not-received POs can enter COGS. |
| Opening stock (purchase) | `closing − inbound + outbound` | Invented opening; not a dated snapshot. |
| Opening stock (sale price) | `closingSale − inbound×1.1 + sales×0.1` | Heuristic. Unusable for real accounts. |
| Total Expense | Ledger type expense except category containing “payroll” | Misses ops `Expense`. Includes Sales Returns (also counted again below). |
| Total Sell Return | Sum of return **Sale** rows | **Also** in Total Expense via Sales Returns ledger → **double subtraction** in netProfit. |
| Total Payroll | **All** `Payroll.netPay` in month window, **unpaid included** | Accrues wages not yet paid; Finance ignores paid wages. Opposite errors. |
| COGS | opening + purchase + transfer shipping − closing + job direct cost | Mix of stock identity and job costs. Purchase accounting, not sale-time COGS. |

Net profit:

```text
gross = Total Sales − COGS
net   = gross − ledgerExpenses − payroll − discounts − sellReturns
```

Sales Returns in ledgerExpenses **and** sellReturns → return amount removed twice.

### Fix

P&amp;L must call the same summary as Finance (post-cleanup). Opening stock = snapshot table or skip sale-price column. Payroll = paid-only or explicit accrual with a balance-sheet liability. Returns = either reduce revenue or one expense line, not both. Inbound COGS = Received only.

---

## Issue D — Payroll vs Finance

### Pay flow ([`HrmService`](../../apps/api/src/modules/hrm/hrm.service.ts) ~pay)

Per unpaid payroll row with `netPay > 0`:

1. Ensure payroll invoice  
2. `Payment` `paymentFor: 'payroll'`  
3. Till **debit** `subType: 'payroll'`  
4. Invoice + payroll → `paid`

No `LedgerEntry`. No `applyDailyFinanceDelta`.

### Readers

- Finance KPI / ledger: **invisible**  
- Till / account book: **visible** (cash down)  
- P&amp;L Total Payroll: **all netPay in period**, paid or not  

### Impact

Pay day: cash drops, Finance profit unchanged. P&amp;L can show wages before they’re paid (or after, if month filter ≠ pay date).

### Fix

On pay: `LedgerEntry` expense category `Payroll` linked to payroll/invoice + rollup +expense. P&amp;L payroll line = that ledger (or `paymentStatus = paid` only). Unpaid wages = optional accrual, separate from cash.

---

## Issue E — Returns / refunds

[`SalesService.createReturn`](../../apps/api/src/modules/sales/sales.service.ts)

Allowed only if original `status === 'completed'`. One return per original.

| Disposition | Stock | Cash / Payment | Original sale | Return sale | Ledger | Rollup |
|-------------|-------|----------------|---------------|-------------|--------|--------|
| `restocked` | **+qty** | none | **unchanged** (still completed, payments kept) | `partially_refunded`, `paymentStatus: paid`, `totalPaid = returnTotal` **with no Payment rows** | expense Sales Returns | +expense |
| `refunded` | **no restock** | **no till debit / no Payment isReturn** | unchanged | `refunded`, fake paid | same expense | +expense |
| `written_off` | no restock | none | unchanged | `written_off`, fake paid | same | +expense |

`Payment.isReturn` exists on the model but createReturn never sets it.

### Customer rollup

[`customerRollups.ts`](../../apps/api/src/common/utils/customerRollups.ts): return docs add `totalSellReturn` and are skipped for due. **Original sale still counts in totalSell + totalSellPaid.** Customer still looks fully paid on the invoice that was “refunded.” AR does not drop. Advance math (`paid − sell`) ignores that cash should go back.

### P&amp;L double hit

Return sale total ∈ `totalSellReturn`. Same amount ∈ ledger expense Sales Returns ∈ `totalExpense`. Net profit subtracts **both**.

### Invoice

Return gets its own invoice. Original invoice payment status not revised.

### Fix

Define three real outcomes:

1. **Restock + keep money** (credit note / store credit) → AR/advance up, stock +, no till.  
2. **Restock + refund till** → stock +, Payment `isReturn` + till debit, original `totalPaid`/status updated.  
3. **Write-off** → stock optional, no till, expense/write-off once.

Update original sale status. One P&amp;L treatment. Never mark return `paymentStatus: paid` without payments.

---

## Issue F — Outstanding / AR / AP

### Finance Outstanding

[`computeOutstandingReceivables`](../../apps/api/src/common/utils/outstandingReceivables.ts):

- Sales in **filter date window**  
- `status ≠ draft` (**quotations included** if due)  
- `paymentStatus in (due, partial)`  
- Amount = total − Σ payments  

Not all-time. Not suppliers. Group by-entity sets `outstanding: 0` always ([`groupLedger.ts`](../../apps/api/src/modules/ledger/groupLedger.ts)).

`syncSalePaymentStatus` updates sale `paymentStatus` + `totalPaid` + customer rollup. **Does not update `Invoice.paymentStatus`.** Invoice hub copies status at create/ensure time; later pays leave invoices stale.

### Supplier AP

[`supplierRollups`](../../apps/api/src/common/utils/supplierRollups.ts): movement line totals (or ledger fallback) vs payments. Includes movements not yet Received depending on filters. Finance never shows AP.

### Quotation AR risk

Provisional sales store `paymentStatus: 'due'`. Outstanding query does not exclude `quotation` → quotes can appear as customer debt on Finance.

### Fix

Outstanding KPI = all-time AR (helper already exists: `computeAllTimeOutstandingReceivables`) **or** relabel “Due on sales dated in range.” Exclude quotation/draft. Exclude return docs. Sync invoice payment status in `syncSalePaymentStatus`. Add AP KPI from supplier rollups (Received + unpaid only).

---

## Issue G — VAG / internal stock vs group profit

### What exists

- `LedgerEntry.isInternalTransfer` + text markers  
- Group ledger SQL excludes flagged/marker rows  
- Group summary often uses **per-tenant rollups summed** — rollups are **not** transfer-aware  

### What writes never set

Requisition fulfill: stock VW −qty / VA +qty + two `StockMovement` docs. **No ledger, flag stays false.**

Inbound Received on VA after external or internal stock: **Purchases** cost on receiving tenant.

Retail/VA sale of goods bought at VW:  
- VW already booked purchase cost (and maybe VW sale if they sold internally — they don’t; fulfill isn’t a VW sale)  
- Selling tenant books full sales revenue  
- Group = VW costs + VISP/VA revenue without eliminating internal cost/revenue pairing  

Cross-tenant sale line can decrement **VW** `Item` while revenue hits **VISP** ledger — group revenue at VISP, inventory hole at VW, VW purchase still in VW costs.

Mirrored job+sale revenue: [`EXCLUDE_MIRRORED_JOB_SALE_REVENUE_SQL`](../../apps/api/src/common/utils/ledgerRevenueDedupe.ts) dedupes migrated job vs sale ledger twins. Live `loadJobReportContext` skips jobs that already have a sale. Live posting generally one sale ledger — OK for new data. Rollup still has full sale revenue only (good) but group rollup sum ignores elimination SQL.

### Fix

On requisition fulfill: either no P&amp;L on either side, or VW `cost` internal + VA `cost` internal both flagged `isInternalTransfer`. Group KPIs must use elimination SQL (or a consolidation table), not naive rollup sum. Cross-tenant POS sale: policy — bill VW as internal sale or only decrement VW stock with flagged entries.

---

## Issue H — Sale delete vs payment ledger orphans

[`SalesService.remove`](../../apps/api/src/modules/sales/sales.service.ts):

- Soft-deletes payments + account txns + invoices  
- Soft-deletes ledger where `linkedRecordType = 'sale'` and `linkedRecordId = sale.id`  
- **Does not** delete ledger where `linkedRecordType = 'payment'` (Customer Payment lines)  
- Rollup −sale total only  

Deleted sale: till restored (txn soft-deleted), KPI revenue reduced, **payment revenue lines remain on ledger table**.

Same class of bug on the payment double-count issue.

### Fix

When deleting a sale, soft-delete all ledger rows linked to that sale **or** to its payment ids. Reverse rollup consistently (only sale total if payments never hit rollup).

---

## Issue I — Invoice status drift

- Sale pay → sale.paymentStatus updated; **invoice.paymentStatus not**  
- Purchase pay → movement.paymentStatus updated; invoice updated only if `ensurePurchaseInvoice` runs again  
- Expense / payroll invoices updated more carefully on their own paths  

Printable invoice can say Due after till shows Paid.

### Fix

`syncSalePaymentStatus` / purchase pay should `invoice.updateMany({ paymentStatus })` for linked invoices.

---

## Issue J — Tax, discount, advances (depth)

- Sale total usually **includes** tax + after discount. One ledger “Sales” amount. No VAT output / input accounts. Cannot file VAT from Vonos.  
- P&amp;L lists Total Sell discount from `Sale.discountAmount` **and** revenue already net of discount if total is net — risk of double-counting discount.  
- `Customer.totalAdvance` = max(0, paid − sell) across non-return sales. Overpay sits only on the contact, not as a liability ledger. Finance Outstanding uses sale due, not advances.

---

## Issue K — COGS vs purchases (depth)

Stock qty moves on sale; **P&amp;L does not post COGS** (`qty × item.costPrice`) at sale time. Cost hits at inbound Received (full PO).

Effects:

- Month you buy heavy / sell light: profit looks worse.  
- Month you sell old stock: profit looks better (cost already taken earlier).  
- Group + multi-entity amplify this.

This is a **policy** choice (HQ6 purchase accounting) but it is undocumented and mixed with job directCost in the same P&amp;L.

---

## Simple map (all issues)

```text
Quotes          → not real sales in POS; one report still adds them
Payments        → till OK; ledger income counted twice
Expenses        → two buttons, two books
Finance page    → top ≠ table
P&L report      → third math; returns & unpaid payroll wrong
Salaries        → cash yes, Finance profit no
Returns         → stock sometimes; money almost never; original sale stuck
Outstanding     → period AR only; quotes can look like debt; invoices stale
VAG             → internal stock moves not stripped from group profit
Delete sale     → payment ledger lines can remain
Tax/discount    → mashed into one number
```

---

## Implementation order (unchanged, now with evidence)

1. Stop payment `LedgerEntry`; cascade-delete them on sale delete; backfill.  
2. Finance modal → `POST /expenses` + ledger sync on expense CRUD.  
3. Exclude `quotation` everywhere revenue/AR is computed.  
4. Payroll → expense ledger + rollup on pay; P&amp;L paid-only.  
5. Returns: real refund/restock/write-off; one P&amp;L hit; update original sale.  
6. Sync invoice paymentStatus; relabel or all-time Outstanding; add AP.  
7. Internal transfer flags + group KPI not naive rollup sum.  
8. Single `financeSummary()` used by Finance + P&amp;L + overview.  
