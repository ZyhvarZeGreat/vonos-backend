# VMS — MySQL Dump Audit

**Source database:** `vonomglk_OPS`
**Business name (from `business` table):** Vonos Automotive ltd
**Dump file:** `localhost.sql` (lines 412,885–583,941)
**Generated:** Jun 15, 2026 at 03:06 AM

---

## 1. Table Inventory

**Total tables:** 95 | **Populated:** 59 | **Empty:** 36

### All tables (with row counts)

| Table | Rows | Status |
|---|---:|---|
| `transaction_sell_lines_purchase_lines` | 91,234 | populated |
| `activity_log` | 22,348 | populated |
| `transactions` | 9,423 | populated |
| `transaction_sell_lines` | 9,203 | populated |
| `transaction_payments` | 7,844 | populated |
| `account_transactions` | 7,504 | populated |
| `product_racks` | 3,045 | populated |
| `purchase_lines` | 2,845 | populated |
| `product_locations` | 2,074 | populated |
| `stock_adjustment_lines` | 1,781 | populated |
| `contacts` | 1,695 | populated |
| `product_variations` | 1,669 | populated |
| `products` | 1,669 | populated |
| `variations` | 1,669 | populated |
| `variation_location_details` | 1,583 | populated |
| `role_has_permissions` | 353 | populated |
| `migrations` | 352 | populated |
| `essentials_payroll_group_transactions` | 218 | populated |
| `permissions` | 161 | populated |
| `categories` | 142 | populated |
| `currencies` | 141 | populated |
| `expense_categories` | 94 | populated |
| `model_has_roles` | 83 | populated |
| `model_has_permissions` | 81 | populated |
| `users` | 72 | populated |
| `woocommerce_sync_logs` | 66 | populated |
| `notifications` | 42 | populated |
| `brands` | 29 | populated |
| `system` | 25 | populated |
| `accounts` | 16 | populated |
| `roles` | 16 | populated |
| `essentials_payroll_groups` | 14 | populated |
| `reference_counts` | 14 | populated |
| `business_locations` | 9 | populated |
| `notification_templates` | 9 | populated |
| `essentials_user_shifts` | 8 | populated |
| `barcodes` | 6 | populated |
| `units` | 5 | populated |
| `essentials_todos_users` | 4 | populated |
| `cash_registers` | 3 | populated |
| `essentials_attendances` | 3 | populated |
| `essentials_reminders` | 3 | populated |
| `essentials_to_dos` | 3 | populated |
| `account_types` | 2 | populated |
| `cash_register_transactions` | 2 | populated |
| `customer_groups` | 2 | populated |
| `essentials_allowances_and_deductions` | 2 | populated |
| `essentials_leave_types` | 2 | populated |
| `essentials_shifts` | 2 | populated |
| `media` | 2 | populated |
| `types_of_services` | 2 | populated |
| `business` | 1 | populated |
| `essentials_documents` | 1 | populated |
| `essentials_holidays` | 1 | populated |
| `essentials_leaves` | 1 | populated |
| `essentials_messages` | 1 | populated |
| `invoice_layouts` | 1 | populated |
| `invoice_schemes` | 1 | populated |
| `tax_rates` | 1 | populated |
| `bookings` | 0 | empty |
| `cash_denominations` | 0 | empty |
| `categorizables` | 0 | empty |
| `dashboard_configurations` | 0 | empty |
| `discount_variations` | 0 | empty |
| `discounts` | 0 | empty |
| `document_and_notes` | 0 | empty |
| `essentials_document_shares` | 0 | empty |
| `essentials_kb` | 0 | empty |
| `essentials_kb_users` | 0 | empty |
| `essentials_todo_comments` | 0 | empty |
| `essentials_user_allowance_and_deductions` | 0 | empty |
| `essentials_user_sales_targets` | 0 | empty |
| `group_sub_taxes` | 0 | empty |
| `oauth_access_tokens` | 0 | empty |
| `oauth_auth_codes` | 0 | empty |
| `oauth_clients` | 0 | empty |
| `oauth_personal_access_clients` | 0 | empty |
| `oauth_refresh_tokens` | 0 | empty |
| `packages` | 0 | empty |
| `password_resets` | 0 | empty |
| `printers` | 0 | empty |
| `res_product_modifier_sets` | 0 | empty |
| `res_tables` | 0 | empty |
| `sell_line_warranties` | 0 | empty |
| `selling_price_groups` | 0 | empty |
| `sessions` | 0 | empty |
| `stock_adjustments_temp` | 0 | empty |
| `subscriptions` | 0 | empty |
| `superadmin_communicator_logs` | 0 | empty |
| `superadmin_frontend_pages` | 0 | empty |
| `user_contact_access` | 0 | empty |
| `variation_group_prices` | 0 | empty |
| `variation_templates` | 0 | empty |
| `variation_value_templates` | 0 | empty |
| `warranties` | 0 | empty |

