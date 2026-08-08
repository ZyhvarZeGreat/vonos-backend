"use client";

import { EmptyState } from "@/components/atoms/EmptyState";
import { CatalogMetaListView } from "@/components/pages/CatalogMetaListView";
import { PosTerminalView } from "@/components/pages/PosTerminalView";
import { Hq6ImportContactsView } from "@/components/pages/Hq6ImportContactsView";
import { Hq6ImportProductsView } from "@/components/pages/Hq6ImportProductsView";
import { Hq6ImportOpeningStockView } from "@/components/pages/Hq6ImportOpeningStockView";

export { PaymentsListView, Hq6PaymentsListView } from "@/components/pages/Hq6PaymentsListView";
export { AccountBookView } from "@/components/pages/Hq6AccountBookView";

export function createPosPlaceholderView(title: string, message?: string) {
  return function PosPlaceholderView() {
    return (
      <EmptyState
        title={title}
        message={
          message ??
          "This section is not available yet. Contact your administrator if you need access."
        }
      />
    );
  };
}

export const PosPlaceholderViews = {
  pos: createPosPlaceholderView("List POS"),
  "pos-terminal": PosTerminalView,
  "add-draft": createPosPlaceholderView("Add Draft"),
  drafts: createPosPlaceholderView("List Drafts"),
  "add-quotation": createPosPlaceholderView("Add Quotation"),
  quotations: createPosPlaceholderView("List Quotations"),
  shipments: createPosPlaceholderView("Shipments"),
  discounts: createPosPlaceholderView("Discounts"),
  "import-sales": createPosPlaceholderView("Import Sales", "Bulk sales import is not available yet."),
  "add-product": createPosPlaceholderView("Add Product"),
  "update-price": createPosPlaceholderView("Update Price"),
  "print-labels": createPosPlaceholderView("Print Labels"),
  variations: createPosPlaceholderView("Variations"),
  "import-products": Hq6ImportProductsView,
  "import-opening-stock": Hq6ImportOpeningStockView,
  "import-contacts": Hq6ImportContactsView,
  "price-groups": () => <CatalogMetaListView kind="price-groups" />,
  units: () => <CatalogMetaListView kind="units" />,
  categories: () => <CatalogMetaListView kind="categories" />,
  brands: () => <CatalogMetaListView kind="brands" />,
  warranties: () => <CatalogMetaListView kind="warranties" />,
  "balance-sheet": createPosPlaceholderView("Balance Sheet"),
  "trial-balance": createPosPlaceholderView("Trial Balance"),
  "cash-flow": createPosPlaceholderView("Cash Flow"),
  "payment-account-report": createPosPlaceholderView("Payment Account Report"),
};
