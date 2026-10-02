# Cafe POS UI Audit — cafe.vonosautos.com

Live-site walkthrough of the Cafe Ultimate POS so the Vonos Cafe module can be
implemented against real behaviour rather than guesswork.

| | |
|---|---|
| Site | `https://cafe.vonosautos.com` (Ultimate POS **v6.8**, "Vonos Cafe - V6.8") |
| Login used | `victoria` (cashier-level account) |
| Location | Vonos Cafe |
| Viewport | 1440 × 900 (Chrome, headful automation) |
| Date of run | 29 Sep 2026, ~12:24–12:45 WAT |
| Screenshots | `/var/folders/r0/z4z659xs5h58f7pmgjnjch5w0000gp/T/opencode/cafe-capture/` (60 PNGs + `02-pos-full.html` + `interactions*.json`) |

## 1. Test data created — needs cleanup

Interactions were deliberately non-destructive (no sale finalized, register not
closed, no expense submitted), with one exception: **the "Draft" button suspends
the sale instantly with no confirmation**, which created two real draft rows.

| Reference | Transaction id | Created | Contents | Status |
|---|---|---|---|---|
| `2026/0004` | 7384 | 29 Sep 2026 ~12:24 | Walk-In Customer, 1 × Salive(big) @ ₦1,500 | mine — please delete |
| `2026/0005` | 7385 | 29 Sep 2026 ~12:37 | Walk-In Customer, 1 × Salive(big) @ ₦1,500 | mine — please delete |
| `2026/0003` | — | 01 Sep 2026 | pre-existing | **not mine — leave alone** |

Drafts do not affect stock or finance (nothing is deducted until payment is
finalized), but they sit in `/sells/drafts`.

**There is no UI path to delete them as `victoria`:**
- `/sells/drafts` row menu = View / Edit / Print / Convert to Proforma — **no Delete**.
- `/pos/<id>/edit` (draft resume) footer = Draft / Card / Multiple Pay / Cash / Recent Transactions — **no Cancel/Delete**.
- POS "View Suspended Sales" list shows *no records* (see issue 5.1).

Cleanup options: delete `transactions` rows `id in (7384, 7385)` directly, or
re-run the flow with an account holding `sell.delete`.

## 2. Screen map — `/pos/create`

```
┌ top bar ────────────────────────────────────────────────────────────────────┐
│ Location: Vonos Cafe │ [09/29/2026 12:39 ▤] │ ⟲ ✖ ₦ ▤ ↺ 🧮 ⓘ │ [+ Add Expense] │
├ cart (left) ────────────────────────────────┬ product panel (right) ────────┤
│ [👤 Walk-In Customer ▾] [+]                 │ [ Category ]  [ Brands ]       │
│ [🔍 search product      ] [+]               │ ┌─────┬─────┬─────┬─────┐      │
│ Product │ Quantity │ Subtotal │ ✖           │ │ card│ card│ card│ card│      │
│ …cart rows…                                 │ └─────┴─────┴─────┴─────┘      │
│ Items / Total                               │  (name, SKU, "N Pc(s) in stock")│
│ Order Tax(+) ✎ / Shipping(+) ✎              │                                │
├ footer ─────────────────────────────────────┴────────────────────────────────┤
│ Draft  Card  [Multiple Pay]  [Cash]  [Cancel]   Total Payable: 0.00   [Recent Transactions] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Top-bar controls (all icons are `title`-only, no visible labels)

| id | title | behaviour |
|---|---|---|
| `close_register` | Close Register | modal "Current Register (17th Dec, 2025 08:17 AM – …)" → `closing_amount`, `total_card_slips`, `total_cheques`, `closing_note`, [Cancel] [Close Register] |
| `register_details` | Register Details | modal with register totals + [Print Mini] [Print Detailed] |
| `btnCalculator` | (no title) | **popover** calculator (AC CE % ÷ 7 8 9 × …), not a modal |
| `return_sale` | Sell Return | **popover**: input `Invoice No.` + [Send] (starts sell-return from an invoice) |
| `full_screen` | Press F11 to go Full Screen | fullscreen toggle |
| `view_suspended_sales` | View Suspended Sales | modal "Suspended Sales" → `GET /sells?suspended=1` |
| `add_expense` | Add Expense | modal "Add Expense" (see §4.7) |

### Cart panel

| Element | id / class | Notes |
|---|---|---|
| Customer select | `#customer_id` (select2) | default "Walk-In Customer"; `+` button = `.add_new_customer` → "Add Customer" modal |
| Product search | `#search_product` | placeholder "Enter Product name / SKU / Scan bar code"; typing hits `GET /sells/pos/get-product-suggestion?category_id=&brand_id=&location_id=1&page=1`; `+` opens `#configure_search_modal` ("Search products by" with 6 `search_fields[]` checkboxes) |
| Cart table | `#pos_table` | headers Product / Quantity / Subtotal / ✖ |
| Cart row | `.product_box` added → row with `-` / qty input / `+`, **unit dropdown** ("Pieces"), subtotal, red ✖ remove |
| Row edit/delete | icons inside row (`.fa-edit`, `.fa-times`) + per-line discount/subtotal edit | `46-row-delete.png`, `88-cart-row-hover.png` |
| Totals | `#total_discount`, `#pos-edit-discount` (✎), `#pos-edit-tax` (✎), shipping ✎ | Items / Total / Order Tax(+) / Shipping(+) |
| Hidden fields | `discount_type`, `discount_amount`, `rp_redeemed`, `rp_redeemed_amount` | serialized with the sale |

