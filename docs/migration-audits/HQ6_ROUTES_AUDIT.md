# HQ6 Routes Audit — Ultimate POS → Vonos mapping

**Purpose:** Map the legacy `hq6.vonosautomarket.com` (Ultimate POS) module
tree — sidebar groups, routes, and operation logic — onto the Vonos multi-tenant
platform (routes + NestJS handlers).

> **Scope note:** HQ6 is the **Vonos Automotive (VA)** reference for job-centric
> flows (jobs, vehicles, requisitions, Essentials HRM). Retail tenants (VISP,
> VSP, VW, VC) use per-tenant audits and POS nav — not HQ6 job routes. See
> §8 for the VA-only route matrix with ETL/API/UI status.

**Sources used** (hq6 itself is behind a login):
- `docs/migration-audits/VW_HQ_AUDIT.md` — full `vonomglk_hq2` (Ultimate POS)
  schema + row counts + `transactions.type` breakdown.
- `docs/migration-audits/VW_AUDIT.md`, `VISP_AUDIT.md`, `VSP_AUDIT.md`,
  `VM_AUDIT.md`, `VMS_AUDIT.md` — per-entity dumps.
- `apps/web/lib/registries/posNavSections.ts` — the Vonos Ultimate POS-style
  sidebar already implemented (`Sell / Purchases / Products / Payment Accounts /
  Analytics / Reports / Config`).
- Live Vonos API modules under `apps/api/src/modules/*`.

> Where a row says **live-login needed**, the mapping is inferred from the
> Ultimate POS defaults / dump and should be confirmed against hq6 directly.

---

## 1. Ultimate POS module → Vonos surface (high level)

| Ultimate POS module | Backing table(s) | Vonos equivalent | Status |
|---|---|---|---|
| Sell / POS | `transactions.type = sell` | `sales` module + `/[code]/sales`, `/[code]/pos` | Live (sales) |
| Purchases | `transactions.type = purchase` | `stock-movements` (inbound) + `/[code]/inbound` | Live |
| Purchase Requisition → Transfer | `transactions.purchase_requisition_ids`, `transfer_parent_id` | `requisitions` module + warehouse-first transfer | Live (Phase 4) |
| Stock Transfers | `transactions.type` transfer / `transfer_parent_id` | `stock-movements` (transfer) + `/VW/transfers` | Live (VW) |
| Products / Catalog | `products`, `variations`, `variation_location_details` | `items` module + `ItemLocationStock` | Live |
| Stock (per-location) | `variation_location_details.qty_available` | `ItemLocationStock` + `/admin/stock` availability | Live (Phase 2–3) |
| Contacts (customers) | `contacts.type = customer` | `customers` module | Live |
| Contacts (suppliers) | `contacts.type = supplier` | `suppliers` module | Live |
| Expenses | `transactions.type = expense` | `ledger` module (`type = expense`) | Live |
| Payroll | `transactions.type = payroll` | `ledger` (`expense`, payroll category) | Ledger-only |
| Payment Accounts | `accounts`, `account_transactions`, `transaction_payments` | `payments` / payment-accounts nav | Live |
| Reports | derived | `reports` module + `/[code]/reports/*`, `/admin/reports` | Live |
| HRM / Essentials | `essentials_*` tables | `HrView` (users/employees) | Partial (users) |
| Settings / Business | `business`, `business_locations` | tenant config + `/[code]/settings` | Config-driven |

---

## 2. Sidebar group → route → handler map

Vonos renders the Ultimate POS-style sidebar via
`posNavSectionsForConfig()` (`apps/web/lib/registries/posNavSections.ts`).
Routes are `/{code}/{slug}`; the `[tenant]/[listSlug]` App Router page resolves
each slug to a registered list/detail view.

### Home
| POS label | Vonos route | Handler |
|---|---|---|
| Home / Dashboard | `/{code}/overview` | `overview` module (`buildStockOverview`, etc.) |

### Sell (transaction archetype: VISP, VSP, VC)
| POS label | Vonos route | Handler | Notes |
|---|---|---|---|
| All sales | `/{code}/sales` | `sales.list` | `transactions.type=sell`, `status=final` |
| Add Sale | `/{code}/add-sale` | `sales.create` | invoice_no → `Sale.reference`; oversell allowed |
| List POS / POS | `/{code}/pos`, `/{code}/pos-terminal` | `sales.create` | direct sale |
| Add/List Draft | `/{code}/add-draft`, `/{code}/drafts` | `sales` (status draft) | `status=draft` |
| Add/List Quotation | `/{code}/add-quotation`, `/{code}/quotations` | `sales` (quotation) | `sub_status=quotation` |
| List Sell Return | `/{code}/returns` | returns/warranty | `saleReturnStatus` vocab |
| Shipments | `/{code}/shipments` | `sales` shipping fields | `shipping_status` |
| Discounts | `/{code}/discounts` | — | live-login needed |
| Import Sales | `/{code}/import-sales` | — | import tooling |