---

## 2. Schema Comparison

**Verdict:** Ultimate POS base + 25 extension table(s)

- Core Ultimate POS tables present: **70 / 77**
- Extension/extra tables: **25**
- Missing from base 77: **0**

### Extra tables (not in base Ultimate POS 77)

- `essentials_allowances_and_deductions` (2 rows)
- `essentials_attendances` (3 rows)
- `essentials_document_shares` (0 rows)
- `essentials_documents` (1 rows)
- `essentials_holidays` (1 rows)
- `essentials_kb` (0 rows)
- `essentials_kb_users` (0 rows)
- `essentials_leave_types` (2 rows)
- `essentials_leaves` (1 rows)
- `essentials_messages` (1 rows)
- `essentials_payroll_group_transactions` (218 rows)
- `essentials_payroll_groups` (14 rows)
- `essentials_reminders` (3 rows)
- `essentials_shifts` (2 rows)
- `essentials_to_dos` (3 rows)
- `essentials_todo_comments` (0 rows)
- `essentials_todos_users` (4 rows)
- `essentials_user_allowance_and_deductions` (0 rows)
- `essentials_user_sales_targets` (0 rows)
- `essentials_user_shifts` (8 rows)
- `packages` (0 rows)
- `subscriptions` (0 rows)
- `superadmin_communicator_logs` (0 rows)
- `superadmin_frontend_pages` (0 rows)
- `woocommerce_sync_logs` (66 rows)

---

## 3. Key Table Deep-Dive

### `transactions`

**Row count:** 9,423

