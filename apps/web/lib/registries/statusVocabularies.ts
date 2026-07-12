export const statusVocabularies = {
  stockStatus: {
    "In Stock": "success",
    "Low Stock": "warning",
    "Out of Stock": "error",
    in_stock: "success",
    low_stock: "warning",
    out_of_stock: "error",
  },
  movementStatus: {
    Pending: "neutral",
    Approved: "info",
    Received: "success",
    Shipped: "info",
    Delivered: "success",
    "In Transit": "info",
    Completed: "success",
    Rejected: "error",
    Fulfilled: "success",
    Cancelled: "error",
  },
  jobStatus: {
    Received: "neutral",
    Quoted: "neutral",
    Approved: "info",
    "In Progress": "info",
    QC: "warning",
    Delivered: "success",
  },
  orderStatus: {
    New: "neutral",
    Preparing: "info",
    Ready: "success",
    Served: "success",
  },
  appointmentStatus: {
    Booked: "neutral",
    Confirmed: "info",
    "In Progress": "info",
    Completed: "success",
    "No-show": "error",
    Cancelled: "error",
  },
  saleReturnStatus: {
    Completed: "success",
    Refunded: "warning",
    Restocked: "info",
    "Written Off": "error",
    Draft: "neutral",
    Quotation: "info",
  },
  userStatus: {
    Active: "success",
    Invited: "info",
    Suspended: "error",
  },
} as const;

export type StatusVocabulary = keyof typeof statusVocabularies;
export type SemanticTone = "success" | "warning" | "error" | "info" | "neutral";

export function getStatusTone(
  vocabulary: StatusVocabulary,
  status: string,
): SemanticTone {
  const map = statusVocabularies[vocabulary] as Record<string, SemanticTone>;
  return map[status] ?? "neutral";
}