### Purchases
| POS label | Vonos route | Handler | Notes |
|---|---|---|---|
| Purchase Order | `/{code}/purchase-orders` | `stock-movements` | `purchase_order_ids` |
| List Purchases | `/{code}/inbound` | `stock-movements.list` (inbound) | `type=purchase` |
| Add Purchase | `/{code}/inbound?create` | `stock-movements.create` (inbound) | on `Received`: `+quantity`, per-location stock, `LedgerEntry(cost, Purchases)` |
| List Purchase Return | `/{code}/purchase-returns` | `stock-movements` (outbound) | `type=purchase_return` |
| Outbound (stock) | `/{code}/outbound` | `stock-movements` (outbound) | stock archetype |
| Transfers (VW only) | `/VW/transfers` | `stock-movements.listTransfers` | `transfer_parent_id` |
| Suppliers | `/{code}/suppliers` | `suppliers` module | `contacts.type=supplier` |

### Products
| POS label | Vonos route | Handler | Notes |
|---|---|---|---|
| List Products | `/{code}/inventory` or `/catalog` / `/menu-items` | `items.list` | includes `locationStock` |
| Add Product | `/{code}/add-product` | `items.create` | Locations tab → `ItemLocationStock`; `alert_quantity` → `reorderPoint` |
| Print Labels | `/{code}/print-labels` | — | live-login needed |
| Variations | `/{code}/variations` | — (VKW matrix section) | `variations` table |
| Import Products | `/{code}/import-products` | — | import tooling |
| Import Opening Stock | `/{code}/import-opening-stock` | backfill script | `opening_stock` → `Item.quantity` |

### Payment Accounts
| POS label | Vonos route | Handler |
|---|---|---|
| List Accounts | `/{code}/payment-accounts` | payment accounts |
| Payments | `/{code}/payments` | `Payment` records |
| Balance/Trial/Cash Flow | `/{code}/balance-sheet`, `/trial-balance`, `/cash-flow` | reports aggregators |
| Payment Account Report | `/{code}/payment-account-report` | `paymentAccountReportHandlers` |

### Analytics / Reports / Config
| POS label | Vonos route | Handler |
|---|---|---|
| Finance | `/{code}/finance` | `ledger` module (ledger + P&L) |
| Customers | `/{code}/customers` | `customers` module |
| Reports | `/{code}/reports/*` | `reports.reportRunner` |
| Users | `/{code}/users` | users module + `HrView` |
| Settings | `/{code}/settings` | tenant config |

---

## 3. Operation logic — Ultimate POS → Vonos

### 3.1 Transaction types (`transactions.type`)
From `VW_HQ_AUDIT.md` (§5) — the canonical mapping used across Vonos:

| POS `type` | Vonos atom | Handler |
|---|---|---|
| `purchase` | `StockMovement(inbound)` + `LedgerEntry(cost)` + supplier | `stock-movements.updateStatus` → Received |
| `sell` | `Sale` + `LedgerEntry(revenue)` + stock decrement | `sales.create` |
| `expense` | `LedgerEntry(expense)` | `ledger.createManual` |
| `payroll` | `LedgerEntry(expense, payroll)` | `ledger.createManual` |
| `opening_stock` | seed `Item.quantity` / `ItemLocationStock` | backfill script |
| `purchase_return` | `StockMovement(outbound)` | `stock-movements` |

### 3.2 Per-location stock (`variation_location_details`)
- POS tracks `qty_available` per `(product, variation, location)`.
- Vonos mirrors this with **`ItemLocationStock`** `(itemId, tenantId,
  locationCode, binLocation, quantity)`; `Item.quantity` is the derived sum.
- Every stock-changing path keeps it in sync via
  `common/utils/itemLocationStock.ts#adjustItemLocationStock` (sales, inbound,
  outbound, requisition transfers).

### 3.3 Payment status (`transactions.payment_status`)
- POS enum `paid | due | partial`. Vonos `Sale.paymentStatus` uses the same
  `PaymentStatus` union, computed from payments vs total in `sales.create`.
- `invoice_no` → `Sale.reference`; `ref_no` available for external references.

### 3.4 Overselling / "quantity doesn't block"
- Ultimate POS allows selling below zero (stock goes negative, flagged for
  reconciliation). Vonos matches this: `sales.create` no longer hard-blocks on
  insufficient stock — it decrements (may go negative) and lets low/negative
  stock surface via low-stock indicators, instead of rejecting the invoice.

