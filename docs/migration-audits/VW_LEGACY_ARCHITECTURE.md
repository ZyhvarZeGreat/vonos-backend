# VW Legacy System — Architecture Reference

**Site:** `audit.vonosautos.com`  
**Product:** [Ultimate POS](https://ultimatefosters.com/) (Laravel 9, PHP 8+)  
**Vonos entity:** `VW` → `tenant_vw_001`  
**MySQL database:** `vonomglk_audit`  
**Business name in DB:** Vonos Audit Warehouse (Kubwa/Abuja, `BL0001`)

Field-level migration: [VW_MIGRATION_MAP.md](./VW_MIGRATION_MAP.md).  
Database audit: [VW_AUDIT.md](./VW_AUDIT.md).  
Legacy HQ archive (not imported): [VW_HQ_AUDIT.md](./VW_HQ_AUDIT.md).

---

## 1. Executive summary

| Artifact | Path | Role |
|---|---|---|
| PHP application | `audit.vonosautos.com/` | **Canonical** Ultimate POS install for Vonos Warehouse |
| MySQL export (Jun 24) | `Vonos warehouse.sql` | **Canonical VW data** — 1,379 txns, 664 products |
| Legacy HQ export | `localhost (1).sql` → `vonomglk_hq2` | Archive only — [VW_HQ_AUDIT.md](./VW_HQ_AUDIT.md) |

---

## 2. Stack and deployment

| Layer | Technology |
|---|---|
| Framework | Laravel 9 (`^9.51`) |
| Auth | Session + Spatie permissions |
| API | Passport installed; POS uses web routes |
| Modules | Essentials, Accounting, WooCommerce, Manufacturing, etc. (`modules_statuses.json`) |
| Payments | Pesapal, Stripe, PayPal, Razorpay, Paystack |

### Data-backed features (canonical install)

| Feature | Routes/controllers | Data in `vonomglk_audit` |
|---|---|---|
| Opening stock | `ProductController` | 1,101 `opening_stock` txns |
| POS / sells | `SellPosController`, `SellController` | 278 `sell` + `final` |
| Purchases | `PurchaseController` | **0** purchase txns |
| Product racks | `ProductController` | **0** (`enable_racks = 0`) |
| Payment accounts | `PaymentAccountController` | **0** accounts |
| Stock transfer | `StockTransferController` | Routes present; no transfer data |

---

## 3. Business configuration (from SQL)

| Setting | Value |
|---|---|
| Location | Kubwa, FCT, Abuja — `BL0001` |
| Timezone | `Africa/Lagos` |
| Accounting method | FIFO |
| Users | 3 |

---

## 4. Routing (migration-relevant)

| Domain | Controller | Purpose |
|---|---|---|
| Products | `ProductController` | SKU catalog, stock history |
| Sales / POS | `SellController`, `SellPosController` | Outbound sells |
| Purchases | `PurchaseController` | Inbound (unused in data) |
| Stock transfer | `StockTransferController` | Inter-location moves |
| Contacts | `ContactController` | Suppliers/customers |
| Reports | `ReportController` | Stock, sales |

Public `/business/register` exists — view currently broken (see health flags).

---

## 5. Site health flags

| Issue | Evidence | Action |
|---|---|---|
| Broken register view | `storage/logs/laravel-*.log` — `register.blade.php` syntax error | Fix or disable self-registration |
| `.env` in repo | `audit.vonosautos.com/.env` | **Rotate DB/app keys** (ops) |

---

## 6. Transaction types

| `type` | Count | Vonos mapping |
|---|---:|---|
| `opening_stock` | 1,101 | Seed `Item.quantity` |
| `sell` | 278 | Outbound `StockMovement` + revenue `LedgerEntry` |

Schema: 70 tables — Ultimate POS base (no populated Essentials payroll extension).

---

## 7. Related legacy HQ

`vonomglk_hq2` (Vonos Autos HQ) is a separate, larger install documented in [VW_HQ_AUDIT.md](./VW_HQ_AUDIT.md). Not used for Vonos Warehouse cutover.
