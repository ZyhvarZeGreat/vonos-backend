# HQ6 Screenshots Spacing Catalog — Inventory

Local source (not the remote host — that path 404s):

`hq6.vonosautomarket.com/screenshots-spacing-catalog/`

| Field | Value |
|-------|-------|
| Pages | 71 |
| Images per page | full + viewport + viewport-below |
| Viewport | 1440×900 |
| Catalog strip gap | `gapPx: 32` |
| Companion scrape | `hq6.vonosautomarket.com/ui-audit/*/screenshot.png` |

## Slug → VA route map

| Slug | Route |
|------|-------|
| `00_home` | `/VA/overview` |
| `01_users` | `/VA/users` |
| `02_roles` | `/VA/roles` |
| `03_sales-commission-agents` | `/VA/commission-agents` |
| `04_contacts__type=supplier` | `/VA/suppliers` |
| `05_contacts__type=customer` | `/VA/customers` |
| `06_customer-group` | `/VA/customer-groups` |
| `07_contacts__import` | `/VA/import-contacts` |
| `08_products` | `/VA/catalog` |
| `09_products__create` | `/VA/add-product` |
| `10_update-product-price` | `/VA/update-price` |
| `11_labels__show` | `/VA/print-labels` |
| `12_variation-templates` | `/VA/variations` |
| `13_import-products` | `/VA/import-products` |
| `14_import-opening-stock` | `/VA/import-opening-stock` |
| `15_selling-price-group` | `/VA/price-groups` |
| `16_units` | `/VA/units` |
| `17_taxonomies__type=product` | `/VA/categories` |
| `18_brands` | `/VA/brands` |
| `19_warranties` | `/VA/warranties` |
| `20_purchase-order` | `/VA/purchase-orders` |
| `21_purchases` | `/VA/inbound` |
| `22_purchases__create` | `/VA/add-purchase` |
| `23_purchase-return` | `/VA/purchase-returns` |
| `24_sells` | `/VA/sales` |
| `25_sells__create` | `/VA/add-sale` |
| `26_pos` | `/VA/pos` |
| `27_pos__create` | `/VA/pos-terminal` |
| `28_sells__create__status=draft` | `/VA/add-draft` |
| `29_sells__drafts` | `/VA/drafts` |
| `30_sells__create__status=quotation` | `/VA/add-quotation` |
| `31_sells__quotations` | `/VA/quotations` |
| `32_sell-return` | `/VA/returns` |
| `33_shipments` | `/VA/shipments` |
| `34_discount` | `/VA/discounts` |
| `35_import-sales` | `/VA/import-sales` |
| `36_expenses` | `/VA/expenses` |
| `37_expenses__create` | `/VA/add-expense` |
| `38_expense-categories` | `/VA/expense-categories` |
| `39_account__account` | `/VA/payment-accounts` |
| `40_account__balance-sheet` | `/VA/balance-sheet` |
| `41_account__trial-balance` | `/VA/trial-balance` |
| `42_account__cash-flow` | `/VA/cash-flow` |
| `43_account__payment-account-report` | `/VA/payment-account-report` |
| `44_reports__profit-loss` | `/VA/reports?report=profit-loss` |
| `45_reports__purchase-sell` | `/VA/reports?report=purchase-sale` |
| `46_reports__tax-report` | `/VA/reports?report=tax` |
| `47_reports__customer-supplier` | `/VA/reports?report=supplier-customer` |
| `48_reports__customer-group` | `/VA/reports?report=customer-groups` |
| `49_reports__stock-report` | `/VA/reports?report=stock` |
| `50_reports__trending-products` | `/VA/reports?report=trending` |
| `51_reports__items-report` | `/VA/reports?report=items` |
| `52_reports__product-purchase-report` | `/VA/reports?report=product-purchase` |
| `53_reports__product-sell-report` | `/VA/reports?report=product-sell` |
| `54_reports__purchase-payment-report` | `/VA/reports?report=purchase-payment` |
| `55_reports__sell-payment-report` | `/VA/reports?report=sell-payment` |
| `56_reports__expense-report` | `/VA/reports?report=expense` |
| `57_reports__register-report` | `/VA/reports?report=register` |
| `58_reports__sales-representative-report` | `/VA/reports?report=sales-rep` |
| `59_reports__service-staff-report` | `/VA/reports?report=service-staff` |
| `60_reports__activity-log` | `/VA/reports?report=activity-log` |
| `61_modules__orders` | `/VA/orders` |
| `62_notification-templates` | `/VA/settings` |
| `63_business__settings` | `/VA/settings` |
| `64_business-location` | `/VA/locations` |
| `65_invoice-schemes` | `/VA/invoice-settings` |
| `66_barcodes` | `/VA/barcode-settings` |
| `67_printers` | `/VA/receipt-printers` |
| `68_tax-rates` | `/VA/tax-rates` |
| `69_hrm__dashboard` | `/VA/hrm` |
| `70_essentials__todo` | `/VA/overview` (Essentials To Do chrome) |

## Measured tokens (from ui-audit screenshots)

- Top bar green ≈ `#085939`
- Page background ≈ `#eef2f6`
- Sidebar rail ≈ `#e3e8ef` / white content
- Stacked card gap ≈ 16–24px (catalog HTML uses 32px strip gap)
- Products default page size: **50**
- Products title includes subtitle “Manage your products”
- Sales title-only; Add-only (blue) in tab row
- Footer: `Vonos Autos Head Office - V6.8 | Copyright © {year} All rights reserved.`
