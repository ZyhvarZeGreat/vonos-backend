"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Sale, SaleDetail } from "@vonos/types";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import {
  FormattedTermsBlock,
  SaleInvoicePayslipDocument,
} from "@/components/organisms/SaleInvoicePayslipDocument";
import { getSaleView } from "@/lib/api/sales";
import { getInvoiceSettings } from "@/lib/api/invoiceSettings";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { seedSaleViewSideCaches } from "@/lib/query/seedSaleViewCaches";
import { stripHtmlToText } from "@/lib/utils/stripHtml";
import {
  VONOS_INVOICE_ADDRESS,
  VONOS_INVOICE_BUSINESS_NAME,
  VONOS_INVOICE_EMAIL,
  VONOS_INVOICE_MOBILE_PRIMARY,
  VONOS_INVOICE_MOBILE_SECONDARY,
  vonosInvoiceSectionLabel,
} from "@/lib/branding";
import {
  VONOS_AUTOMOTIVE_DISCLAIMER,
  VONOS_AUTOMOTIVE_SUPPORT_LINE,
  VONOS_AUTOMOTIVE_TERMS_BODY,
  VONOS_AUTOMOTIVE_TERMS_TITLE,
} from "@/lib/registries/vonosAutomotiveTerms";
import { saleDocumentPrintFileName } from "@/lib/utils/saleDocumentPrintFileName";

export type Hq6PrintDocKind =
  | "invoice"
  | "packing_slip"
  | "delivery_note"
  | "terms";

function seedToDetail(seed: Sale): SaleDetail {
  return { ...seed, lines: [] };
}

function invoiceTitle(sale: SaleDetail | null, kind: Hq6PrintDocKind): string {
  if (kind === "packing_slip") return "Packing Slip";
  if (kind === "delivery_note") return "Delivery Note";
  if (kind === "terms") return "Terms and Conditions";
  if (!sale) return "Invoice";
  const status = (sale.paymentStatus ?? "").toLowerCase();
  if (status === "paid") return "Invoice PAID";
  if (status === "partial") return "Invoice PARTIAL";
  return "Invoice";
}

/**
 * Print Invoice — waits for full sale detail (line items) before auto-print.
 * Does not replace the document with a loading % overlay.
 */
export function Hq6PrintInvoiceModal({
  open,
  saleId,
  initialSale = null,
  kind = "invoice",
  autoPrint = false,
  onClose,
}: {
  open: boolean;
  saleId: string | null;
  initialSale?: Sale | null;
  kind?: Hq6PrintDocKind;
  autoPrint?: boolean;
  onClose: () => void;
}) {
  const tenantId = useTenantId();
  const { tenantId: routeTenantId, config, tenantCode } = useRouteTenant();
  const effectiveTenantId = tenantId ?? routeTenantId;

  const seeded =
    initialSale && saleId && initialSale.id === saleId
      ? seedToDetail(initialSale)
      : null;

  const queryClient = useQueryClient();
  const { data: bundle, isError } = useQuery({
    queryKey: modalKeys.saleView(effectiveTenantId, saleId),
    queryFn: async () => {
      const data = await getSaleView(saleId!, effectiveTenantId!);
      seedSaleViewSideCaches(queryClient, effectiveTenantId!, data);
      return data;
    },
    enabled: Boolean(open && effectiveTenantId && saleId),
    staleTime: MODAL_RECORD_STALE_MS,
  });

  const { data: invoiceSettings } = useQuery({
    queryKey: modalKeys.invoiceSettings(effectiveTenantId),
    queryFn: getInvoiceSettings,
    enabled: Boolean(open && effectiveTenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  /** Fetched detail only — list seeds have empty `lines` and must not print. */
  const detailSale = bundle?.sale?.id === saleId ? bundle.sale : null;
  const payments = detailSale ? (bundle?.payments ?? []) : [];
  const itemsReady = Boolean(detailSale && Array.isArray(detailSale.lines));
  const displaySale = detailSale ?? seeded;
  const titleSale = displaySale;
  const didAutoPrint = useRef(false);
  const printLoading = open && !isError && !itemsReady;

  useEffect(() => {
    if (!open) {
      didAutoPrint.current = false;
      return;
    }
    if (
      !autoPrint ||
      !itemsReady ||
      !detailSale ||
      printLoading ||
      didAutoPrint.current
    ) {
      return;
    }
    didAutoPrint.current = true;
    const fileName = saleDocumentPrintFileName(detailSale.customerName, kind);
    const previous = document.title;
    document.title = fileName;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => {
      window.clearTimeout(timer);
      document.title = previous;
    };
  }, [autoPrint, detailSale, itemsReady, kind, open, printLoading]);

  const businessName = VONOS_INVOICE_BUSINESS_NAME;
  const letterheadAddress = VONOS_INVOICE_ADDRESS;
  const letterheadMobile = VONOS_INVOICE_MOBILE_PRIMARY;
  const letterheadMobileSecondary = VONOS_INVOICE_MOBILE_SECONDARY;
  const letterheadEmail = VONOS_INVOICE_EMAIL;
  const letterheadSection = vonosInvoiceSectionLabel(
    tenantCode ?? config?.code,
  );

  const termsFromSettings = stripHtmlToText(invoiceSettings?.termsText ?? "");
  const termsBody = termsFromSettings || VONOS_AUTOMOTIVE_TERMS_BODY;
  const modalTitle = invoiceTitle(titleSale, kind);
  const printFileName = titleSale
    ? saleDocumentPrintFileName(titleSale.customerName, kind)
    : null;
  const printLabel =
    kind === "packing_slip" ||
    kind === "delivery_note" ||
    kind === "terms"
      ? "Print"
      : "Print Invoice";

  return (
    <DocumentPreviewModal
      open={open}
      title={modalTitle}
      onClose={onClose}
      showBack
      onBack={onClose}
      backLabel="Back"
      printFileName={printFileName}
      printDisabled={!itemsReady}
      printLabel={printLabel}
    >
      {isError && !displaySale ? (
        <p className="p-4 text-sm text-red-700">Sale not found.</p>
      ) : !displaySale ? (
        <div className="p-6 text-sm text-neutral-500">Preparing invoice…</div>
      ) : kind === "terms" ? (
        <div className="invoice-print-root mx-auto max-w-[210mm] border border-neutral-300 bg-white p-7 print:border-0">
          <p className="mb-3 text-[10px] text-neutral-500">
            Invoice No. #{displaySale.reference.replace(/^#/, "")}
          </p>
          <FormattedTermsBlock
            title={VONOS_AUTOMOTIVE_TERMS_TITLE}
            body={termsBody}
            finePrint
          />
        </div>
      ) : (
        <div className="invoice-print-root p-2 sm:p-4">
          <SaleInvoicePayslipDocument
            sale={displaySale}
            tenantName={businessName}
            tenantSection={letterheadSection}
            tenantAddress={letterheadAddress}
            tenantMobile={letterheadMobile}
            tenantMobileSecondary={letterheadMobileSecondary}
            tenantEmail={letterheadEmail}
            payments={payments}
            termsBody={termsBody}
            termsTitle={VONOS_AUTOMOTIVE_TERMS_TITLE}
            disclaimer={VONOS_AUTOMOTIVE_DISCLAIMER}
            supportLine={VONOS_AUTOMOTIVE_SUPPORT_LINE}
            kind={kind}
            className="invoice-print-root"
          />
        </div>
      )}
    </DocumentPreviewModal>
  );
}
