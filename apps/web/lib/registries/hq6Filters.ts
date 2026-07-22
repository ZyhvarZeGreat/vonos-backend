/**
 * HQ6 list-page filter contracts from `hq6.vonosautomarket.com/FILTERS.json`.
 * Labels/types match Ultimate POS; option values are Vonos-side keys.
 */

export type Hq6FilterFieldType = "checkbox" | "select" | "date_range" | "text";

export interface Hq6FilterFieldSpec {
  id: string;
  label: string;
  type: Hq6FilterFieldType;
  /** Static select options (label shown; value is key). Empty = load dynamically. */
  options?: Array<{ value: string; label: string }>;
}

export const HQ6_CUSTOMER_FILTERS: Hq6FilterFieldSpec[] = [
  { id: "sellDue", label: "Sell Due", type: "checkbox" },
  { id: "sellReturn", label: "Sell Return", type: "checkbox" },
  { id: "advanceBalance", label: "Advance Balance", type: "checkbox" },
  { id: "openingBalance", label: "Opening Balance", type: "checkbox" },
  {
    id: "hasNoSellFrom",
    label: "Has no sell from",
    type: "select",
    options: [
      { value: "", label: "Please Select" },
      { value: "1", label: "One month" },
      { value: "3", label: "Three months" },
      { value: "6", label: "Six months" },
      { value: "12", label: "One year" },
    ],
  },
  { id: "customerGroupId", label: "Customer Group", type: "select" },
  { id: "assignedToUserId", label: "Assigned to", type: "select" },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "", label: "None" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

export const HQ6_SUPPLIER_FILTERS: Hq6FilterFieldSpec[] = [
  { id: "purchaseDue", label: "Purchase Due", type: "checkbox" },
  { id: "purchaseReturn", label: "Purchase Return", type: "checkbox" },
  { id: "advanceBalance", label: "Advance Balance", type: "checkbox" },
  { id: "openingBalance", label: "Opening Balance", type: "checkbox" },
  { id: "assignedToUserId", label: "Assigned to", type: "select" },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "", label: "None" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

export const HQ6_PRODUCT_FILTERS: Hq6FilterFieldSpec[] = [
  { id: "notForSelling", label: "Not for selling", type: "checkbox" },
  {
    id: "productType",
    label: "Product Type",
    type: "select",
    options: [
      { value: "", label: "All" },
      { value: "single", label: "Single" },
      { value: "variable", label: "Variable" },
      { value: "combo", label: "Combo" },
    ],
  },
  { id: "category", label: "Category", type: "select" },
  { id: "unit", label: "Unit", type: "select" },
  {
    id: "tax",
    label: "Tax",
    type: "select",
    options: [
      { value: "", label: "All" },
      { value: "VAT", label: "VAT" },
      { value: "WHT/VAT", label: "WHT/VAT" },
    ],
  },
  { id: "brand", label: "Brand", type: "select" },
  { id: "locationCode", label: "Business Location", type: "select" },
];

export const HQ6_SALE_FILTERS: Hq6FilterFieldSpec[] = [
  { id: "locationCode", label: "Business Location", type: "select" },
  { id: "customerId", label: "Customer", type: "select" },
];

export const HQ6_PURCHASE_FILTERS: Hq6FilterFieldSpec[] = [
  { id: "locationCode", label: "Business Location", type: "select" },
  { id: "supplierId", label: "Supplier", type: "select" },
  {
    id: "status",
    label: "Purchase Status",
    type: "select",
    options: [
      { value: "", label: "All" },
      { value: "Received", label: "Received" },
      { value: "Pending", label: "Pending" },
      { value: "Ordered", label: "Ordered" },
    ],
  },
  {
    id: "paymentStatus",
    label: "Payment Status",
    type: "select",
    options: [
      { value: "", label: "All" },
      { value: "paid", label: "Paid" },
      { value: "due", label: "Due" },
      { value: "partial", label: "Partial" },
      { value: "overdue", label: "Overdue" },
    ],
  },
  { id: "dateRange", label: "Date Range", type: "date_range" },
];

export const HQ6_EXPENSE_FILTERS: Hq6FilterFieldSpec[] = [
  { id: "locationCode", label: "Business Location", type: "select" },
  { id: "expenseForCustomerId", label: "Expense for", type: "select" },
  { id: "createdById", label: "Added By", type: "select" },
  { id: "contactCustomerId", label: "Contact", type: "select" },
];

export const HQ6_TODO_FILTERS: Hq6FilterFieldSpec[] = [
  { id: "assignedTo", label: "Assigned To", type: "select" },
  {
    id: "priority",
    label: "Priority",
    type: "select",
    options: [
      { value: "", label: "All" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "urgent", label: "Urgent" },
    ],
  },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "", label: "All" },
      { value: "new", label: "New" },
      { value: "in_progress", label: "In-Progress" },
      { value: "on_hold", label: "On Hold" },
      { value: "completed", label: "Completed" },
    ],
  },
  { id: "dateRange", label: "Date Range", type: "date_range" },
];
