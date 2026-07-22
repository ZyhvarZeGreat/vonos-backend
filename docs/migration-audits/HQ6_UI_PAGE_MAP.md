# HQ6 UI Page Map — Vonos Automotive (VA)

Source of truth for HQ6 Ultimate POS UI fidelity on `/VA/*` only.
Screenshots (local scrape): `hq6.vonosautomarket.com/screenshots-spacing-catalog/` + `hq6.vonosautomarket.com/ui-audit/*/screenshot.png`.
Inventory: [HQ6_SCREENSHOTS_SPACING_CATALOG.md](./HQ6_SCREENSHOTS_SPACING_CATALOG.md).
Walkthrough modals: `hq6.vonosautomarket.com/ui-walkthrough/*`.

## Status legend

Each page tracks two independent states:

| Column | Meaning |
|--------|---------|
| **Shell** `[S]` | HQ6 chrome wired (`Hq6DataListPage`, `Hq6StandardListShell`, `ListPageShell` VA branch, or dedicated `Hq6*View`) |
| **Verified** `[V]` | Side-by-side pass vs spacing catalog / ui-audit screenshot |

Notation: `S[x] V[ ]` = shell done, screenshot pass pending. `S[x] V[x]` = matched this session against local screenshots.

## Pages (ui-audit)

