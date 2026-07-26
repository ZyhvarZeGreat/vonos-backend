/**
 * HQ6 Ultimate POS report path segments → Vonos report registry slugs.
 * Audit/compare + live HQ6 use `/reports/{segment}`; registry pages use `report-*`.
 */
export const HQ6_REPORT_PATH_TO_SLUG: Record<string, string> = {
  "profit-loss": "report-profit-loss",
  "purchase-sell": "report-purchase-sale",
  tax: "report-tax",
  "customer-supplier": "report-supplier-customer",
  "customer-group": "report-customer-groups",
  stock: "report-stock",
  "trending-products": "report-trending",
  items: "report-items",
  "product-purchase": "report-product-purchase",
  "product-sell": "report-product-sell",
  "purchase-payment": "report-purchase-payment",
  "sell-payment": "report-sell-payment",
  expense: "report-expense",
  register: "report-register",
  "sales-representative": "report-sales-rep",
  "service-staff": "report-service-staff",
  "activity-log": "report-activity-log",
};

/** Registry slug → HQ6 path segment (for sidebar when HQ6 chrome is on). */
export const REPORT_SLUG_TO_HQ6_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(HQ6_REPORT_PATH_TO_SLUG).map(([path, slug]) => [slug, path]),
);

export function resolveHq6ReportRegistrySlug(
  pathSegment: string,
): string | undefined {
  if (HQ6_REPORT_PATH_TO_SLUG[pathSegment]) {
    return HQ6_REPORT_PATH_TO_SLUG[pathSegment];
  }
  // Already a registry slug (e.g. report-profit-loss)
  if (pathSegment.startsWith("report-")) return pathSegment;
  return undefined;
}