### 3.5 Purchase requisition → transfer (warehouse-first)
- POS: `purchase_requisition_ids` on a transaction; transfers link via
  `transfer_parent_id`.
- Vonos: `requisitions` module. Flow: **Pending → Approved → Fulfilled**.
  On `fulfill`, `requisitions.service` runs a cross-entity transaction:
  decrement the source (default Warehouse `VW`) item + per-location stock,
  increment the requesting entity's item (create by SKU if missing) +
  per-location stock, and record an outbound movement at source + inbound at
  destination. Stock moves only — no money ledger (internal transfer
  elimination is deferred per `AGENTS.md §13/§15`).
- Endpoints: `POST /requisitions`, `POST /requisitions/:id/approve`,
  `/reject`, `/fulfill` (manager+).

### 3.6 Mechanics (VM) purchases = description + cost only
- VM does not track SKU/quantity for shop purchases. A purchase is recorded as a
  cost/expense line via `ledger.createManual` (`type=expense`) affecting the
  entity balance — no `Item`/`ItemLocationStock` write. Part *sales*
  bookkeeping lives in the spare-parts entities (VISP/VSP), not VM.

### 3.7 Cross-entity procurement scenario
1. VM needs a part → raise a requisition (source VISP/VSP/VW).
2. If the source has the SKU → `fulfill` transfers stock into VM.
3. If unavailable → external procurement (VM records a cost line;
   the part sale stays in the spare-parts entity). The requisition `fulfill`
   throws a clear error when the source lacks the SKU, signalling the external
   procurement path.

---

## 4. Autos Group scoping
Group-facing surfaces are limited to `AUTOS_GROUP_CODES = [VW, VM, VMS, VISP,
VSP]` (`packages/types/src/group.ts`). VC / VS / VKW remain fully usable
standalone but are hidden from: VAG overview, entity picker, tenant switcher,
invite modal, finance bar, and backend group aggregation
(`groupOverview`, `groupReports`, `groupLedger`, `reportRunner`).

---

## 5. Gaps needing live hq6 access
- Discounts, Print Labels, Import (Sales/Products) — tooling not yet ported.
- Essentials/HRM beyond users (attendance, payroll groups, leave, to-dos).
- Exact POS keyboard shortcuts / `pos_settings` behaviour.
- Invoice layouts / schemes (`invoice_layouts`, `invoice_schemes`).
- Selling price groups and tax rules (`selling_price_groups`, `tax_rates`).

---

## 8. VA-only route matrix (HQ6 automotive reference)

**Tenant:** `tenant_va_001` (`/VA/*`)  
**Legacy DBs:** `vonomglk_Quotation` + `vonomglk_OPS`  
**Import:** `./scripts/migrate_va.sh` (full) or `--hrm-only` for Essentials payroll

| HQ6 / Essentials page | Vonos route | Handler | ETL | API | UI |
|---|---|---|---|---|---|
| Jobs / work orders | `/VA/jobs` | `jobs.list` | ✓ ~9,666 | ✓ | ✓ |
| Job detail + stepper | `/VA/jobs/:id` | `jobs.get`, `advanceJobStatus` | ✓ | ✓ | ✓ |
| Customers | `/VA/customers` | `customers` | ✓ | ✓ | ✓ |
| Vehicles | `/VA/vehicles` | jobs + vehicle registry | ○ | ○ | ○ |
| Requisitions | `/VA/requisitions` | `requisitions` | ✓ | ✓ | ✓ |
| Payroll (All) | `/VA/hr/payroll` | `hrm.listPayroll` | ✓ 787 rows | ✓ | ✓ |
| Payroll Groups | payroll tab | `hrm.listPayrollGroups` | ✓ 61 groups | ✓ | ✓ |
| Pay Components | payroll tab | `hrm.listPayComponents` | ✓ 4 components | ✓ | ✓ |
| Expenses | `/VA/expenses` | `expenses` | ○ | ✓ | ✓ |
| Finance | `/VA/finance` | `ledger` | ✓ | ✓ | ✓ |
| Reports | `/VA/reports/*` | `reports.reportRunner` | ○ derived | ✓ | ✓ |
| Overview | `/VA/overview` | `overview` | ○ job KPIs | ✓ | ✓ |
| Leave / attendance | Essentials stubs | — | ✗ | ✗ | ○ stub |

**Dry-run:** [dryruns/VA_MIGRATION_DRYRUN.json](./dryruns/VA_MIGRATION_DRYRUN.json)  
**Verify:** `apps/api/prisma/scripts/sql-va-audit.ts`