| Column | Type |
|---|---|
| `id` | int(10) UNSIGNED NOT NULL AUTO_INCREMENT |
| `business_id` | int(10) UNSIGNED NOT NULL |
| `location_id` | int(10) UNSIGNED DEFAULT NULL |
| `res_table_id` | int(10) UNSIGNED DEFAULT NULL |
| `res_waiter_id` | int(10) UNSIGNED DEFAULT NULL |
| `res_order_status` | enum('received','cooked','served') DEFAULT NULL |
| `type` | varchar(191) DEFAULT NULL |
| `sub_type` | varchar(20) DEFAULT NULL |
| `status` | varchar(191) NOT NULL |
| `sub_status` | varchar(191) DEFAULT NULL |
| `is_quotation` | tinyint(1) NOT NULL DEFAULT 0 |
| `payment_status` | enum('paid','due','partial') DEFAULT NULL |
| `adjustment_type` | enum('normal','abnormal') DEFAULT NULL |
| `contact_id` | int(11) UNSIGNED DEFAULT NULL |
| `customer_group_id` | int(11) DEFAULT NULL |
| `invoice_no` | varchar(191) DEFAULT NULL |
| `ref_no` | varchar(191) DEFAULT NULL |
| `source` | varchar(191) DEFAULT NULL |
| `subscription_no` | varchar(191) DEFAULT NULL |
| `subscription_repeat_on` | varchar(191) DEFAULT NULL |
| `transaction_date` | datetime NOT NULL |
| `total_before_tax` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `tax_id` | int(10) UNSIGNED DEFAULT NULL |
| `tax_amount` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `discount_type` | enum('fixed','percentage') DEFAULT NULL |
| `discount_amount` | decimal(22,4) DEFAULT 0.0000 |
| `rp_redeemed` | int(11) NOT NULL DEFAULT 0 |
| `rp_redeemed_amount` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `shipping_details` | varchar(191) DEFAULT NULL |
| `shipping_address` | text DEFAULT NULL |
| `delivery_date` | datetime DEFAULT NULL |
| `shipping_status` | varchar(191) DEFAULT NULL |
| `delivered_to` | varchar(191) DEFAULT NULL |
| `shipping_charges` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `shipping_custom_field_1` | varchar(191) DEFAULT NULL |
| `shipping_custom_field_2` | varchar(191) DEFAULT NULL |
| `shipping_custom_field_3` | varchar(191) DEFAULT NULL |
| `shipping_custom_field_4` | varchar(191) DEFAULT NULL |
| `shipping_custom_field_5` | varchar(191) DEFAULT NULL |
| `additional_notes` | text DEFAULT NULL |
| `staff_note` | text DEFAULT NULL |
| `is_export` | tinyint(1) NOT NULL DEFAULT 0 |
| `delivery_person` | int(11) DEFAULT NULL |
| `export_custom_fields_info` | longtext DEFAULT NULL |
| `round_off_amount` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `additional_expense_key_1` | varchar(191) DEFAULT NULL |
| `additional_expense_value_1` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `additional_expense_key_2` | varchar(191) DEFAULT NULL |
| `additional_expense_value_2` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `additional_expense_key_3` | varchar(191) DEFAULT NULL |
| `additional_expense_value_3` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `additional_expense_key_4` | varchar(191) DEFAULT NULL |
| `additional_expense_value_4` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `final_total` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `expense_category_id` | int(10) UNSIGNED DEFAULT NULL |
| `expense_sub_category_id` | int(11) DEFAULT NULL |
| `expense_for` | int(10) UNSIGNED DEFAULT NULL |
| `commission_agent` | int(11) DEFAULT NULL |
| `document` | varchar(191) DEFAULT NULL |
| `is_direct_sale` | tinyint(1) NOT NULL DEFAULT 0 |
| `is_suspend` | tinyint(1) NOT NULL DEFAULT 0 |
| `exchange_rate` | decimal(20,3) NOT NULL DEFAULT 1.000 |
| `total_amount_recovered` | decimal(22,4) DEFAULT NULL |
| `transfer_parent_id` | int(11) DEFAULT NULL |
| `return_parent_id` | int(11) DEFAULT NULL |
| `opening_stock_product_id` | int(11) DEFAULT NULL |
| `created_by` | int(10) UNSIGNED NOT NULL |
| `purchase_requisition_ids` | text DEFAULT NULL |
| `woocommerce_order_id` | int(11) DEFAULT NULL |
| `essentials_duration` | decimal(8,2) NOT NULL |
| `essentials_duration_unit` | varchar(20) DEFAULT NULL |
| `essentials_amount_per_unit_duration` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `essentials_allowances` | text DEFAULT NULL |
| `essentials_deductions` | text DEFAULT NULL |
| `prefer_payment_method` | varchar(191) DEFAULT NULL |
| `prefer_payment_account` | int(11) DEFAULT NULL |
| `sales_order_ids` | text DEFAULT NULL |
| `purchase_order_ids` | text DEFAULT NULL |
| `custom_field_1` | varchar(191) DEFAULT NULL |
| `custom_field_2` | varchar(191) DEFAULT NULL |
| `custom_field_3` | varchar(191) DEFAULT NULL |
| `custom_field_4` | varchar(191) DEFAULT NULL |
| `import_batch` | int(11) DEFAULT NULL |
| `import_time` | datetime DEFAULT NULL |
| `types_of_service_id` | int(11) DEFAULT NULL |
| `packing_charge` | decimal(22,4) DEFAULT NULL |
| `packing_charge_type` | enum('fixed','percent') DEFAULT NULL |
| `service_custom_field_1` | text DEFAULT NULL |
| `service_custom_field_2` | text DEFAULT NULL |
| `service_custom_field_3` | text DEFAULT NULL |
| `service_custom_field_4` | text DEFAULT NULL |
| `service_custom_field_5` | text DEFAULT NULL |
| `service_custom_field_6` | text DEFAULT NULL |
| `is_created_from_api` | tinyint(1) NOT NULL DEFAULT 0 |
| `rp_earned` | int(11) NOT NULL DEFAULT 0 |
| `order_addresses` | text DEFAULT NULL |
| `is_recurring` | tinyint(1) NOT NULL DEFAULT 0 |
| `recur_interval` | double(22,4) DEFAULT NULL |
| `recur_interval_type` | enum('days','months','years') DEFAULT NULL |
| `recur_repetitions` | int(11) DEFAULT NULL |
| `recur_stopped_on` | datetime DEFAULT NULL |
| `recur_parent_id` | int(11) DEFAULT NULL |
| `invoice_token` | varchar(191) DEFAULT NULL |
| `pay_term_number` | int(11) DEFAULT NULL |
| `pay_term_type` | enum('days','months') DEFAULT NULL |
| `selling_price_group_id` | int(11) DEFAULT NULL |
| `created_at` | timestamp NULL DEFAULT NULL |
| `updated_at` | timestamp NULL DEFAULT NULL |

