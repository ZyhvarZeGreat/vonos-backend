/**
 * Legal letterhead on printed / public sale invoices.
 * Always the group entity — not per-tenant labels (Mechanic, Painting, etc.).
 */
export const VONOS_INVOICE_BUSINESS_NAME = "VONOS GROUP LTD";

export const VONOS_INVOICE_ADDRESS =
  "Vonos plaza, vonos roundabout, fo1, kubwa";

export const VONOS_INVOICE_MOBILE_PRIMARY = "09128690691";
export const VONOS_INVOICE_MOBILE_SECONDARY = "07075179952";
export const VONOS_INVOICE_EMAIL = "operations@vonosgroupltd.com";

/** Section line under the company name (Mechanic / Painting / …). */
export function vonosInvoiceSectionLabel(
  tenantCode?: string | null,
): string | null {
  const code = (tenantCode ?? "").trim().toUpperCase();
  if (code === "VA") return "Section — Mechanic";
  if (code === "VP") return "Section — Painting";
  if (code === "VW") return "Section — Warehouse";
  if (code === "VISP" || code === "VSP") return "Section — Spare Parts";
  if (code === "VC") return "Section — Cafe";
  if (code === "VS") return "Section — Saloon";
  if (code === "VKW") return "Section — Kids Wear";
  return null;
}
