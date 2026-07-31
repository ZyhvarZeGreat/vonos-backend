/** Browser "Save as PDF" uses `document.title` as the default filename. */
export type SalePrintDocKind =
  | "invoice"
  | "packing_slip"
  | "delivery_note"
  | "terms";

/**
 * User convention: "[Customer Name] invoice.pdf" (Mr/Miss/Mrs/company as stored).
 */
export function saleDocumentPrintFileName(
  customerName: string | null | undefined,
  kind: SalePrintDocKind = "invoice",
): string {
  const raw = (customerName ?? "").trim() || "Customer";
  const safe = raw
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const suffix =
    kind === "packing_slip"
      ? "packing slip"
      : kind === "delivery_note"
        ? "delivery note"
        : kind === "terms"
          ? "terms"
          : "invoice";

  return `${safe} ${suffix}`;
}