**Distinct `type` values:**

| Value | Count |
|---|---:|
| sell | 3242 |
| expense | 2969 |
| opening_stock | 1474 |
| purchase | 963 |
| stock_adjustment | 555 |
| payroll | 218 |
| purchase_return | 1 |
| expense_refund | 1 |

**Distinct `status` values:**

| Value | Count |
|---|---:|
| final | 6394 |
| received | 2429 |
| draft | 37 |
| ordered | 8 |

**Distinct `sub_status` values:**

| Value | Count |
|---|---:|
| quotation | 22 |
| proforma | 4 |

**Distinct `payment_status` values:**

| Value | Count |
|---|---:|
| paid | 8663 |
| due | 110 |
| partial | 73 |

### `products`

**Row count:** 1,669

| Column | Type |
|---|---|
| `id` | int(10) UNSIGNED NOT NULL AUTO_INCREMENT |
| `name` | varchar(191) NOT NULL |
| `business_id` | int(10) UNSIGNED NOT NULL |
| `type` | enum('single','variable','modifier','combo') DEFAULT NULL |
| `unit_id` | int(11) UNSIGNED DEFAULT NULL |
| `secondary_unit_id` | int(11) DEFAULT NULL |
| `sub_unit_ids` | text DEFAULT NULL |
| `brand_id` | int(10) UNSIGNED DEFAULT NULL |
| `category_id` | int(10) UNSIGNED DEFAULT NULL |
| `sub_category_id` | int(10) UNSIGNED DEFAULT NULL |
| `tax` | int(10) UNSIGNED DEFAULT NULL |
| `tax_type` | enum('inclusive','exclusive') NOT NULL |
| `enable_stock` | tinyint(1) NOT NULL DEFAULT 0 |
| `alert_quantity` | decimal(22,4) DEFAULT NULL |
| `sku` | varchar(191) NOT NULL |
| `barcode_type` | enum('C39','C128','EAN13','EAN8','UPCA','UPCE') DEFAULT 'C128' |
| `expiry_period` | decimal(4,2) DEFAULT NULL |
| `expiry_period_type` | enum('days','months') DEFAULT NULL |
| `enable_sr_no` | tinyint(1) NOT NULL DEFAULT 0 |
| `weight` | varchar(191) DEFAULT NULL |
| `product_custom_field1` | varchar(191) DEFAULT NULL |
| `product_custom_field2` | varchar(191) DEFAULT NULL |
| `product_custom_field3` | varchar(191) DEFAULT NULL |
| `product_custom_field4` | varchar(191) DEFAULT NULL |
| `product_custom_field5` | varchar(191) DEFAULT NULL |
| `product_custom_field6` | varchar(191) DEFAULT NULL |
| `product_custom_field7` | varchar(191) DEFAULT NULL |
| `product_custom_field8` | varchar(191) DEFAULT NULL |
| `product_custom_field9` | varchar(191) DEFAULT NULL |
| `product_custom_field10` | varchar(191) DEFAULT NULL |
| `product_custom_field11` | varchar(191) DEFAULT NULL |
| `product_custom_field12` | varchar(191) DEFAULT NULL |
| `product_custom_field13` | varchar(191) DEFAULT NULL |
| `product_custom_field14` | varchar(191) DEFAULT NULL |
| `product_custom_field15` | varchar(191) DEFAULT NULL |
| `product_custom_field16` | varchar(191) DEFAULT NULL |
| `product_custom_field17` | varchar(191) DEFAULT NULL |
| `product_custom_field18` | varchar(191) DEFAULT NULL |
| `product_custom_field19` | varchar(191) DEFAULT NULL |
| `product_custom_field20` | varchar(191) DEFAULT NULL |
| `image` | varchar(191) DEFAULT NULL |
| `woocommerce_media_id` | int(11) DEFAULT NULL |
| `product_description` | text DEFAULT NULL |
| `created_by` | int(10) UNSIGNED NOT NULL |
| `preparation_time_in_minutes` | int(11) DEFAULT NULL |
| `woocommerce_product_id` | int(11) DEFAULT NULL |
| `woocommerce_disable_sync` | tinyint(1) NOT NULL DEFAULT 0 |
| `warranty_id` | int(11) DEFAULT NULL |
| `is_inactive` | tinyint(1) NOT NULL DEFAULT 0 |
| `not_for_selling` | tinyint(1) NOT NULL DEFAULT 0 |
| `created_at` | timestamp NULL DEFAULT NULL |
| `updated_at` | timestamp NULL DEFAULT NULL |

