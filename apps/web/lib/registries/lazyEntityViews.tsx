"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { DataTableSkeleton } from "@/components/organisms/skeletons";

function PageChunkFallback() {
  return (
    <div className="space-y-6">
      <DataTableSkeleton rows={8} columns={5} />
    </div>
  );
}

type AnyComponent = ComponentType<Record<string, unknown>>;

function lazyNamed(
  loader: () => Promise<Record<string, unknown>>,
  exportName: string,
): AnyComponent {
  return dynamic(
    () =>
      loader().then((mod) => {
        const Comp = mod[exportName];
        if (typeof Comp !== "function") {
          throw new Error(`lazyNamed: missing export "${exportName}"`);
        }
        return { default: Comp as AnyComponent };
      }),
    { loading: PageChunkFallback },
  );
}

/** Code-split page views — keeps tenant layout from shipping every screen upfront. */
export const FinanceView = lazyNamed(
  () => import("@/components/pages/FinanceView"),
  "FinanceView",
);
export const WarehouseInventoryView = lazyNamed(
  () => import("@/components/pages/WarehouseInventoryView"),
  "WarehouseInventoryView",
);
export const Hq6ProductsListView = lazyNamed(
  () => import("@/components/pages/Hq6ProductsListView"),
  "Hq6ProductsListView",
);
export const Hq6ChecklistView = lazyNamed(
  () => import("@/components/pages/Hq6ChecklistView"),
  "Hq6ChecklistView",
);
export const Hq6EssentialsTodoView = lazyNamed(
  () => import("@/components/pages/Hq6EssentialsTodoView"),
  "Hq6EssentialsTodoView",
);
export const WarehouseTransfersView = lazyNamed(
  () => import("@/components/pages/WarehouseTransfersView"),
  "WarehouseTransfersView",
);
export const WarehouseSuppliersView = lazyNamed(
  () => import("@/components/pages/WarehouseSuppliersView"),
  "WarehouseSuppliersView",
);
export const EntityReportsView = lazyNamed(
  () => import("@/components/pages/EntityReportsView"),
  "EntityReportsView",
);
export const MovementListView = lazyNamed(
  () => import("@/components/pages/MovementListView"),
  "MovementListView",
);
export const PurchaseOrdersView = lazyNamed(
  () => import("@/components/pages/MovementListView"),
  "PurchaseOrdersView",
);
export const PurchaseReturnsView = lazyNamed(
  () => import("@/components/pages/MovementListView"),
  "PurchaseReturnsView",
);
export const ReportRunView = lazyNamed(
  () => import("@/components/pages/ReportRunView"),
  "ReportRunView",
);
export const KidsWearInventoryView = lazyNamed(
  () => import("@/components/pages/KidsWearInventoryView"),
  "KidsWearInventoryView",
);
export const JobsListView = lazyNamed(
  () => import("@/components/pages/JobsListView"),
  "JobsListView",
);
export const SalesListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "SalesListView",
);
export const DraftsListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "DraftsListView",
);
export const QuotationsListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "QuotationsListView",
);
export const OrdersListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "OrdersListView",
);
export const CustomersListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "CustomersListView",
);
export const ReturnsListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "ReturnsListView",
);
export const VehiclesListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "VehiclesListView",
);
export const RequisitionsListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "RequisitionsListView",
);
export const IncomingRequisitionsListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "IncomingRequisitionsListView",
);
export const MenuItemsListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "MenuItemsListView",
);
export const ServicesListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "ServicesListView",
);
export const CatalogListView = lazyNamed(
  () => import("@/components/pages/EntityListViews"),
  "CatalogListView",
);
export const KitchenDisplayView = lazyNamed(
  () => import("@/components/pages/KitchenDisplayView"),
  "KitchenDisplayView",
);
export const TableManagementView = lazyNamed(
  () => import("@/components/pages/TableManagementView"),
  "TableManagementView",
);
export const AppointmentsCalendarView = lazyNamed(
  () => import("@/components/pages/AppointmentsCalendarView"),
  "AppointmentsCalendarView",
);
export const StylistScheduleView = lazyNamed(
  () => import("@/components/pages/AppointmentsCalendarView"),
  "StylistScheduleView",
);
export const HrView = lazyNamed(
  () => import("@/components/pages/HrView"),
  "HrView",
);
export const UsersView = lazyNamed(
  () => import("@/components/pages/HrView"),
  "UsersView",
);
export const LocationsView = lazyNamed(
  () => import("@/components/pages/LocationsView"),
  "LocationsView",
);
export const SettingsView = lazyNamed(
  () => import("@/components/pages/UsersSettingsViews"),
  "SettingsView",
);
export const AddOrderView = lazyNamed(
  () => import("@/components/pages/AddSaleView"),
  "AddOrderView",
);
export const AddDraftView = lazyNamed(
  () => import("@/components/pages/AddSaleView"),
  "AddDraftView",
);
export const AddQuotationView = lazyNamed(
  () => import("@/components/pages/AddSaleView"),
  "AddQuotationView",
);
export const AddSaleView = lazyNamed(
  () => import("@/components/pages/AddSaleView"),
  "AddSaleView",
);
export const DiscountsListView = lazyNamed(
  () => import("@/components/pages/PosExtrasViews"),
  "DiscountsListView",
);
export const ListPosView = lazyNamed(
  () => import("@/components/pages/PosExtrasViews"),
  "ListPosView",
);
export const PrintLabelsView = lazyNamed(
  () => import("@/components/pages/PosExtrasViews"),
  "PrintLabelsView",
);
export const ShipmentsListView = lazyNamed(
  () => import("@/components/pages/PosExtrasViews"),
  "ShipmentsListView",
);
export const UpdatePriceView = lazyNamed(
  () => import("@/components/pages/PosExtrasViews"),
  "UpdatePriceView",
);
export const VariationsListView = lazyNamed(
  () => import("@/components/pages/PosExtrasViews"),
  "VariationsListView",
);
export const AddProductView = lazyNamed(
  () => import("@/components/pages/AddProductView"),
  "AddProductView",
);
export const PaymentsListView = lazyNamed(
  () => import("@/components/pages/PosNavViews"),
  "PaymentsListView",
);
export const AccountBookView = lazyNamed(
  () => import("@/components/pages/PosNavViews"),
  "AccountBookView",
);
export const PosTerminalView = lazyNamed(
  () => import("@/components/pages/PosTerminalView"),
  "PosTerminalView",
);
export const CatalogMetaListView = lazyNamed(
  () => import("@/components/pages/CatalogMetaListView"),
  "CatalogMetaListView",
);
export const RolesListView = lazyNamed(
  () => import("@/components/pages/UserManagementViews"),
  "RolesListView",
);
export const CommissionAgentsListView = lazyNamed(
  () => import("@/components/pages/UserManagementViews"),
  "CommissionAgentsListView",
);
export const CustomerGroupsListView = lazyNamed(
  () => import("@/components/pages/ContactsGroupViews"),
  "CustomerGroupsListView",
);
export const ImportContactsView = lazyNamed(
  () => import("@/components/pages/ContactsGroupViews"),
  "ImportContactsView",
);
export const ImportExpenseView = lazyNamed(
  () => import("@/components/pages/ContactsGroupViews"),
  "ImportExpenseView",
);
export const ImportOpeningStockView = lazyNamed(
  () => import("@/components/pages/ContactsGroupViews"),
  "ImportOpeningStockView",
);
export const ImportProductsView = lazyNamed(
  () => import("@/components/pages/ContactsGroupViews"),
  "ImportProductsView",
);
export const ImportSalesView = lazyNamed(
  () => import("@/components/pages/ContactsGroupViews"),
  "ImportSalesView",
);
export const AddExpenseView = lazyNamed(
  () => import("@/components/pages/ExpensesViews"),
  "AddExpenseView",
);
export const ExpenseCategoriesListView = lazyNamed(
  () => import("@/components/pages/ExpensesViews"),
  "ExpenseCategoriesListView",
);
export const ExpensesListView = lazyNamed(
  () => import("@/components/pages/ExpensesViews"),
  "ExpensesListView",
);
export const PaymentAccountReportView = lazyNamed(
  () => import("@/components/pages/PaymentAccountViews"),
  "PaymentAccountReportView",
);
export const PaymentAccountsListView = lazyNamed(
  () => import("@/components/pages/PaymentAccountViews"),
  "PaymentAccountsListView",
);
export const AddPurchaseView = lazyNamed(
  () => import("@/components/pages/AddPurchaseView"),
  "AddPurchaseView",
);
export const PayrollView = lazyNamed(
  () => import("@/components/pages/PayrollView"),
  "PayrollView",
);
export const InvoicesListView = lazyNamed(
  () => import("@/components/pages/InvoicesListView"),
  "InvoicesListView",
);
export const HrmPageView = lazyNamed(
  () => import("@/components/pages/HrmPageView"),
  "HrmPageView",
);
export const InvoiceSettingsView = lazyNamed(
  () => import("@/components/pages/SettingsSubViews"),
  "InvoiceSettingsView",
);
export const BarcodeSettingsView = lazyNamed(
  () => import("@/components/pages/SettingsSubViews"),
  "BarcodeSettingsView",
);
export const ReceiptPrintersView = lazyNamed(
  () => import("@/components/pages/SettingsSubViews"),
  "ReceiptPrintersView",
);
export const TaxRatesListView = lazyNamed(
  () => import("@/components/pages/SettingsSubViews"),
  "TaxRatesListView",
);

export { PageChunkFallback };