### Product panel

- `.product_box` cards: image, name, SKU in brackets, stock line (`11.00 Pc(s) in stock`).
- **Category** → right-side drawer (`label[for="my-drawer-4"]`): cards All Categories / Alcohol / Juices / Soft drinks / Yoghurt Drink; each has an `All` chip and `Next »` to page sub-categories.
- **Brands** → right-side drawer (`label[for="my-drawer-brand"]`).
- Cards with `0.00 Pc(s) in stock` are still clickable (e.g. chewing gum) — no client-side block.

### Footer actions

| Label | Selector | Behaviour |
|---|---|---|
| Draft | `#pos-draft` | `POST /pos` with `is_suspend=1` → toast "Draft added successfully", cart clears. **No confirmation.** |
| Card | `button.pos-express-finalize[data-pay_method="card"]` | express checkout — finalizes immediately |
| Multiple Pay | `#pos-finalize` | opens `#modal_payment` (see §4.6) |
| Cash | `button.pos-express-finalize[data-pay_method="cash"]` | express checkout — **finalizes immediately, no confirmation** |
| Cancel | `#pos-cancel` | clears the cart |
| Recent Transactions | `#recent-transactions` (target `#recent_transactions_modal`) | modal list; rows have Edit / Print |

> ⚠️ Cash and Card express buttons complete a real sale in one click (no
> confirmation step, no payment modal). They were **not** clicked during this
> audit for that reason.

### Keyboard shortcuts (bound in inline JS)

`shift+e` express cash checkout · `shift+c` cancel · `shift+d` draft ·
`shift+p` multiple pay · `shift+i` edit discount · `F11` fullscreen.

## 3. Interaction matrix