### `variations`

**Row count:** 1,669

| Column | Type |
|---|---|
| `id` | int(10) UNSIGNED NOT NULL AUTO_INCREMENT |
| `name` | varchar(191) NOT NULL |
| `product_id` | int(10) UNSIGNED NOT NULL |
| `sub_sku` | varchar(191) DEFAULT NULL |
| `product_variation_id` | int(10) UNSIGNED NOT NULL |
| `woocommerce_variation_id` | int(11) DEFAULT NULL |
| `variation_value_id` | int(11) DEFAULT NULL |
| `default_purchase_price` | decimal(22,4) DEFAULT NULL |
| `dpp_inc_tax` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `profit_percent` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `default_sell_price` | decimal(22,4) DEFAULT NULL |
| `sell_price_inc_tax` | decimal(22,4) DEFAULT NULL |
| `created_at` | timestamp NULL DEFAULT NULL |
| `updated_at` | timestamp NULL DEFAULT NULL |
| `deleted_at` | timestamp NULL DEFAULT NULL |
| `combo_variations` | text DEFAULT NULL |

### `variation_location_details`

**Row count:** 1,583

| Column | Type |
|---|---|
| `id` | int(10) UNSIGNED NOT NULL AUTO_INCREMENT |
| `product_id` | int(10) UNSIGNED NOT NULL |
| `product_variation_id` | int(10) UNSIGNED NOT NULL |
| `variation_id` | int(10) UNSIGNED NOT NULL |
| `location_id` | int(10) UNSIGNED NOT NULL |
| `qty_available` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `created_at` | timestamp NULL DEFAULT NULL |
| `updated_at` | timestamp NULL DEFAULT NULL |

**qty_available:** non-zero=1,228, zero=355, NULL=0

### `contacts`

**Row count:** 1,695

