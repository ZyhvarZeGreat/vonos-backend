# VM — Field-Level Migration Map

> **Superseded** by [VA_MIGRATION_MAP.md](./VA_MIGRATION_MAP.md) — VM merged into Vonos Automotive (`VA`).

**Target entity:** Vonos Mechanics (`VM`, tenant code `VM`, seed id `tenant_vm_001`)  
**Canonical source:** `vonomglk_Quotation` in `localhost.sql`  
**Audit reference:** [VM_AUDIT.md](./VM_AUDIT.md)  
**Archetype:** job-centric (+ vehicle link deferred to schema extension)

---

## 1. Scope

### In scope (VM v1)

| Source table(s) | Vonos target |
|---|---|
| `products`, `variations`, `variation_location_details`, `categories` | `Item` (parts catalog; low priority qty) |
| `contacts` (customer) | `Customer` |
| `contacts` (supplier) | `Supplier` |
| `transactions` (job candidates — see §5) | `Job` |
| `transaction_sell_lines` | `JobMaterial` |
| `transactions` (`type = sell`, `status = final`) | `LedgerEntry` (revenue) per job |
| `transactions` (`type = expense`, `payroll`) | `LedgerEntry` (expense) |
| All migrated entities | `MigrationLegacyId` |

### Job candidate filter (VM v1)

Import row as `Job` when **any**:

- `transactions.type = 'sell'` AND `status IN ('final', 'received')`, OR
- `is_quotation = 1`, OR
- `sub_status IN ('quotation', 'proforma')`

Skip: `opening_stock`, `purchase`, `sell_transfer`, `purchase_transfer`, `stock_adjustment` (inventory ops — not job records v1).

### Out of scope

| Source | Reason |
|---|---|
| `transaction_sell_lines_purchase_lines` | 3.8M FIFO rows — skip |
| `users`, `oauth_*`, `essentials_*` | Re-invite / HR |
| **Vehicle registry** | No `Vehicle` Prisma model yet — store plate/VIN in `Job.description` + `customerName` v1; `vehicleId` null |
| `expense_refund` | 1 row — manual review |

---

## 2. Import order

1. `Tenant` (`code: VM`, `archetype: job`).
2. **Customers** + **Suppliers**.
3. **Items** (parts catalog; `availableForRetail: false`).
4. **Jobs** from filtered transactions.
5. **JobMaterial** from sell lines linked to job transactions.
6. **LedgerEntry** (revenue per completed job; expenses separately).
7. **MigrationLegacyId**.

---

## 3. ID strategy

| `entityType` | Legacy key |
|---|---|
| `customer` | `contacts.id` |
| `supplier` | `contacts.id` |
| `item` | `variations.id` |
| `job` | `transactions.id` |

---

## 4. Job status mapping (adaptive stepper)

| Ultimate POS signal | Vonos `Job.status` |
|---|---|
| `is_quotation = 1` OR `sub_status = quotation` | `Quoted` |
| `sub_status = proforma` | `Quoted` |
| `status = received` | `Received` |
| `status = final` AND `payment_status = paid` | `Delivered` |
| `status = final` (other) | `In Progress` |
| `status = draft` | Skip v1 |

`hasQuote`: true when `is_quotation = 1` or `sub_status` in (`quotation`, `proforma`).  
`quoteAmount`: `final_total` when quoted.

| Source field | Target `Job` | Rule |
|---|---|---|
| `invoice_no` / `ref_no` | `reference` | Unique per tenant |
| `contact_id` | `customerName` | Via customer map name |
| `additional_notes` + shipping | `description` | Concat; include vehicle hints from `shipping_details` |
| `final_total` | `quoteAmount` | When quoted |
| `transaction_date` | `createdAt` proxy / `dueDate` | Parse datetime |

**Expected jobs:** ~6,570 sell + 88 quotation sub_status (dedupe overlaps).

---

## 5. JobMaterial mapping

Join `transaction_sell_lines` → job `transactions.id`.

| Source | Target | Rule |
|---|---|---|
| `variation_id` | `itemId` | Via legacy map |
| product/variation name | `name` | Denormalized |
| `quantity` | `quantity` | Decimal |
| `unit_price_inc_tax` | `unitCost` | Decimal |
| qty × unit | `totalCost` | Computed |
| — | `source` | `"legacy_pos"` |

---

## 6. Ledger mapping

| Source | Target | Rule |
|---|---|---|
| Job `final_total` (status final) | `LedgerEntry` revenue | `linkedRecordType: job` |
| `expense` / `payroll` txns | `LedgerEntry` expense | Category from `expense_category_id` |

---

## 7. Validation checklist

| Metric | Expected (Quotation) |
|---|---:|
| `products` | 2,328 |
| `contacts` | 2,690 |
| `transactions` (sell) | 6,570 |
| `transaction_sell_lines` | 23,657 |
| Quotation `sub_status` | 88 |

Run: `python3 scripts/migrate_all.py --entities VM --dry-run`

---

## Open questions

1. Add `Vehicle` model before write — plate number may live in custom fields / `shipping_details`.
2. `sell_transfer` (894) — defer cross-location; no Job.
