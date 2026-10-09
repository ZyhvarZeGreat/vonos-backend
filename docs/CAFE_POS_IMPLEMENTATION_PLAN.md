# Cafe POS Implementation Plan (VC)

Build the Vonos Cafe till from the audited UPOS behaviour
(`docs/CAFE_POS_UI_AUDIT.md`, flows in `docs/CAFE_POS_FLOW_MAP.md`, evidence in
`docs/audits/cafe-pos/`). Cafe is **Transaction-centric** (AGENTS.md §4): the
core atom is the Sale/Order.

## 0. What already exists — do not rebuild

| Layer | Existing | Reuse for |
|---|---|---|
| Backend `sales` | CRUD, `:id/payments` (add/edit/delete), `:id/finalize`, `:id/return`, `PATCH :id/shipping`, invoice/track URLs | F1, F6, F7b, F8 flows |
| Backend `payments`, `payment-accounts` | accounts + payments | F7 account select w/ balance |
| Backend `expenses`, `customers`, `discounts` | CRUD | F10, F4, F3 |
| Backend `items`/`catalog`, `cafe-tables` | catalog + tables | F5, table management |
| Frontend `components/upos/*` | AppShell, Sidebar, Header, FiltersPanel, DataTablesShell, NavTabs | POS chrome + list pages |
| Frontend patterns | Hq6 modals, DataTable, EmptyState, `formatCurrency` | all dialogs/lists |

No dedicated Cafe POS route exists in `apps/web` yet — the till itself is greenfield.

## 1. Divergences from UPOS (decided, from audit issues)

1. **Confirm before money moves**: Cash/Card express finalize and Draft all get
   explicit confirm dialogs (audit issues 2–4).
2. **One suspend concept**: drafts live in one resumable list that also
   surfaces in the POS ("Suspended" button shows the real count/list) — fixes
   the broken `/sells?suspended=1` split.
3. **Drafts are deletable** (with `sell.delete`-gated action) — fixes issue 2.
4. **Zero-stock adds warn/block** (configurable per tenant; default warn) —
   fixes issue 7.
5. **Labeled icon buttons** with shortcut hints (`shift+e` etc. kept) — issue 8.
6. Keep UPOS semantics otherwise: client-side cart, multi-row split payments,
   change-return math, advance balance display, sell/staff notes.

## 2. Scope

**In:** till screen (cart + grid + footer), customer select/quick-add, search +
category/brand drawers, discount/tax/shipping modals, payment modal (split
payments), draft/suspend/resume/delete, express finalize (with confirm),
recent transactions, sell return from invoice no., expense-from-till,
quick-add product, register open/close + details, calculator, AGENTS.md
Cafe extras (modifier editor, Kitchen Display kanban, Table Management,
Daily Closeout).
**Out:** receipt printer integration v1 (show printable invoice view, print via
browser), offline mode, weighing-scale integration, loyalty/RP redemption
(hidden `rp_redeemed` fields exist in UPOS — park for phase 4).

## 3. Phases

### Phase 1 — Read-only till (no writes) — ✅ DONE
- Product grid + search wiring, search, category/brand drawers, product cards with stock line.
- Cart client state (Zustand): add/qty/unit/remove, totals math (`lib/pos/posTotals.ts`, mirrors `saleTotals.ts`).
- Customer select (read-only list) + totals footer.
- **Accept:** grid/search/drawers match audit screenshots; cart math unit-tested
  (12 tests) incl. percent discount, order tax, shipping.

Delivered: `components/pages/pos/{CafePosView,PosCartPanel,PosProductGrid,PosFilterDrawer}.tsx`,
`lib/pos/posTotals.ts` (+ spec), `stores/posCartStore.ts`, `styles/cafe-pos.css`;
VC `pos-terminal` route now renders the Cafe till (was the HQ6 stub).