| Column | Type |
|---|---|
| `id` | int(10) UNSIGNED NOT NULL AUTO_INCREMENT |
| `business_id` | int(10) UNSIGNED NOT NULL |
| `type` | varchar(191) NOT NULL |
| `supplier_business_name` | varchar(191) DEFAULT NULL |
| `name` | varchar(191) DEFAULT NULL |
| `prefix` | varchar(191) DEFAULT NULL |
| `first_name` | varchar(191) DEFAULT NULL |
| `middle_name` | varchar(191) DEFAULT NULL |
| `last_name` | varchar(191) DEFAULT NULL |
| `email` | varchar(191) DEFAULT NULL |
| `contact_id` | varchar(191) DEFAULT NULL |
| `contact_status` | varchar(191) NOT NULL DEFAULT 'active' |
| `tax_number` | varchar(191) DEFAULT NULL |
| `city` | varchar(191) DEFAULT NULL |
| `state` | varchar(191) DEFAULT NULL |
| `country` | varchar(191) DEFAULT NULL |
| `address_line_1` | text DEFAULT NULL |
| `address_line_2` | text DEFAULT NULL |
| `zip_code` | varchar(191) DEFAULT NULL |
| `dob` | date DEFAULT NULL |
| `mobile` | varchar(191) NOT NULL |
| `landline` | varchar(191) DEFAULT NULL |
| `alternate_number` | varchar(191) DEFAULT NULL |
| `pay_term_number` | int(11) DEFAULT NULL |
| `pay_term_type` | enum('days','months') DEFAULT NULL |
| `credit_limit` | decimal(22,4) DEFAULT NULL |
| `created_by` | int(10) UNSIGNED NOT NULL |
| `balance` | decimal(22,4) NOT NULL DEFAULT 0.0000 |
| `total_rp` | int(11) NOT NULL DEFAULT 0 |
| `total_rp_used` | int(11) NOT NULL DEFAULT 0 |
| `total_rp_expired` | int(11) NOT NULL DEFAULT 0 |
| `is_default` | tinyint(1) NOT NULL DEFAULT 0 |
| `shipping_address` | text DEFAULT NULL |
| `shipping_custom_field_details` | longtext DEFAULT NULL |
| `is_export` | tinyint(1) NOT NULL DEFAULT 0 |
| `export_custom_field_1` | varchar(191) DEFAULT NULL |
| `export_custom_field_2` | varchar(191) DEFAULT NULL |
| `export_custom_field_3` | varchar(191) DEFAULT NULL |
| `export_custom_field_4` | varchar(191) DEFAULT NULL |
| `export_custom_field_5` | varchar(191) DEFAULT NULL |
| `export_custom_field_6` | varchar(191) DEFAULT NULL |
| `position` | varchar(191) DEFAULT NULL |
| `customer_group_id` | int(11) DEFAULT NULL |
| `custom_field1` | varchar(191) DEFAULT NULL |
| `custom_field2` | varchar(191) DEFAULT NULL |
| `custom_field3` | varchar(191) DEFAULT NULL |
| `custom_field4` | varchar(191) DEFAULT NULL |
| `custom_field5` | varchar(191) DEFAULT NULL |
| `custom_field6` | varchar(191) DEFAULT NULL |
| `custom_field7` | varchar(191) DEFAULT NULL |
| `custom_field8` | varchar(191) DEFAULT NULL |
| `custom_field9` | varchar(191) DEFAULT NULL |
| `custom_field10` | varchar(191) DEFAULT NULL |
| `deleted_at` | timestamp NULL DEFAULT NULL |
| `created_at` | timestamp NULL DEFAULT NULL |
| `updated_at` | timestamp NULL DEFAULT NULL |

**Contact `type` breakdown:**

| type | Count |
|---|---:|
| customer | 1590 |
| supplier | 100 |
| both | 1 |

### `business_locations`

**Row count:** 9

| Column | Type |
|---|---|
| `id` | int(10) UNSIGNED NOT NULL AUTO_INCREMENT |
| `business_id` | int(10) UNSIGNED NOT NULL |
| `location_id` | varchar(191) DEFAULT NULL |
| `name` | varchar(256) NOT NULL |
| `landmark` | text DEFAULT NULL |
| `country` | varchar(100) NOT NULL |
| `state` | varchar(100) NOT NULL |
| `city` | varchar(100) NOT NULL |
| `zip_code` | char(7) NOT NULL |
| `invoice_scheme_id` | int(10) UNSIGNED NOT NULL |
| `sale_invoice_scheme_id` | int(11) DEFAULT NULL |
| `invoice_layout_id` | int(10) UNSIGNED NOT NULL |
| `sale_invoice_layout_id` | int(11) DEFAULT NULL |
| `selling_price_group_id` | int(11) DEFAULT NULL |
| `print_receipt_on_invoice` | tinyint(1) DEFAULT 1 |
| `receipt_printer_type` | enum('browser','printer') NOT NULL DEFAULT 'browser' |
| `printer_id` | int(11) DEFAULT NULL |
| `mobile` | varchar(191) DEFAULT NULL |
| `alternate_number` | varchar(191) DEFAULT NULL |
| `email` | varchar(191) DEFAULT NULL |
| `website` | varchar(191) DEFAULT NULL |
| `featured_products` | text DEFAULT NULL |
| `is_active` | tinyint(1) NOT NULL DEFAULT 1 |
| `default_payment_accounts` | text DEFAULT NULL |
| `custom_field1` | varchar(191) DEFAULT NULL |
| `custom_field2` | varchar(191) DEFAULT NULL |
| `custom_field3` | varchar(191) DEFAULT NULL |
| `custom_field4` | varchar(191) DEFAULT NULL |
| `deleted_at` | timestamp NULL DEFAULT NULL |
| `created_at` | timestamp NULL DEFAULT NULL |
| `updated_at` | timestamp NULL DEFAULT NULL |

