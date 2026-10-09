# Cafe POS Flow Map — cafe.vonosautos.com (`/pos/create`)

Derived from the evidence in `docs/audits/cafe-pos/` (re-captured 8 Oct 2026;
draft-creation and express-finalize behaviours carried over from the 29 Sep
run — see `docs/CAFE_POS_UI_AUDIT.md` §1). Element ids are the real DOM ids;
endpoints are the observed network calls.

```
Legend: [screen/modal] --action--> (endpoint) --> [result]
```

## F0 — Register session

```
login (/login, #username/#password)
  --> /home
  --> open Sell ▸ POS (/pos/create)
        │
        ├─ register OPEN  → full till (top bar, cart, grid, footer)
        └─ register CLOSED → till prompts to open (not observed; register was open)
```

- `#register_details` → `.register_details_modal` ("Register Details (17th Dec, 2025 … – …)") with [Print Mini] [Print Detailed].
- `#close_register` → "Current Register" modal: Total Cash, Total Card Slips, Total Cheques, Closing Note → [Close Register] (not submitted in audit).
- Register window observed: 17th Dec 2025 → 8th Oct 2026 (long-open register).

## F1 — New sale (happy path)

```
[pos screen]
  1. customer = #customer_id (default "Walk-In Customer")      [F4]
  2. add lines: click .product_box  OR  search #search_product [F5]
  3. per-line: qty −/+ , unit select, ✖ remove                 [F2]
  4. adjustments: discount ✎ / order-tax ✎ / shipping ✎        [F3]
  5. pay:
  │    ├─ Cash   → instant finalize (no confirm)               [F7a] ⚠️
  │    ├─ Card   → instant finalize (no confirm)               [F7a] ⚠️
  │    └─ Multiple Pay (#pos-finalize) → #modal_payment → [Finalize Payment → #pos-save]  [F7b]
  6. (post-sale: receipt/print — never reached in audit)
```

Cart totals (`Items`, `Total`, `Total Payable`) recompute client-side on every
change. Sale serializes hidden inputs too (`discount_type`, `discount_amount`,
`rp_redeemed`, `rp_redeemed_amount`).

## F2 — Cart line operations (`#pos_table`)

| Action | Control | Effect |
|---|---|---|
| Change qty | `−` / qty input / `+` | line subtotal + totals update |
| Change unit | unit `<select>` per row ("Pieces") | price basis changes |
| Remove line | red ✖ | row removed, totals update |
| Per-line edit | row icons (`.fa-edit`, `.fa-times`) | price/discount tooling (see `31-cart-row-tools.png`, `30-cart-row.html`) |
| Clear all | `#pos-cancel` (footer Cancel) | empties cart |

## F3 — Adjustments (totals row)

```
discount ✎ (#pos-edit-discount) ──→ #posEditDiscountModal
    { discount_type_modal: fixed|percentage, discount_amount_modal } → [Update]
    → #total_discount shown as "(−)"; hidden discount_type/discount_amount set

order-tax ✎ (#pos-edit-tax) ──→ #posEditOrderTaxModal
    { order_tax_modal: select, default "No tax" } → [Update]

shipping ✎ ([data-target="#posShippingModal"]) ──→ #posShippingModal
    { shipping_details_modal, shipping_address_modal, shipping_charges_modal,
      shipping_status_modal, delivered_to_modal, delivery_person_modal } → [Update]
```

## F4 — Customer

```
#customer_id (select2, default Walk-In)
  ├─ pick existing contact
  └─ [+] .add_new_customer ──→ "Add a new contact" modal (.contact_modal)
        { contact fields, opening balance } → [Save] → selected
```

## F5 — Product discovery

```
grid: .product_box cards (image, name, (SKU), "N Pc(s) in stock")
  ├─ click card → line added (even at 0.00 in stock — no block)
  ├─ #search_product typing ──→ GET /sells/pos/get-product-suggestion?category_id=&brand_id=&location_id=1&page=1
  │     → suggestion dropdown
  ├─ [+] ──→ #configure_search_modal ("Search products by", 6× search_fields[]) 
  ├─ Category button ──→ right drawer (label[for="my-drawer-4"]):
  │     cards All Categories / Alcohol / Juices / Soft drinks / Yoghurt Drink,
  │     each with All chip + "Next »" sub-category paging
  └─ Brands button ──→ right drawer (label[for="my-drawer-brand"])
```

## F6 — Draft / suspend / resume