| Step | Control | Result | Evidence |
|---|---|---|---|
| 1 | Login (`#username`/`#password`, `button[type=submit]`) | → `/home`, "Home - Vonos Cafe" | `00-login.png`, `01-after-login.png` |
| 2 | POS entry (`Sell ▸ POS` → `/pos/create`) | full POS loads, `#search_product` ready | `02-pos-full.png`, `02-pos-full.html` |
| 3 | `close_register` | modal, not submitted | `10-close-register.png`, `78-close-register.png` |
| 4 | `register_details` | modal + print actions | `11-register-details.png`, `77-register-details.png` |
| 5 | `btnCalculator` | popover calculator | `12-calculator.png`, `76-calculator.png` |
| 6 | `return_sale` | popover "Invoice No." + Send | `13-sell-return.png`, `81-sell-return-popover.png` |
| 7 | `view_suspended_sales` | modal "Suspended Sales" → **No records found** | `14-suspended-sales.png`, `79-suspended-sales.png` |
| 8 | `add_expense` | modal (14 fields) | `15-add-expense.png`, `80-add-expense.png` |
| 9 | `full_screen` | toggles fullscreen | `17-full-screen.png` |
| 10 | customer select2 | dropdown of contacts | `20-customer-dropdown.png`, `86-customer-dropdown.png` |
| 11 | `.add_new_customer` | "Add Customer" modal (Gross/Opening balance) | `21-add-customer.png` |
| 12 | product search "salive" | suggestion dropdown | `22-search-products.png`, `87-search-results.png` |
| 13 | search `+` | `#configure_search_modal` (6 searchable fields) | `23-configure-search.png`, `84-configure-search.png` |
| 14 | product card click | row added, totals updated (₦1,500) | `30-cart-add-item.png`, `30-cart-row.html` |
| 15 | row hover / row icons | row tooling | `31-cart-row-tools.png`, `88-cart-row-hover.png`, `46-row-delete.png` |
| 16 | discount ✎ | `#posEditDiscountModal`: `discount_type_modal` (fixed/percentage) + `discount_amount_modal` + Update | `70-discount-modal.png` |
| 17 | order tax ✎ | `#posEditOrderTaxModal`: `order_tax_modal` select + Update | `71-order-tax-modal.png`, `32-order-tax.png` |
| 18 | shipping ✎ | `#posShippingModal`: details, address, charges, status, delivered to, delivery person + Update | `72-shipping-modal.png`, `34-shipping.png` |
| 19 | Draft | instant suspend + toast, cart cleared | `73-draft-confirm.png`, `93-suspended-after-draft.png` |
| 20 | Multiple Pay | `#modal_payment` (see §4.6), closed without finalizing | `74-multiple-pay-modal.png` |
| 21 | Recent Transactions | modal: "1. 6452 (ISAAC) 700.00 Edit Print", "2. 6451 (Walk-In Customer) 350.00 Edit Print" | `75-recent-transactions.png`, `91-recent-transactions-modal.png` |
| 22 | Category / Brands | right-side drawers | `82-category-drawer.png`, `83-brands-drawer.png` |
| 23 | quick add product (`.pos_add_quick_product`, `data-href=/products/quick_add`) | "Add new product" modal (name, SKU, barcode type, unit, brand, category, sub-category, enable stock, alert qty, locations, weight, description, **My Favorites**) | `85-quick-add-product.png`, `89-quick-add-modal-close.png` |

## 4. Flow detail

### 4.1 Add to cart
Click card → row appended with qty `1.00`, unit select, subtotal; totals
(`Items`, `Total`, `Total Payable`) recompute instantly, client-side. Cart state
is client-side until a write.

### 4.2 Cart row
`-` / qty input / `+` adjust quantity; unit dropdown per line; red ✖ removes the
line. Row also exposes per-line edit/subtotal controls.

### 4.3 Discount
`#posEditDiscountModal` → type (fixed|percentage) + amount, `Update`. Totals row
shows `(-)` discount with `#total_discount`. Hidden inputs `discount_type`,
`discount_amount` travel with the sale.

### 4.4 Order tax
`#posEditOrderTaxModal` → single select `order_tax_modal` (default "No tax") +
`Update`.

### 4.5 Shipping
`#posShippingModal` → Shipping Details, Shipping Address, Shipping Charges,
Shipping Status (select), Delivered To, Delivery Person (select) + `Update`.

### 4.6 Payment — `#modal_payment` ("Multiple Pay")
| Region | Fields |
|---|---|
| Header | Advance Balance: ₦ 0.00 |
| Payment row | `amount_0` (Amount*), `method_0` (Payment Method*, default Cash), `account_0` (Payment Account, e.g. `CASH PAYMENT RECEIVE (Balance: ₦61,478.49)`), `note_0` (Payment note) |
| Row actions | `#add-payment-row` "Add Payment Row" (split payments) |
| Notes | `#sale_note` (Sell note), `#staff_note` (Staff note) |
| Right summary | Total Items, Total Payable, Total Paying, Change Return, Balance |
| Footer | [Close] [Finalize Payment → `#pos-save`] |

Multi-method payments = repeated rows with method/account per row.

### 4.7 Add Expense — `#expense_modal`
`expense_location_id`, `expense_category_id`, `expense_sub_category_id`,
`expense_ref_no`, `expense_transaction_date`, `expense_for` (user),
`expense_tax_id`, `expense_final_total`, `expense_additional_notes`, plus a
payment row (`amount_0`, paid_on, `method_0`, `account_0`).

### 4.8 Draft / suspend
One click on `Draft` → `POST /pos` → draft row created, cart cleared. Drafts are
listed at **`/sells/drafts`** (date, Reference No, Customer, Contact, Location,
Total Items, Added By, Action). Nav also offers `Add Draft`
(`/sells/create?status=draft`).

### 4.9 Register
`Close Register` modal collects Total Cash / Total Card Slips / Total Cheques +
closing note; `Register Details` shows the open register window
(`17th Dec, 2025 08:17 AM – 29th Sep, 2026 12:38 PM`) with Print Mini / Print
Detailed.

## 5. Issues found