**Location count:** 9 business location(s) — multi-location

### `business`

**Row count:** 1

| Column | Type |
|---|---|
| `id` | int(10) UNSIGNED NOT NULL AUTO_INCREMENT |
| `name` | varchar(191) NOT NULL |
| `currency_id` | int(10) UNSIGNED NOT NULL |
| `start_date` | date DEFAULT NULL |
| `tax_number_1` | varchar(100) DEFAULT NULL |
| `tax_label_1` | varchar(10) DEFAULT NULL |
| `tax_number_2` | varchar(100) DEFAULT NULL |
| `tax_label_2` | varchar(10) DEFAULT NULL |
| `code_label_1` | varchar(191) DEFAULT NULL |
| `code_1` | varchar(191) DEFAULT NULL |
| `code_label_2` | varchar(191) DEFAULT NULL |
| `code_2` | varchar(191) DEFAULT NULL |
| `default_sales_tax` | int(10) UNSIGNED DEFAULT NULL |
| `default_profit_percent` | double(5,2) NOT NULL DEFAULT 0.00 |
| `owner_id` | int(10) UNSIGNED NOT NULL |
| `time_zone` | varchar(191) NOT NULL DEFAULT 'Asia/Kolkata' |
| `fy_start_month` | tinyint(4) NOT NULL DEFAULT 1 |
| `accounting_method` | enum('fifo','lifo','avco') NOT NULL DEFAULT 'fifo' |
| `default_sales_discount` | decimal(5,2) DEFAULT NULL |
| `sell_price_tax` | enum('includes','excludes') NOT NULL DEFAULT 'includes' |
| `logo` | varchar(191) DEFAULT NULL |
| `sku_prefix` | varchar(191) DEFAULT NULL |
| `enable_product_expiry` | tinyint(1) NOT NULL DEFAULT 0 |
| `expiry_type` | enum('add_expiry','add_manufacturing') NOT NULL DEFAULT 'add_expiry' |
| `on_product_expiry` | enum('keep_selling','stop_selling','auto_delete') NOT NULL DEFAULT 'keep_selling' |
| `stop_selling_before` | int(11) NOT NULL |
| `enable_tooltip` | tinyint(1) NOT NULL DEFAULT 1 |
| `purchase_in_diff_currency` | tinyint(1) NOT NULL DEFAULT 0 |
| `purchase_currency_id` | int(10) UNSIGNED DEFAULT NULL |
| `p_exchange_rate` | decimal(20,3) NOT NULL DEFAULT 1.000 |
| `transaction_edit_days` | int(10) UNSIGNED NOT NULL DEFAULT 30 |
| `stock_expiry_alert_days` | int(10) UNSIGNED NOT NULL DEFAULT 30 |
| `keyboard_shortcuts` | text DEFAULT NULL |
| `pos_settings` | text DEFAULT NULL |
| `woocommerce_api_settings` | text DEFAULT NULL |
| `woocommerce_skipped_orders` | text DEFAULT NULL |
| `woocommerce_wh_oc_secret` | varchar(191) DEFAULT NULL |
| `woocommerce_wh_ou_secret` | varchar(191) DEFAULT NULL |
| `woocommerce_wh_od_secret` | varchar(191) DEFAULT NULL |
| `woocommerce_wh_or_secret` | varchar(191) DEFAULT NULL |
| `essentials_settings` | longtext DEFAULT NULL |
| `weighing_scale_setting` | text NOT NULL |
| `enable_brand` | tinyint(1) NOT NULL DEFAULT 1 |
| `enable_category` | tinyint(1) NOT NULL DEFAULT 1 |
| `enable_sub_category` | tinyint(1) NOT NULL DEFAULT 1 |
| `enable_price_tax` | tinyint(1) NOT NULL DEFAULT 1 |
| `enable_purchase_status` | tinyint(1) DEFAULT 1 |
| `enable_lot_number` | tinyint(1) NOT NULL DEFAULT 0 |
| `default_unit` | int(11) DEFAULT NULL |
| `enable_sub_units` | tinyint(1) NOT NULL DEFAULT 0 |
| `enable_racks` | tinyint(1) NOT NULL DEFAULT 0 |
| `enable_row` | tinyint(1) NOT NULL DEFAULT 0 |
| `enable_position` | tinyint(1) NOT NULL DEFAULT 0 |
| `enable_editing_product_from_purchase` | tinyint(1) NOT NULL DEFAULT 1 |
| `sales_cmsn_agnt` | enum('logged_in_user','user','cmsn_agnt') DEFAULT NULL |
| `item_addition_method` | tinyint(1) NOT NULL DEFAULT 1 |
| `enable_inline_tax` | tinyint(1) NOT NULL DEFAULT 1 |
| `currency_symbol_placement` | enum('before','after') NOT NULL DEFAULT 'before' |
| `enabled_modules` | text DEFAULT NULL |
| `date_format` | varchar(191) NOT NULL DEFAULT 'm/d/Y' |
| `time_format` | enum('12','24') NOT NULL DEFAULT '24' |
| `currency_precision` | tinyint(4) NOT NULL DEFAULT 2 |
| `quantity_precision` | tinyint(4) NOT NULL DEFAULT 2 |
| `ref_no_prefixes` | text DEFAULT NULL |
| `theme_color` | char(20) DEFAULT NULL |
| `created_by` | int(11) DEFAULT NULL |
| `enable_rp` | tinyint(1) NOT NULL DEFAULT 0 |
| `rp_name` | varchar(191) DEFAULT NULL |
| `amount_for_unit_rp` | decimal(22,4) NOT NULL DEFAULT 1.0000 |
| `min_order_total_for_rp` | decimal(22,4) NOT NULL DEFAULT 1.0000 |
| `max_rp_per_order` | int(11) DEFAULT NULL |
| `redeem_amount_per_unit_rp` | decimal(22,4) NOT NULL DEFAULT 1.0000 |
| `min_order_total_for_redeem` | decimal(22,4) NOT NULL DEFAULT 1.0000 |
| `min_redeem_point` | int(11) DEFAULT NULL |
| `max_redeem_point` | int(11) DEFAULT NULL |
| `rp_expiry_period` | int(11) DEFAULT NULL |
| `rp_expiry_type` | enum('month','year') NOT NULL DEFAULT 'year' |
| `email_settings` | text DEFAULT NULL |
| `sms_settings` | text DEFAULT NULL |
| `custom_labels` | text DEFAULT NULL |
| `common_settings` | text DEFAULT NULL |
| `is_active` | tinyint(1) NOT NULL DEFAULT 1 |
| `created_at` | timestamp NULL DEFAULT NULL |
| `updated_at` | timestamp NULL DEFAULT NULL |