```
footer Draft (#pos-draft)
  ──→ POST /pos { …, is_suspend: 1 } ──→ toast "Draft added successfully", cart cleared
  ──→ listed at /sells/drafts (Date, Reference No e.g. 2026/0005, Customer, …)
  ──→ resume via row Action ▸ Edit → /pos/<id>/edit (full till prefilled)
  ──→ then F1 from step 2, or F7 to finalize

⚠️ No confirmation before suspend. No delete action anywhere (list menu =
View/Edit/Print/Convert to Proforma; resume page has no Cancel).
⚠️ POS "View Suspended Sales" (GET /sells?suspended=1) shows "No records found"
even right after a draft — drafts live only on /sells/drafts.
```

## F7 — Payment

### F7a — Express (Cash / Card)

```
button.pos-express-finalize[data-pay_method="cash"|"card"]
  ──→ finalize immediately (title: "Mark complete paid & checkout")
  ──→ NO confirmation, NO modal. Shortcuts: shift+e (cash).
```

### F7b — Multiple Pay (`#pos-finalize` → `#modal_payment` "Payment")

```
header: Advance Balance: ₦ 0.00
per row i: amount_i (Amount*, prefilled with balance),
           method_i (Advance|Cash|Card|Cheque|Bank Transfer|Other…),
           account_i (Payment Account w/ live balance, e.g. CASH PAYMENT RECEIVE 61,478.49),
           note_i (Payment note)
[Add Payment Row] → appends row (split payment)
sale_note (Sell note), staff_note (Staff note)
right rail: Total Items, Total Payable, Total Paying, Change Return, Balance
[Close] → discard  |  [Finalize Payment → #pos-save] → POST /pos → sale + payments
```

Card-method extra fields exist in DOM (`#card_details_modal` ids:
`card_number_0`, `card_holder_name_0`, `card_month_0`…) — shown when method=card
(not exercised; needs a non-destructive check).

## F8 — Post-sale

```
#recent-transactions ──→ #recent_transactions_modal
    rows: "6452 (ISAAC) 700.00 [Edit] [Print]" … (today's sales)
Sell ▸ List POS (/pos) ──→ GET /sells?…&is_direct_sale=0&start_date=2026-01-01&end_date=2026-12-31
    columns: Action, Date, Invoice No., Customer, Contact, Location,
    Payment Status, Payment Method, Total amount, Total paid, Sell Due,
    Sell Return Due, Shipping Status, Total Items, Added By, Sell note, Staff note, …
return_sale (#return_sale) ──→ popover { Invoice No. input + [Send] }
    → starts sell-return against an invoice (target flow not submitted in audit)
```

## F9 — Register close

```
#close_register ──→ "Current Register" modal
    { closing_amount (Total Cash), total_card_slips, total_cheques, closing_note }
    → [Close Register] (not submitted) | [Cancel]
```

## F10 — Expense from till

```
#add_expense ──→ #expense_modal "Add Expense"
    { expense_location_id, expense_category_id, expense_sub_category_id,
      expense_ref_no, expense_transaction_date, expense_for (user),
      expense_tax_id, expense_final_total, expense_additional_notes,
      payment row: amount_0, paid_on, method_0, account_0 }
    → [Save] (not submitted in audit)
```

## F11 — Quick-add product

```
.pos_add_quick_product (data-href=/products/quick_add) ──→ "Add new product" modal
    { name, sku, barcode_type, unit_id, brand_id, category_id, sub_category_id,
      enable_stock, alert_quantity, product_locations, weight,
      product_description, [My Favorites] }
    → [Save] (not submitted in audit)
```

## Endpoint inventory (observed)

| Method | Endpoint | Used by |
|---|---|---|
| GET | `/sells/pos/get-product-suggestion?category_id=&brand_id=&location_id=1&page=1` | search + grid |
| POST | `/pos` | create sale; draft when `is_suspend=1` |
| GET | `/sells?suspended=1` | suspended-sales modal (returns empty) |
| GET | `/sells?…&is_direct_sale=0&start_date=&end_date=` | List POS DataTable |
| GET | `/sells/drafts` | drafts page |
| GET | `/sells/create?status=draft` | Add Draft |
| GET | `/products/quick_add` | quick-add modal body |
| (nav) | `/pos/<id>/edit` | draft resume |
| (nav) | `/sells/convert-to-proforma/<id>` | drafts action |

## Not verified (deliberately not executed)

Finalize receipt/print screen; card-method fields inside the payment modal;
expense submit; register close submit; sell-return submit; quick-add save;
customer save; anything under Cash/Card express buttons.