> **CSS gotcha (applies to Phases 2–4):** HQ6 shells inject the static UPOS
> stylesheet, which contains **unlayered** rules that beat Tailwind's
> `@layer utilities`:
> - `button { background: transparent; padding: 0 }` → `bg-*` on a `<button>` renders transparent.
> - `button, input, select, textarea { padding: 0 }` → input padding lost.
> - a legacy pixel scale redefines some unprefixed utilities: `.p-4 { 4px }`,
>   `.m-2 { 2px }`, `.text-sm { 12px }`, … (`px-4`, `gap-3`, `rounded-lg` are fine).
>
> Style the till with the classes in `styles/cafe-pos.css` (`cafe-pos-btn--*`,
> `cafe-pos-icon-btn`, `cafe-pos-product`, `cafe-pos-tile`, `cafe-pos-chip`,
> `cafe-pos-panel`, `cafe-pos-toolbar`, `cafe-pos-footerbar`, `cafe-pos-input`,
> `cafe-pos-grid-scroll`) instead of unprefixed `bg-*`/`p-*`/`m-*` utilities.

### Phase 2 — Sale completion — ✅ DONE
- Payment modal (`PosPaymentModal`): amount/method/account/note rows, Add Payment
  Row, change-return/balance rail, sell/staff notes → `POST /sales`.
- Express **Cash / Card** with a confirm dialog (`PosConfirmModal`).
- **Draft/suspend** → `POST /sales` with `status: "draft"` (skips stock + ledger).
- Recent Transactions modal (`GET /sales`) with per-row Print (invoice URL).
- **Accept:** full path in dev DB — verified `POST /sales → 201`
  (`2026/4842`, ₦600, `Completed`/`paid`) and draft → `recordStatus: "draft"`;
  test rows deleted afterwards.

Delivered: `components/pages/pos/{PosModal,PosPaymentModal,PosConfirmModal,PosRecentTransactions}.tsx`
+mutation wiring in `CafePosView.tsx`; reuses `lib/api/sales.ts`
(`createSale`, `getSaleInvoiceUrl`) and our own NestJS `sales` module — no UPOS
dependency.

### Phase 3 — Drafts + adjustments + returns — ✅ DONE (returns deferred)
- Draft/suspend: `Draft` (confirm) → `POST /sales` `status:"draft"`; **Drafts** button
  opens Suspended Sales with **Resume** (loads lines into the ticket, deletes the
  draft) and **Delete**.
- Discount / order-tax modals (fixed or percent) in the cart totals → sent as
  `discountAmount` / `taxAmount`.
- Sell return from invoice no. — **deferred to Phase 3b** (`POST /sales/:id/return`
  exists; needs the return UI + `saleReturnStatus` vocabulary).
- Shipping charges — **still deferred**: `CreateSaleRequest`/`Sale` have no
  shipping amount field. Low value for a cafe till (no delivery); would need a
  `Sale.shippingAmount` column + total math. The till shows shipping read-only
  with a tooltip explaining why.
- **Accept:** verified in dev DB — discount ₦600→₦540, tax →₦567, draft saved,
  drafts listed, resume restored the ticket. Test rows removed; the migrated draft
  the resume test consumed was restored.

Delivered: `PosAdjustmentModal.tsx`, `PosDraftsModal.tsx`, `loadCart` in
`posCartStore`, editable totals rows in `PosCartPanel`, wiring in `CafePosView`.

> Note: resuming a draft deletes it (UPOS semantics). If a resumed ticket is then
> cancelled, the draft is gone — acceptable, but revisit if cashiers rely on it.

### Phase 4 — Till operations + Cafe extras — ✅ DONE (register deferred)
- **Calculator** popover (top bar) — digits/operators only, no `eval`.
- **Quick-add product** modal (`+ Product`) → `POST /items`; refreshes the grid.
- **Expense-from-till** modal (`Add Expense`) → `POST /expenses` with category,
  amount, method, payment account, reference, note.
- **Register open/close** — ✅ DONE: `CashRegister` model + `cash-register`
  module (`open`/`close`/`current`/history), migration `20261008120000_cash_register`,
  and `PosRegisterModal` (open with cash-in-hand; close with expected-vs-counted
  cash, card slips, cheques, note). The till now **requires an open register**
  before taking payment.
- Cafe extras (modifiers, Kitchen Display, Table Management, Daily Closeout) were
  already present as platform pages (`menu-items`, `kitchen`, `tables`) — POS-side
  wiring, not new builds.
- **Accept:** verified in browser — calculator computes, both modals open and
  render with no console errors; no writes were submitted.