1. **"View Suspended Sales" is effectively broken/empty.** Immediately after a
   successful draft (`POST /pos` → "Draft added successfully"), the modal
   (`GET /sells?suspended=1`) still says *No records found*. Drafts only appear
   in the separate `/sells/drafts` page. Two different "draft" concepts or a
   filter bug.
2. **No way to delete a draft** from `/sells/drafts` (menu: View/Edit/Print/
   Convert to Proforma) or from draft resume (`/pos/<id>/edit` has no Cancel).
   Drafts accumulate with no UI cleanup path.
3. **Express Cash / Card finalize instantly**, with no confirmation dialog — a
   single mis-tap posts a real, paid sale.
4. **Draft has no confirmation** either, yet the button sits next to Cancel.
5. **`/sells/drafts` mixes dates oddly**: rows show `09/29/2026` for the two new
   drafts but `01/09/2026` for the pre-existing one (dd/mm vs mm/dd ambiguity).
6. **`/pos` (List POS) rendered 0 rows** while "Recent Transactions" listed sales
   6451/6452 — the list issues `GET /sells?…&start_date=2026-01-01&end_date=2026-12-31`,
   so anything outside the current calendar year is invisible by default.
7. **Out-of-stock products are clickable** (`0.00 Pc(s) in stock`) — no block or
   warning at add-to-cart time.
8. **Top-bar icons have no visible labels** (tooltip only) — poor discoverability.
9. `/suspended-sales` (as a page URL) is a 404 — only the POS modal + `/sells/drafts` exist.
10. Console noise: `CSRF token not found` logged on the POS page.

## 6. Implementation notes for the Vonos Cafe module

- The POS screen is a **single-page till**, outside our 3 templates: it is a
  two-pane layout (cart + product grid) with a fixed footer action bar, not a
  DataTable/Detail form. Model it as a dedicated `CafePosView` rather than
  forcing it into List/Detail.
- Reusable pieces we already have: StatusPill (payment/order status),
  DataTable (Recent Transactions, Drafts, Expenses lists), DetailTemplate
  (Expense, Customer, Quick-add product forms), EmptyState, currency formatting.
- Port order that matches observed behaviour:
  1. product grid + search + category/brand drawers (read-only, cheapest),
  2. cart (add/qty/unit/remove) with client-side totals,
  3. discount / order-tax / shipping modals,
  4. payment modal incl. multi-row split payments and payment accounts,
  5. draft/suspend + an actual **delete** action (fix issue 2 in our build),
  6. register open/close, expenses, quick-add product.
- Deliberate divergences to design in: confirm before cash/card finalize;
  single "suspend" concept with a resumable/deletable list; block or warn on
  zero-stock adds; show shortcut hints.
- Backing queries to mirror: `GET /sells/pos/get-product-suggestion`,
  `POST /pos` (create, `is_suspend` for draft), `GET /sells?suspended=1`,
  `GET /sells/drafts`, `GET /sells?…` (list), `GET /products/quick_add`.

## 7. Screenshot index (folder `.../cafe-capture/`)

`00-login` `01-after-login` `02-pos-full` · `10-close-register`
`11-register-details` `12-calculator` `13-sell-return` `14-suspended-sales`
`15-add-expense` `16-more-options` `17-full-screen` · `20-customer-dropdown`
`21-add-customer` `22-search-products` `23-configure-search` ·
`30-cart-add-item` `31-cart-row-tools` `34-shipping` · `70-discount-modal`
`71-order-tax-modal` `72-shipping-modal` `73-draft-confirm`
`74-multiple-pay-modal` `75-recent-transactions` `76-calculator`
`77-register-details` `78-close-register` `79-suspended-sales` `80-add-expense`
`81-sell-return-popover` `82-category-drawer` `83-brands-drawer`
`84-configure-search` `85-quick-add-product` `86-customer-dropdown`
`87-search-results` `88-cart-row-hover` · `90-suspended-sales-page`
`91-recent-transactions-modal` `92-pos-list` `93-suspended-after-draft`
`94-drafts-list` `95-actions-menu` `96-drafts-after-cleanup`
`97-draft-edit-cancel`.

Structured captures: `02-inventory.json`, `interactions.json`,
`interactions-2.json`, `interactions-3.json`, `30-cart-row.html`,
`02-pos-full.html`.

> The screenshots are **not** committed to the repo. Say the word and I'll copy
> them into `docs/audits/cafe-pos/` (≈9 MB for all 60) or just the 25 essential
> ones.