---

## 4. Data Quality Flags

- **Transaction date range:** 2022-10-26 → 2023-09-28 (9,423 dated rows sampled)
- **Operational history:** 9,423 transactions — appears to be real operational data
- **Test products:** None detected in product name sample
- **Stock quantities (`variation_location_details`):** 1,228 non-zero, 355 zero, 0 NULL (77.6% populated with stock)

---

## 5. Mapping Recommendation

Per established Vonos migration logic (`transactions.type` → target schema):

| Ultimate POS `type` | Target Vonos atom | Notes |
|---|---|---|
| `sell` | Order/Sale | 3,242 rows; Order/Sale + LedgerEntry(revenue) + stock decrement |
| `expense` | LedgerEntry(expense) | 2,969 rows; LedgerEntry(expense) |
| `opening_stock` | Seed Item.quantity via variation_location_details | 1,474 rows; Seed Item.quantity via variation_location_details |
| `purchase` | StockMovement(inbound) | 963 rows; StockMovement(inbound) + LedgerEntry(cost) + supplier link |
| `stock_adjustment` | StockMovement | 555 rows; StockMovement + Item quantity reconcile |
| `payroll` | LedgerEntry(expense) — payroll category | 218 rows; LedgerEntry(expense) — payroll category |
| `purchase_return` | StockMovement(outbound) | 1 rows; StockMovement(outbound) + LedgerEntry adjustment |
| `expense_refund` | **NEEDS NEW CATEGORY** | 1 rows — not in Mechanics/Cafe mapping |

**Unmapped transaction types requiring review:**

- `expense_refund`: 1 rows
