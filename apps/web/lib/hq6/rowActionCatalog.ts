/**
 * Source of truth for HQ6 row Actions menus.
 * List views must keep these ids/labels/order — unit + e2e suites assert them.
 */

export type Hq6RowActionSpec = {
  id: string;
  label: string;
  danger?: boolean;
  dividerBefore?: boolean;
};

export type SaleRowKind = "finalized" | "draft" | "quotation";

export function saleRowActions(
  kind: SaleRowKind,
  opts: { canAddPayment: boolean },
): Hq6RowActionSpec[] {
  const isProvisional = kind !== "finalized";
  const isQuotation = kind === "quotation";
  const items: Hq6RowActionSpec[] = [
    { id: "view", label: "View" },
    { id: "edit", label: "Edit" },
  ];

  if (!isProvisional && opts.canAddPayment) {
    items.push(
      { id: "add_payment", label: "Add Payment", dividerBefore: true },
      { id: "view_payments", label: "View Payments" },
    );
  } else {
    items.push({
      id: "view_payments",
      label: "View Payments",
      dividerBefore: true,
    });
  }

  if (isProvisional) {
    items.push({
      id: "convert",
      label: "Convert to Proforma Invoice",
    });
  }

  items.push(
    { id: "delete", label: "Delete", danger: true },
    { id: "edit_shipping", label: "Edit Shipping" },
    { id: "print", label: "Print Invoice" },
    { id: "packing_slip", label: "Packing Slip" },
    { id: "delivery_note", label: "Delivery Note" },
    { id: "sell_return", label: "Sell Return" },
    {
      id: "invoice_url",
      label: isQuotation ? "View quote url" : "Invoice URL",
    },
    {
      id: "notify",
      label: isQuotation
        ? "New quotation notification"
        : kind === "draft"
          ? "New draft notification"
          : "New Sale Notification",
    },
    { id: "terms", label: "Terms and Conditions" },
  );

  if (isProvisional) {
    items.push({
      id: "copy_quotation",
      label: isQuotation ? "Copy Quotation" : "Copy Draft",
    });
  }

  return items;
}

export function purchaseRowActions(opts: {
  canAddPayment: boolean;
}): Hq6RowActionSpec[] {
  const items: Hq6RowActionSpec[] = [
    { id: "view", label: "View" },
    { id: "print", label: "Print" },
    { id: "edit", label: "Edit" },
  ];
  if (opts.canAddPayment) {
    items.push({
      id: "add_payment",
      label: "Add Payment",
      dividerBefore: true,
    });
  }
  items.push(
    {
      id: "view_payments",
      label: "View Payments",
      dividerBefore: !opts.canAddPayment,
    },
    { id: "delete", label: "Delete", danger: true },
    { id: "labels", label: "Labels" },
    { id: "purchase_return", label: "Purchase Return" },
    { id: "update_status", label: "Update Status" },
    { id: "items_received", label: "Items Received Notification" },
  );
  return items;
}

export function expenseRowActions(opts?: {
  canAddPayment?: boolean;
}): Hq6RowActionSpec[] {
  const canPay = opts?.canAddPayment !== false;
  const items: Hq6RowActionSpec[] = [
    { id: "view", label: "View" },
    { id: "edit", label: "Edit" },
  ];
  if (canPay) {
    items.push(
      { id: "add_payment", label: "Add Payment", dividerBefore: true },
      { id: "view_payments", label: "View Payments" },
    );
  } else {
    items.push({
      id: "view_payments",
      label: "View Payments",
      dividerBefore: true,
    });
  }
  items.push({ id: "delete", label: "Delete", danger: true });
  return items;
}

export function productRowActions(opts: {
  priceCatalogOnly: boolean;
}): Hq6RowActionSpec[] {
  const items: Hq6RowActionSpec[] = [
    { id: "labels", label: "Labels" },
    { id: "view", label: "View" },
    { id: "edit", label: "Edit" },
    { id: "delete", label: "Delete", danger: true },
  ];
  if (!opts.priceCatalogOnly) {
    items.push(
      {
        id: "opening_stock",
        label: "Add or edit opening stock",
        dividerBefore: true,
      },
      { id: "move_product", label: "Move product" },
      { id: "stock_history", label: "Product stock history" },
    );
  }
  items.push({ id: "duplicate", label: "Duplicate Product" });
  return items;
}

export function customerRowActions(status?: string | null): Hq6RowActionSpec[] {
  return [
    { id: "pay", label: "Pay" },
    { id: "view", label: "View" },
    { id: "edit", label: "Edit" },
    { id: "delete", label: "Delete", danger: true },
    {
      id: "deactivate",
      label: status === "inactive" ? "Activate" : "Deactivate",
    },
    { id: "ledger", label: "Ledger", dividerBefore: true },
    { id: "sales", label: "Sales" },
    { id: "documents", label: "Documents & Note" },
  ];
}

export function supplierRowActions(status?: string | null): Hq6RowActionSpec[] {
  return [
    { id: "pay", label: "Pay" },
    { id: "view", label: "View" },
    { id: "edit", label: "Edit" },
    { id: "delete", label: "Delete", danger: true },
    {
      id: "deactivate",
      label: status === "inactive" ? "Activate" : "Deactivate",
    },
    { id: "ledger", label: "Ledger", dividerBefore: true },
    { id: "purchases", label: "Purchases" },
    { id: "stock_report", label: "Stock Report" },
    { id: "documents", label: "Documents & Note" },
  ];
}

export function returnRowActions(): Hq6RowActionSpec[] {
  return [
    { id: "view", label: "View" },
    { id: "print", label: "Print" },
    { id: "packing_slip", label: "Packing Slip" },
    { id: "delivery_note", label: "Delivery Note" },
  ];
}

/** Every action id that can appear in any HQ6 list Actions menu. */
export function allCatalogActionIds(): string[] {
  const ids = new Set<string>();
  for (const spec of [
    ...saleRowActions("finalized", { canAddPayment: true }),
    ...saleRowActions("draft", { canAddPayment: false }),
    ...saleRowActions("quotation", { canAddPayment: false }),
    ...purchaseRowActions({ canAddPayment: true }),
    ...expenseRowActions(),
    ...productRowActions({ priceCatalogOnly: false }),
    ...customerRowActions("active"),
    ...supplierRowActions("active"),
    ...returnRowActions(),
  ]) {
    ids.add(spec.id);
  }
  return [...ids];
}
