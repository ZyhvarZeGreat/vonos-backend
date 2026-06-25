# VMS — Field-Level Migration Map

> **Superseded** by [VA_MIGRATION_MAP.md](./VA_MIGRATION_MAP.md) — VMS merged into Vonos Automotive (`VA`).

**Target entity:** Vonos Mech Shop (`VMS`, tenant code `VMS`, seed id `tenant_vms_001`)  
**Canonical source:** `vonomglk_OPS` in `localhost.sql`  
**Audit reference:** [VMS_AUDIT.md](./VMS_AUDIT.md)  
**Archetype:** job-centric (fabrication / mech shop stages)

---

## 1. Scope

### In scope (VMS v1)

| Source table(s) | Vonos target |
|---|---|
| `contacts` (customer) | `Customer` |
| `contacts` (supplier) | `Supplier` |
| `products`, `variations`, `variation_location_details` | `Item` (materials catalog) |
| `transactions` (job candidates) | `Job` |
| `transaction_sell_lines` | `JobMaterial` + optional `JobLabour` (see §5) |
| `transactions` (`type = expense`, `payroll`) | `LedgerEntry` (expense) |
| Completed jobs | `LedgerEntry` (revenue) |
| All migrated entities | `MigrationLegacyId` |

### Job candidate filter

Same as VM: `sell` with `final`/`received`, or `is_quotation = 1`, or `sub_status` quotation/proforma.

Skip: `opening_stock`, `purchase`, `stock_adjustment` as Job (inventory only).

### Out of scope

| Source | Reason |
|---|---|
| `transaction_sell_lines_purchase_lines` | FIFO — skip |
| `users`, `oauth_*`, `essentials_*` | Auth/HR |
| `expense_refund` | 1 row — manual |

---

## 2. Import order

1. `Tenant` (`code: VMS`, `archetype: job`).
2. Customers, suppliers, items.
3. Jobs → JobMaterial → LedgerEntry.
4. MigrationLegacyId.

---

## 3. Job status mapping (VMS stages)

Reference stepper: `Received → Quoted → Approved → In Progress → QC → Delivered`

| Ultimate POS signal | Vonos `Job.status` |
|---|---|
| `is_quotation = 1` / `sub_status = quotation` | `Quoted` |
| `status = received` | `Received` |
| `status = ordered` | `Approved` |
| `status = final` + unpaid | `In Progress` |
| `status = final` + paid | `Delivered` |
| `status = draft` | Skip v1 |

`hasQuote` / `quoteAmount`: same rules as VM map.

| Source field | Target `Job` | Rule |
|---|---|---|
| `invoice_no` / `ref_no` | `reference` | |
| `contact_id` | `customerName` | Customer name lookup |
| `additional_notes` | `description` | |
| `transaction_date` | `dueDate` | Optional |

**Expected:** ~3,242 sell transactions (per audit).

---

## 4. JobMaterial / JobLabour

**JobMaterial:** from `transaction_sell_lines` (parts).

**JobLabour (optional v1):** If line `product_id` maps to a service/labour product (`products.type = 'service'` or category Labour), map to `JobLabour` with `staffId` = placeholder `legacy-import`, `hours` = quantity, `rate` = unit price.

---

## 5. Ledger

| Type | LedgerEntry |
|---|---|
| Final job | revenue → `linkedRecordType: job` |
| expense / payroll | expense |

---

## 6. Validation checklist

| Metric | Expected (OPS) |
|---|---:|
| `products` | 1,669 |
| `transactions` (sell) | 3,242 |
| `transaction_sell_lines` | (per audit) |
| `contacts` | (per audit) |

Run: `python3 scripts/migrate_all.py --entities VMS --dry-run`
