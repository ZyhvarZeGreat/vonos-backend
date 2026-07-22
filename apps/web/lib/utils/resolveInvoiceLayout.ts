import type { InvoiceLayout, InvoiceLayoutDesign, InvoiceSettings } from "@vonos/types";

export function resolveDefaultInvoiceLayout(
  settings: InvoiceSettings | undefined | null,
): InvoiceLayout | null {
  if (!settings?.layouts?.length) return null;
  const byId = settings.defaultLayoutId
    ? settings.layouts.find((l) => l.id === settings.defaultLayoutId)
    : null;
  if (byId) return byId;
  return settings.layouts.find((l) => l.isDefault) ?? settings.layouts[0] ?? null;
}

export function normalizeInvoiceDesign(
  design: string | null | undefined,
): InvoiceLayoutDesign {
  const d = (design ?? "classic").toLowerCase();
  if (d === "slim" || d === "detailed" || d === "elegant") return d;
  return "classic";
}

/** Props to pass into InvoiceDocument from loaded invoice settings. */
export function invoiceDocumentLayoutProps(
  settings: InvoiceSettings | undefined | null,
): {
  design: InvoiceLayoutDesign;
  headerText: string | null;
  footerText: string | null;
  termsText: string | null;
} {
  const layout = resolveDefaultInvoiceLayout(settings);
  return {
    design: normalizeInvoiceDesign(layout?.design),
    headerText: layout?.headerText ?? null,
    footerText: layout?.footerText ?? null,
    termsText: layout?.termsText ?? settings?.termsText ?? null,
  };
}