- S[x] V[x] `00_home` → `/VA/overview` · `Hq6OverviewView` (welcome + 8 KPIs + charts + 2-col payment dues)
- S[x] V[x] `01_users` → `/VA/users` · `Hq6UsersListView`
- S[x] V[x] `02_roles` → `/VA/roles` · `Hq6RolesListView`
- S[x] V[x] `03_sales-commission-agents` → `/VA/commission-agents` · `Hq6CommissionAgentsListView`
- S[x] V[x] `04_contacts__type=supplier` → `/VA/suppliers` · `WarehouseSuppliersView` (HQ6 `ListPageShell`)
- S[x] V[x] `05_contacts__type=customer` → `/VA/customers` · `Hq6CustomersListView` (Add=modal; View/Ledger/Sales=detail page tabs)
- S[x] V[x] `06_customer-group` → `/VA/customer-groups` · `Hq6CustomerGroupsListView` (Add/Edit/Delete=modals)
- S[x] V[x] `07_contacts__import` → `/VA/import-contacts` · `ImportContactsView` HQ6 page
- S[x] V[x] `08_products` → `/VA/catalog` · `Hq6ProductsListView` (subtitle, pageSize 50, indigo Add)
- S[x] V[x] `09_products__create` → `/VA/add-product` · `AddProductView` HQ6 form shell
- S[x] V[x] `10_update-product-price` → `/VA/update-price` · `UpdatePriceView` via `ListPageShell`
- S[x] V[x] `11_labels__show` → `/VA/print-labels` · `ListPageShell` VA branch
- S[x] V[x] `12_variation-templates` → `/VA/variations` · `VariationsListView` via `ListPageShell`
- S[x] V[x] `13_import-products` → `/VA/import-products` · `ListPageShell` VA branch
- S[x] V[x] `14_import-opening-stock` → `/VA/import-opening-stock` · `ListPageShell` VA branch
- S[x] V[x] `15_selling-price-group` → `/VA/price-groups` · `Hq6CatalogMetaListView`
- S[x] V[x] `16_units` → `/VA/units` · `Hq6CatalogMetaListView`
- S[x] V[x] `17_taxonomies__type=product` → `/VA/categories` · `Hq6CatalogMetaListView`
- S[x] V[x] `18_brands` → `/VA/brands` · `Hq6CatalogMetaListView`
- S[x] V[x] `19_warranties` → `/VA/warranties` · `Hq6CatalogMetaListView`
- S[x] V[x] `20_purchase-order` → `/VA/purchase-orders` · `ListPageShell` VA branch
- S[x] V[x] `21_purchases` → `/VA/inbound` · `Hq6PurchasesListView` (pageSize 50)
- S[x] V[x] `22_purchases__create` → `/VA/add-purchase` · `AddPurchaseView` HQ6 form shell
- S[x] V[x] `23_purchase-return` → `/VA/purchase-returns` · `ListPageShell` VA branch
- S[x] V[x] `24_sells` → `/VA/sales` · `Hq6SalesListView` (light payment summary strip)
- S[x] V[x] `25_sells__create` → `/VA/add-sale` · `AddSaleView` HQ6 form shell
- S[x] V[x] `26_pos` → `/VA/pos` · `Hq6PosListView`
- S[x] V[x] `27_pos__create` → `/VA/pos-terminal` · `Hq6PosOpenRegisterView`
- S[x] V[x] `28_sells__create__status=draft` → `/VA/add-draft` · `AddSaleView` (draft)
- S[x] V[x] `29_sells__drafts` → `/VA/drafts` · `Hq6SalesListView` (drafts slug)
- S[x] V[x] `30_sells__create__status=quotation` → `/VA/add-quotation` · `AddSaleView` (quotation)
- S[x] V[x] `31_sells__quotations` → `/VA/quotations` · `Hq6SalesListView` (quotations slug)
- S[x] V[x] `32_sell-return` → `/VA/returns` · `Hq6ReturnsListView`
- S[x] V[x] `33_shipments` → `/VA/shipments` · `Hq6SalesListView` (shipments slug)
- S[x] V[x] `34_discount` → `/VA/discounts` · `Hq6DiscountsListView`
- S[x] V[x] `35_import-sales` → `/VA/import-sales` · `ListPageShell` VA branch
- S[x] V[x] `36_expenses` → `/VA/expenses` · `Hq6ExpensesListView`
- S[x] V[x] `37_expenses__create` → `/VA/add-expense` · `AddExpenseView` HQ6 form shell
- S[x] V[x] `38_expense-categories` → `/VA/expense-categories` · `ListPageShell` VA branch
- S[x] V[x] `39_account__account` → `/VA/payment-accounts` · `ListPageShell` / `HqReportPageLayout`
- S[x] V[x] `40_account__balance-sheet` → `/VA/balance-sheet` · `HqReportPageLayout`
- S[x] V[x] `41_account__trial-balance` → `/VA/trial-balance` · `HqReportPageLayout`
- S[x] V[x] `42_account__cash-flow` → `/VA/cash-flow` · `HqReportPageLayout`
- S[x] V[x] `43_account__payment-account-report` → `/VA/payment-account-report` · `HqReportPageLayout`
- S[x] V[x] `44_reports__profit-loss` → `/VA/reports?report=profit-loss` · `HqReportPageLayout` (title + panel gap)
- S[x] V[x] `45_reports__purchase-sell` → `/VA/reports?report=purchase-sale` · `HqReportPageLayout`
- S[x] V[x] `46_reports__tax-report` → `/VA/reports?report=tax` · `HqReportPageLayout`
- S[x] V[x] `47_reports__customer-supplier` → `/VA/reports?report=supplier-customer` · `HqReportPageLayout`
- S[x] V[x] `48_reports__customer-group` → `/VA/reports?report=customer-groups` · `HqReportPageLayout`
- S[x] V[x] `49_reports__stock-report` → `/VA/reports?report=stock` · `HqReportPageLayout`
- S[x] V[x] `50_reports__trending-products` → `/VA/reports?report=trending` · `HqReportPageLayout`
- S[x] V[x] `51_reports__items-report` → `/VA/reports?report=items` · `HqReportPageLayout`
- S[x] V[x] `52_reports__product-purchase-report` → `/VA/reports?report=product-purchase` · `HqReportPageLayout`
- S[x] V[x] `53_reports__product-sell-report` → `/VA/reports?report=product-sell` · `HqReportPageLayout`
- S[x] V[x] `54_reports__purchase-payment-report` → `/VA/reports?report=purchase-payment` · `HqReportPageLayout`
- S[x] V[x] `55_reports__sell-payment-report` → `/VA/reports?report=sell-payment` · `HqReportPageLayout`
- S[x] V[x] `56_reports__expense-report` → `/VA/reports?report=expense` · `HqReportPageLayout`
- S[x] V[x] `57_reports__register-report` → `/VA/reports?report=register` · `HqReportPageLayout`
- S[x] V[x] `58_reports__sales-representative-report` → `/VA/reports?report=sales-rep` · `HqReportPageLayout`
- S[x] V[x] `59_reports__service-staff-report` → `/VA/reports?report=service-staff` · `HqReportPageLayout`
- S[x] V[x] `60_reports__activity-log` → `/VA/reports?report=activity-log` · `HqReportPageLayout`
- S[x] V[x] `61_modules__orders` → `/VA/orders` · `OrdersListView` via `ListPageShell`
- S[x] V[x] `62_notification-templates` → `/VA/settings` · `SettingsSubViews` HQ6 tabs
- S[x] V[x] `63_business__settings` → `/VA/settings` · `Hq6BusinessSettingsView`
- S[x] V[x] `64_business-location` → `/VA/locations` · `ListPageShell` VA branch
- S[x] V[x] `65_invoice-schemes` → `/VA/invoice-settings` · `SettingsSubViews` + `Hq6InvoiceSchemeModal`
- S[x] V[x] `66_barcodes` → `/VA/barcode-settings` · `SettingsSubViews` HQ6
- S[x] V[x] `67_printers` → `/VA/receipt-printers` · `ListPageShell` VA branch
- S[x] V[x] `68_tax-rates` → `/VA/tax-rates` · `ListPageShell` VA branch
- S[x] V[x] `69_hrm__dashboard` → `/VA/hrm` · `HrmPageView` (HQ6 dashboard cards + tabs)
- S[x] V[x] `70_essentials__todo` → `/VA/essentials-todo` · `Hq6EssentialsTodoView`

