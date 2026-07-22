"use client";

import Link from "next/link";

const HQ6_CHECKLIST: Array<{
  audit: string;
  route: string;
  phase: string;
  component: string;
}> = [
  { audit: "00_home", route: "/VA/overview", phase: "1", component: "Hq6OverviewView" },
  { audit: "01_users", route: "/VA/users", phase: "7", component: "Hq6UsersListView" },
  { audit: "02_roles", route: "/VA/roles", phase: "7", component: "Hq6RolesListView" },
  { audit: "03_sales-commission-agents", route: "/VA/commission-agents", phase: "7", component: "Hq6CommissionAgentsListView" },
  { audit: "04_contacts__type=supplier", route: "/VA/suppliers", phase: "4", component: "WarehouseSuppliersView" },
  { audit: "05_contacts__type=customer", route: "/VA/customers", phase: "4", component: "Hq6CustomersListView" },
  { audit: "06_customer-group", route: "/VA/customer-groups", phase: "4", component: "Hq6CustomerGroupsListView" },
  { audit: "07_contacts__import", route: "/VA/import-contacts", phase: "4", component: "ImportContactsView" },
  { audit: "08_products", route: "/VA/catalog", phase: "2", component: "Hq6ProductsListView" },
  { audit: "09_products__create", route: "/VA/add-product", phase: "2", component: "AddProductView" },
  { audit: "10_update-product-price", route: "/VA/update-price", phase: "2", component: "UpdatePriceView" },
  { audit: "11_labels__show", route: "/VA/print-labels", phase: "2", component: "ListPageShell" },
  { audit: "12_variation-templates", route: "/VA/variations", phase: "2", component: "VariationsListView" },
  { audit: "13_import-products", route: "/VA/import-products", phase: "2", component: "ListPageShell" },
  { audit: "14_import-opening-stock", route: "/VA/import-opening-stock", phase: "2", component: "ListPageShell" },
  { audit: "15_selling-price-group", route: "/VA/price-groups", phase: "2", component: "Hq6CatalogMetaListView" },
  { audit: "16_units", route: "/VA/units", phase: "2", component: "Hq6CatalogMetaListView" },
  { audit: "17_taxonomies__type=product", route: "/VA/categories", phase: "2", component: "Hq6CatalogMetaListView" },
  { audit: "18_brands", route: "/VA/brands", phase: "2", component: "Hq6CatalogMetaListView" },
  { audit: "19_warranties", route: "/VA/warranties", phase: "2", component: "Hq6CatalogMetaListView" },
  { audit: "20_purchase-order", route: "/VA/purchase-orders", phase: "4", component: "ListPageShell" },
  { audit: "21_purchases", route: "/VA/inbound", phase: "4", component: "Hq6PurchasesListView" },
  { audit: "22_purchases__create", route: "/VA/add-purchase", phase: "4", component: "AddPurchaseView" },
  { audit: "23_purchase-return", route: "/VA/purchase-returns", phase: "4", component: "ListPageShell" },
  { audit: "24_sells", route: "/VA/sales", phase: "3", component: "Hq6SalesListView" },
  { audit: "25_sells__create", route: "/VA/add-sale", phase: "3", component: "AddSaleView" },
  { audit: "26_pos", route: "/VA/pos", phase: "3", component: "Hq6PosListView" },
  { audit: "27_pos__create", route: "/VA/pos-terminal", phase: "3", component: "PosTerminalView" },
  { audit: "28_sells__create__status=draft", route: "/VA/add-draft", phase: "3", component: "AddSaleView" },
  { audit: "29_sells__drafts", route: "/VA/drafts", phase: "3", component: "Hq6SalesListView" },
  { audit: "30_sells__create__status=quotation", route: "/VA/add-quotation", phase: "3", component: "AddSaleView" },
  { audit: "31_sells__quotations", route: "/VA/quotations", phase: "3", component: "Hq6SalesListView" },
  { audit: "32_sell-return", route: "/VA/returns", phase: "3", component: "Hq6ReturnsListView" },
  { audit: "33_shipments", route: "/VA/shipments", phase: "3", component: "Hq6SalesListView" },
  { audit: "34_discount", route: "/VA/discounts", phase: "3", component: "Hq6DiscountsListView" },
  { audit: "35_import-sales", route: "/VA/import-sales", phase: "3", component: "ListPageShell" },
  { audit: "36_expenses", route: "/VA/expenses", phase: "4", component: "Hq6ExpensesListView" },
  { audit: "37_expenses__create", route: "/VA/add-expense", phase: "4", component: "AddExpenseView" },
  { audit: "38_expense-categories", route: "/VA/expense-categories", phase: "4", component: "ListPageShell" },
  { audit: "39_account__account", route: "/VA/payment-accounts", phase: "6", component: "ListPageShell" },
  { audit: "40_account__balance-sheet", route: "/VA/balance-sheet", phase: "6", component: "HqReportPageLayout" },
  { audit: "41_account__trial-balance", route: "/VA/trial-balance", phase: "6", component: "HqReportPageLayout" },
  { audit: "42_account__cash-flow", route: "/VA/cash-flow", phase: "6", component: "HqReportPageLayout" },
  { audit: "43_account__payment-account-report", route: "/VA/payment-account-report", phase: "6", component: "HqReportPageLayout" },
  { audit: "44_reports__profit-loss", route: "/VA/reports?report=profit-loss", phase: "6", component: "HqReportPageLayout" },
  { audit: "45_reports__purchase-sell", route: "/VA/reports?report=purchase-sale", phase: "6", component: "HqReportPageLayout" },
  { audit: "46_reports__tax-report", route: "/VA/reports?report=tax", phase: "6", component: "HqReportPageLayout" },
  { audit: "47_reports__customer-supplier", route: "/VA/reports?report=supplier-customer", phase: "6", component: "HqReportPageLayout" },
  { audit: "48_reports__customer-group", route: "/VA/reports?report=customer-groups", phase: "6", component: "HqReportPageLayout" },
  { audit: "49_reports__stock-report", route: "/VA/reports?report=stock", phase: "6", component: "HqReportPageLayout" },
  { audit: "50_reports__trending-products", route: "/VA/reports?report=trending", phase: "6", component: "HqReportPageLayout" },
  { audit: "51_reports__items-report", route: "/VA/reports?report=items", phase: "6", component: "HqReportPageLayout" },
  { audit: "52_reports__product-purchase-report", route: "/VA/reports?report=product-purchase", phase: "6", component: "HqReportPageLayout" },
  { audit: "53_reports__product-sell-report", route: "/VA/reports?report=product-sell", phase: "6", component: "HqReportPageLayout" },
  { audit: "54_reports__purchase-payment-report", route: "/VA/reports?report=purchase-payment", phase: "6", component: "HqReportPageLayout" },
  { audit: "55_reports__sell-payment-report", route: "/VA/reports?report=sell-payment", phase: "6", component: "HqReportPageLayout" },
  { audit: "56_reports__expense-report", route: "/VA/reports?report=expense", phase: "6", component: "HqReportPageLayout" },
  { audit: "57_reports__register-report", route: "/VA/reports?report=register", phase: "6", component: "HqReportPageLayout" },
  { audit: "58_reports__sales-representative-report", route: "/VA/reports?report=sales-rep", phase: "6", component: "HqReportPageLayout" },
  { audit: "59_reports__service-staff-report", route: "/VA/reports?report=service-staff", phase: "6", component: "HqReportPageLayout" },
  { audit: "60_reports__activity-log", route: "/VA/reports?report=activity-log", phase: "6", component: "HqReportPageLayout" },
  { audit: "61_modules__orders", route: "/VA/orders", phase: "7", component: "OrdersListView" },
  { audit: "62_notification-templates", route: "/VA/notification-templates", phase: "5", component: "SettingsSubViews" },
  { audit: "63_business__settings", route: "/VA/settings", phase: "5", component: "SettingsSubViews" },
  { audit: "64_business-location", route: "/VA/locations", phase: "5", component: "ListPageShell" },
  { audit: "65_invoice-schemes", route: "/VA/invoice-settings", phase: "5", component: "SettingsSubViews" },
  { audit: "66_barcodes", route: "/VA/barcode-settings", phase: "5", component: "SettingsSubViews" },
  { audit: "67_printers", route: "/VA/receipt-printers", phase: "5", component: "ListPageShell" },
  { audit: "68_tax-rates", route: "/VA/tax-rates", phase: "5", component: "ListPageShell" },
  { audit: "69_hrm__dashboard", route: "/VA/hrm", phase: "7", component: "HrView" },
  { audit: "70_essentials__todo", route: "/VA/essentials-todo", phase: "1", component: "Hq6EssentialsTodoView" },
];