**Polish landed after Phase 4:**
- Payment modal captures **card number / holder / expiry / CVV** when the method
  is Card; they are folded into the payment note (`Card ****1234, Holder: …`),
  so no schema change is needed.
- **Zero-stock products are blocked** at add-to-cart (toast) on top of the card
  warning.
- **Register enforcement**: payment buttons are disabled and checkout throws until
  a register is open.
- **Payroll race fixed** (`PayrollGroupCreatePage`): salary defaults now seed
  per-employee and never overwrite a draft the user has already edited — the
  cause of "adding deductions/earnings doesn't reflect".

> **Automation gotcha:** `apps/web/middleware.ts` blocks headless browsers
> (`headlesschrome`/`playwright`/`puppeteer` in `BOT_RE`) with a 404. Playwright
> runs against this app must send a normal Chrome `userAgent` (or run headed),
> or every app route 404s.

Delivered: `PosCalculator.tsx`, `PosQuickAddProductModal.tsx`,
`PosExpenseModal.tsx`, `.cafe-pos` scoping class, top-bar wiring in `CafePosView`.

> Top-bar naming collision: the HQ6 shell also has "Calculator" / "Add Expense"
> buttons, so the till root carries `.cafe-pos` and tests scope to it.

### Phase 5 — Cutover
- Cafe is a **new build, no migration** (AGENTS.md §1): seed catalog from the
  live UPOS via export, train `victoria` (cashier) + manager, run parallel
  (paper/UPOS) for one week, then switch. Keep UPOS read-only for 30 days.

## 4. Frontend work items

- `apps/web/.../cafe/pos/page.tsx` → `CafePosView` (dedicated till layout, not
  List/Detail): `PosCartPanel`, `PosProductGrid`, `PosFooterBar`.
- Dialogs: `PosPaymentModal` (split rows), `PosDiscountModal`,
  `PosOrderTaxModal`, `PosShippingModal`, `PosExpenseModal`,
  `PosQuickAddProductModal`, `PosCustomerModal`, `PosSuspendedList`,
  `PosRecentTxns`, `PosRegisterModals`, `PosConfirmFinalize`.
- Drawers: `PosCategoryDrawer`, `PosBrandDrawer` (right-side, checkbox/chip
  filters + `Next »` paging).
- State: `posCartStore` (Zustand) — lines, customer, adjustments; totals via
  shared `saleTotals`-style helpers so web and API agree.
- Data: React Query everywhere; `register` + `drafts` queries; ⌘K search shape
  already generic (AGENTS.md §9).

## 5. Backend work items

- Audit `sales` create/finalize against F1/F7 payloads (multi-payment rows,
  change return, advance balance, sell/staff notes); add `is_suspend`-style
  draft status + resume + **delete draft** endpoints (gap vs UPOS).
- Suspended-sales query must return drafts (the live UPOS bug must not be
  ported — add a regression test).
- Register session endpoints (open/close/details/totals) if not covered by
  existing modules; confirm shift/endpoints for `payment-accounts` balances.
- Product suggestion endpoint (search + category/brand + stock) for location VC.
- Permissions: cashier (`victoria`-level) can sell/draft but not delete drafts,
  close register, or edit prices — map to role matrix (AGENTS.md §12).

## 6. Testing

- Unit: cart math (discount fixed/%, tax, shipping, split-pay tendered/change).
- Contract: sale create/finalize payloads vs backend; suspended-list non-empty
  after draft.
- E2E (Playwright, staging only): replay the audit's `capture.cjs` steps as a
  regression suite — it already encodes selectors, waits, and modal inventories.
- UAT with `victoria` on staging before cutover.

## 7. Open questions

1. Receipt: browser-print invoice view enough for v1, or hardware printer needed day one?
2. `card_details_modal` fields (card no./holder/expiry) — shown inline when method=card in Multiple Pay? (not exercised — verify on staging UPOS or decide fresh).
3. Table Management + modifiers: not present in the audited install — design from AGENTS.md §14 or re-audit a site that uses them?
4. Advance Balance / customer credit: support in v1?
5. Change-return account handling for over-tender.
6. Weighing-scale + barcode-scanner hardware: in scope for v1?
7. The two leftover test drafts (transactions 7384/7385, refs 2026/0004–0005) — delete before/after cutover seed?
