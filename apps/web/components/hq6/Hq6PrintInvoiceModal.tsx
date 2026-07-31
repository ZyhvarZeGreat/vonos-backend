"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Sale, SaleDetail } from "@vonos/types";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import {
  FormattedTermsBlock,
  SaleInvoicePayslipDocument,
} from "@/components/organisms/SaleInvoicePayslipDocument";
import { Hq6LoadProgress } from "@/components/hq6/Hq6LoadProgress";
import { getSaleView } from "@/lib/api/sales";
import { getInvoiceSettings } from "@/lib/api/invoiceSettings";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useSimulatedLoadPercent } from "@/lib/hooks/useSimulatedLoadPercent";
import {
  MODAL_RECORD_STALE_MS,
  MODAL_REF_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import {
  businessLocationName,
  formatBusinessLocationAddress,
  resolveBusinessLocation,
} from "@/lib/utils/locationLabels";
import { stripHtmlToText } from "@/lib/utils/stripHtml";
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
 * Print Invoice — waits for full sale detail (line items) before print.
 * Shows Loading 0–100% while invoice lines / settings load.
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

  const { data: bundle, isLoading, isFetching, isError } = useQuery({
    queryKey: modalKeys.saleView(effectiveTenantId, saleId),
    queryFn: () => getSaleView(saleId!, effectiveTenantId!),
    enabled: Boolean(open && effectiveTenantId && saleId),
    staleTime: MODAL_RECORD_STALE_MS,
  });

  const { data: invoiceSettings, isLoading: settingsLoading } = useQuery({
    queryKey: modalKeys.invoiceSettings(effectiveTenantId),
    queryFn: getInvoiceSettings,
    enabled: Boolean(open && effectiveTenantId),
    staleTime: MODAL_REF_STALE_MS,
  });

  /** Fetched detail only — list seeds have empty `lines` and must not print. */
  const detailSale = bundle?.sale?.id === saleId ? bundle.sale : null;
  const payments = detailSale ? (bundle?.payments ?? []) : [];
  const itemsReady = Boolean(detailSale && Array.isArray(detailSale.lines));
  const titleSale = detailSale ?? seeded;
  const didAutoPrint = useRef(false);
  const printLoading =
    open &&
    !isError &&
    (!itemsReady || isLoading || (isFetching && !detailSale) || settingsLoading);
  const loadPercent = useSimulatedLoadPercent(printLoading);

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

  const location = resolveBusinessLocation(
    detailSale?.locationCode ?? titleSale?.locationCode ?? null,
    config?.businessLocations,
  );
  const locationLabel =
    location?.name ??
    businessLocationName(
      detailSale?.locationCode ?? titleSale?.locationCode ?? null,
      config?.businessLocations,
    );
  const locationAddress = formatBusinessLocationAddress(location);
  const letterheadAddress =
    [locationLabel, locationAddress].filter(Boolean).join(", ") ||
    businessAddress ||
    null;
  const letterheadMobile = location?.mobile?.trim() || businessMobile || null;
  const letterheadEmail = location?.email?.trim() || businessEmail || null;

  const termsFromSettings = stripHtmlToText(invoiceSettings?.termsText ?? "");
  const termsBody = termsFromSettings || VONOS_AUTOMOTIVE_TERMS_BODY;
  const modalTitle = invoiceTitle(titleSale, kind);
  const printFileName = titleSale
    ? saleDocumentPrintFileName(titleSale.customerName, kind)
    : null;
  const printDisabled = printLoading;
  const printLabel =
    kind === "packing_slip"
      ? "Print"
      : kind === "delivery_note"
        ? "Print"
        : kind === "terms"
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
      printDisabled={printDisabled}
      printDisabledLabel={
        printDisabled ? `Loading ${loadPercent}%` : undefined
      }
      printLabel={printLabel}
    >
      {isError && !detailSale ? (
        <p className="p-4 text-sm text-red-700">Sale not found.</p>
      ) : printLoading || !detailSale ? (
        <Hq6LoadProgress
          percent={loadPercent}
          label="Loading invoice"
          className="px-4"
        />
      ) : kind === "terms" ? (
        <div className="invoice-print-root mx-auto max-w-[210mm] border border-neutral-300 bg-white p-7 print:border-0">
          <p className="mb-3 text-[10px] text-neutral-500">
            Invoice No. #{detailSale.reference.replace(/^#/, "")}
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
            sale={detailSale}
            tenantName={businessName}
            tenantAddress={letterheadAddress}
            tenantMobile={letterheadMobile}
            tenantEmail={letterheadEmail}
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
