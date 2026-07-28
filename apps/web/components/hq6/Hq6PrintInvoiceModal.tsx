"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { businessLocationName } from "@/lib/utils/locationLabels";
import { stripHtmlToText } from "@/lib/utils/stripHtml";
import {
  VONOS_AUTOMOTIVE_DISCLAIMER,
  VONOS_AUTOMOTIVE_SUPPORT_LINE,
  VONOS_AUTOMOTIVE_TERMS_BODY,
  VONOS_AUTOMOTIVE_TERMS_TITLE,
} from "@/lib/registries/vonosAutomotiveTerms";

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
 * Print Invoice — uses the same bordered tabular shell as payslips
 * (`PayrollPayslipDocument` / `SaleInvoicePayslipDocument`).
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
  const { tenantId: routeTenantId, config, tenantName } = useRouteTenant();
  const effectiveTenantId = tenantId ?? routeTenantId;

  const seeded =
    initialSale && saleId && initialSale.id === saleId
      ? seedToDetail(initialSale)
      : null;

  const { data: bundle, isLoading } = useQuery({
    queryKey: modalKeys.saleView(effectiveTenantId, saleId),
    queryFn: () => getSaleView(saleId!, effectiveTenantId!),
    enabled: Boolean(open && effectiveTenantId && saleId),
    staleTime: MODAL_RECORD_STALE_MS,
  });

  const { data: invoiceSettings } = useQuery({
    queryKey: modalKeys.invoiceSettings(effectiveTenantId),
    queryFn: getInvoiceSettings,
    enabled: Boolean(open && effectiveTenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  const sale = bundle?.sale?.id === saleId ? bundle.sale : seeded;
  const payments = bundle?.sale?.id === saleId ? (bundle.payments ?? []) : [];
  const didAutoPrint = useRef(false);

  useEffect(() => {
    if (!open) {
      didAutoPrint.current = false;
      return;
    }
    if (!autoPrint || !sale || didAutoPrint.current) return;
    didAutoPrint.current = true;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [autoPrint, open, sale]);

  const business = config?.businessSettings?.business as
    | Record<string, unknown>
    | undefined;
  const businessName =
    (typeof business?.name === "string" && business.name) ||
    tenantName ||
    config?.name ||
    "Vonos Autos";
  const businessAddress =
    (typeof business?.landmark === "string" && business.landmark) ||
    (typeof business?.city === "string" && business.city) ||
    "";
  const businessMobile =
    (typeof business?.mobile === "string" && business.mobile) ||
    (typeof business?.phone === "string" && business.phone) ||
    "";
  const businessEmail =
    typeof business?.email === "string" ? business.email : "";

  const locationLabel = businessLocationName(
    sale?.locationCode ?? null,
    config?.businessLocations,
  );

  const termsFromSettings = stripHtmlToText(invoiceSettings?.termsText ?? "");
  const termsBody = termsFromSettings || VONOS_AUTOMOTIVE_TERMS_BODY;
  const modalTitle = invoiceTitle(sale, kind);

  return (
    <DocumentPreviewModal
      open={open}
      title={modalTitle}
      onClose={onClose}
      showBack
      onBack={onClose}
      backLabel="Back"
    >
      {!sale ? (
        <p className="p-4 text-sm text-[#6b7280]">
          {isLoading ? "Loading…" : "Sale not found."}
        </p>
      ) : kind === "terms" ? (
        <div className="invoice-print-root mx-auto max-w-[210mm] border border-neutral-300 bg-white p-7 print:border-0">
          <p className="mb-4 text-center text-[12px] text-neutral-500">
            Invoice No. #{sale.reference.replace(/^#/, "")}
          </p>
          <FormattedTermsBlock
            title={VONOS_AUTOMOTIVE_TERMS_TITLE}
            body={termsBody}
          />
        </div>
      ) : (
        <div className="invoice-print-root p-2 sm:p-4">
          <SaleInvoicePayslipDocument
            sale={sale}
            tenantName={businessName}
            tenantAddress={businessAddress || null}
            tenantMobile={businessMobile || null}
            tenantEmail={businessEmail || null}
            locationLabel={locationLabel}
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