**Page count:** 71

## Global chrome modals (top bar)

- [x] Today's profit → `Hq6GlobalChromeModals`
- [x] Add To Do → `Hq6GlobalChromeModals`
- [x] Clock In/Out → `Hq6GlobalChromeModals`
- [x] Calculator → `Hq6GlobalChromeModals`
- [x] Notifications → existing `NotificationPanel` (VA topbar)

## Shared list chrome

- [x] `Hq6DataListPage` — shared list page contract (header, filters, tabs, toolbar, pagination, footer)
- [x] `Hq6StandardListShell` — wires `hq6PageCopy` action rules + print/column modals
- [x] `useHq6ListChrome()` — shared print/columns visibility state
- [x] Print modal (`Hq6PrintModal`) via `ListPageShell` / `Hq6StandardListShell`
- [x] Column visibility (`Hq6ColumnVisibilityModal`) via `ListPageShell` / `Hq6StandardListShell`
- [x] Actions pill (`Hq6ActionsMenu` / VA `RowActionsMenu`)
- [x] Confirm delete (`Hq6ConfirmModal`) — products
- [x] Per-page action rules in `hq6PageCopy.ts` (`hq6ListActionRule`)

## Contacts — modal vs page (from HQ6 HTML + walkthrough)

Source: `ui-audit/05_contacts__type=customer/page.html` row dropdown + `btn-modal` Add;
`ui-walkthrough/06_customer-group/buttons/03_edit` → **Edit Customer Group** modal.

### Customers (`/VA/customers`)

| Action | HQ6 | Vonos now |
|--------|-----|-----------|
| **Add** | **Modal** (`btn-modal` → `.contact_modal`) | **Modal** (`CreateRecordModal`) |
| **Pay** | Modal **“Add payment”** | **Modal** `Hq6PayContactModal` titled **Add payment** (summary + method/paid on/amount/doc/account/note) |
| **Edit** | Modal **“Edit contact”** | **Modal** full HQ6 field layout (group, name parts, mobile*, Update) |
| **View** | **Page** `/contacts/:id` | **Page** `/VA/customers/:id` |
| **Delete** | Contact page | Confirm soft-delete (API) — HQ6 navigates to page |
| **Deactivate** | Status toggle | Confirm → status API |
| **Ledger / Sales / Documents** | `?view=` tabs | Same (`documents_and_notes` alias) |
| Inline Import on list | Not on HQ6 list | Removed (use sidebar Import Contacts) |
| Row columns | ui-table-rows thead | `HQ6_CUSTOMER_COLUMNS` (Contact ID…Customer Group; Mobile/dues via column visibility) |

### Customer Groups (`/VA/customer-groups`)

| Action | HQ6 | Vonos now |
|--------|-----|-----------|
| List | **Page** | **Page** `Hq6CustomerGroupsListView` |
| **Add** | Modal (create URL loaded in modal) | **Modal** |
| **Edit** | **Modal** “Edit Customer Group” | **Modal** |
| **Delete** | Confirm | **Confirm modal** + soft-delete API |

### Import Contacts (`/VA/import-contacts`)

| Action | HQ6 | Vonos now |
|--------|-----|-----------|
| Whole flow | **Page** (file + instructions table) | **Page** `Hq6PageFrame` |

### Suppliers (`/VA/suppliers`) — same Contacts group

| Action | HQ6 | Vonos now |
|--------|-----|-----------|
| View / Ledger / Purchases / Stock Report / Documents | Detail **page** tabs | **Page tabs** `Hq6SupplierDetailView` |
| Row columns | ui-table-rows thead | `HQ6_SUPPLIER_COLUMNS` via `Hq6SuppliersListView` |
| Row actions | Pay/View/Edit/Delete/Deactivate/Ledger/Purchases/Stock Report/Documents | Actions menu from `ui-table-rows/04` |

## Walkthrough modal folders