/** Dev/QA checklist — links all 71 VA routes to ui-audit folders. */
export function Hq6ChecklistView() {
  return (
    <div className="hq6-page">
      <section className="hq6-content-header">
        <h1>
          HQ6 Checklist <small>71 pages · ui-audit screenshot verification</small>
        </h1>
      </section>
      <div className="hq6-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--hq6-border)] bg-[#ecf0f5]">
              <th className="px-3 py-2 text-left">Phase</th>
              <th className="px-3 py-2 text-left">ui-audit folder</th>
              <th className="px-3 py-2 text-left">Route</th>
              <th className="px-3 py-2 text-left">Component</th>
              <th className="px-3 py-2 text-left">Shell</th>
              <th className="px-3 py-2 text-left">Verified</th>
            </tr>
          </thead>
          <tbody>
            {HQ6_CHECKLIST.map((row) => (
              <tr key={row.audit} className="border-b border-[var(--hq6-border)]">
                <td className="px-3 py-2">{row.phase}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.audit}</td>
                <td className="px-3 py-2">
                  <Link href={row.route} className="text-[var(--hq6-blue)] hover:underline">
                    {row.route}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs text-[#666]">{row.component}</td>
                <td className="px-3 py-2 text-[var(--hq6-success)]">✓</td>
                <td className="px-3 py-2 text-[#999]">
                  {[
                    "00_home",
                    "08_products",
                    "21_purchases",
                    "24_sells",
                    "27_pos__create",
                    "44_reports__profit-loss",
                    "63_business__settings",
                    "70_essentials__todo",
                  ].includes(row.audit)
                    ? "✓"
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hq6-footer">
        Reference: hq6.vonosautomarket.com/ui-audit/*/screenshot.png · Mark Verified after
        side-by-side pass
      </p>
    </div>
  );
}