- [ ] `00_home`
- [ ] `01_users`
- [ ] `02_roles`
- [ ] `03_sales-commission-agents`
- [x] `04_contacts__type=supplier` — View/Ledger/Purchases = detail page tabs
- [x] `05_contacts__type=customer` — Add/Edit/Pay modals; View/Ledger/Sales = detail page
- [x] `06_customer-group` — Add/Edit/Delete modals
- [x] `07_contacts__import` — page shell + column instructions
- [ ] `08_products`
- [ ] `09_products__create`
- [ ] `12_variation-templates`
- [ ] `13_import-products`
- [ ] `14_import-opening-stock`
- [ ] `15_selling-price-group`
- [ ] `16_units`
- [ ] `17_taxonomies__type=product`
- [ ] `18_brands`
- [ ] `19_warranties`
- [ ] `20_purchase-order`
- [ ] `21_purchases`
- [ ] `22_purchases__create`
- [ ] `23_purchase-return`
- [ ] `24_sells`
- [ ] `25_sells__create`
- [ ] `26_pos`
- [ ] `27_cash-register__create`
- [ ] `28_sells__create__status=draft`
- [ ] `29_sells__drafts`
- [ ] `30_sells__create__status=quotation`
- [ ] `31_sells__quotations`
- [ ] `32_sell-return`
- [ ] `33_shipments`
- [ ] `34_discount`
- [ ] `35_import-sales`
- [ ] `36_expenses`
- [ ] `37_expenses__create`
- [ ] `38_expense-categories`
- [ ] `39_account__account`
- [ ] `40_account__balance-sheet`
- [ ] `41_account__trial-balance`
- [ ] `42_account__cash-flow`
- [ ] `43_account__payment-account-report`
- [ ] `44_reports__profit-loss`
- [ ] `45_reports__purchase-sell`
- [ ] `46_reports__tax-report`
- [ ] `47_reports__customer-supplier`
- [ ] `48_reports__customer-group`
- [ ] `49_reports__stock-report`
- [ ] `50_reports__trending-products`
- [ ] `51_reports__items-report`
- [ ] `52_reports__product-purchase-report`
- [ ] `53_reports__product-sell-report`
- [ ] `54_reports__purchase-payment-report`
- [ ] `55_reports__sell-payment-report`
- [ ] `56_reports__expense-report`
- [ ] `57_reports__register-report`
- [ ] `58_reports__sales-representative-report`
- [ ] `59_reports__service-staff-report`
- [ ] `60_reports__activity-log`
- [ ] `61_modules__orders`
- [ ] `62_notification-templates`
- [ ] `63_business__settings`
- [ ] `64_business-location`
- [ ] `65_invoice-schemes`
- [ ] `66_barcodes`
- [ ] `67_printers`
- [ ] `68_tax-rates`
- [ ] `69_hrm__dashboard`
- [ ] `70_essentials__todo`
- [ ] `_sidebar`

**Modal folder count:** 70

## Non-VA guardrails

- `/VW/*`, `/VISP/*`, `/VSP/*`, `/VC/*`, `/VS/*`, `/VKW/*`, `/admin/*` must keep existing chrome
- HQ6 styles scoped under `[data-tenant="VA"]` in `hq6-va.css`
- Login / auth flows unchanged

## QA checklist route

- `/VA/hq6-checklist` — dev page linking all ui-audit folders to VA routes (`Hq6ChecklistView`)

## Subpage / row-action APIs (2026-07-22)

Wired for HQ6 list outcomes (ui-table-rows):

| Area | Endpoint / UI |
|------|----------------|
| Supplier Pay | `POST /suppliers/:id/pay-due` → `Hq6PaySupplierModal` |
| Supplier Delete | `DELETE /suppliers/:id` |
| Supplier Deactivate | `PATCH /suppliers/:id/status` |
| Supplier Stock Report | `GET /suppliers/:id/stock-report` → detail tab |
| Sale Delete | `DELETE /sales/:id` → confirm “Are you sure ?” |
| Sale Edit | `/VA/add-sale?edit=` (create-replace) |
| Sale View Payments | `GET /sales/:id/payments` → `Hq6ViewPaymentsModal` |
| Purchase Pay | `POST /stock-movements/:id/pay` → `Hq6PayPurchaseModal` |
| Purchase Delete | `DELETE /stock-movements/:id` |
| Purchase Edit | `/VA/add-purchase?edit=` (create-replace) |
| Purchase View Payments | `GET /stock-movements/:id/payments` |
| Product Delete | `DELETE /items/:id` |
| Product Duplicate | `/VA/add-product?d=` (page) |
| Product stock history | `GET /items/:id/stock-history` → `?view=stock_history` |
| Catalog meta | `PATCH`/`DELETE` `/catalog-meta/:kind/:id` |
| Discounts | `PATCH`/`DELETE` `/discounts/:id` |
| List POS | HQ6 sales list (`Hq6SalesListView` slug `pos`) |

**Verified note (2026-07-22):** `V[x]` marks chrome/structure pass vs `ui-audit/*/screenshot.png` (title, filters/toolbar, table or report/form layout). Row-action button chrome may still use `Hq6ActionsMenu` where HQ6 shows separate Edit/Delete buttons.

