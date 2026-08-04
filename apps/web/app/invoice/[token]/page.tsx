"use client";

import { Suspense, use, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";
import { SaleInvoicePayslipDocument } from "@/components/organisms/SaleInvoicePayslipDocument";
import { getPublicInvoice } from "@/lib/api/publicInvoice";
import {
  VONOS_AUTOMOTIVE_DISCLAIMER,
  VONOS_AUTOMOTIVE_SUPPORT_LINE,
  VONOS_AUTOMOTIVE_TERMS_BODY,
  VONOS_AUTOMOTIVE_TERMS_TITLE,
} from "@/lib/registries/vonosAutomotiveTerms";
import { saleDocumentPrintFileName } from "@/lib/utils/saleDocumentPrintFileName";

function PublicInvoiceContent({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const printOnLoad = searchParams.get("print_on_load") === "true";
  const didAutoPrint = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: () => getPublicInvoice(token),
    enabled: Boolean(token),
    retry: false,
  });

  const printFileName = data?.sale
    ? saleDocumentPrintFileName(data.sale.customerName, "invoice")
    : null;

  useEffect(() => {
    if (!printFileName) return;
    const previous = document.title;
    document.title = printFileName;
    return () => {
      document.title = previous;
    };
  }, [printFileName]);

  useEffect(() => {
    if (!printOnLoad || !data?.sale || didAutoPrint.current) return;
    // Wait until line items are present on the payload (or confirmed empty).
    if (!Array.isArray(data.sale.lines)) return;
    didAutoPrint.current = true;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [data?.sale, printOnLoad]);

  const titleStatus = (data?.sale.paymentStatus ?? "").toLowerCase();
  const pageTitle =
    titleStatus === "paid"
      ? "Invoice PAID"
      : titleStatus === "partial"
        ? "Invoice PARTIAL"
        : "Invoice";

  const handlePrint = () => {
    if (!data?.sale || !Array.isArray(data.sale.lines)) return;
    if (printFileName) document.title = printFileName;
    window.print();
  };

  const canPrint = Boolean(data?.sale && Array.isArray(data.sale.lines));

  return (
    <main className="invoice-print-overlay min-h-screen bg-[#f3f4f6] text-[#111827]">
      <div className="relative flex min-h-full items-start justify-center p-4 print:p-0">
        <div className="invoice-print-dialog my-4 w-full max-w-4xl rounded-lg border border-neutral-200 bg-white shadow-sm print:my-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
          <div className="no-print flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3">
            <p className="truncate text-sm font-medium text-neutral-900">
              {data?.sale ? `${pageTitle} · #${data.sale.reference}` : pageTitle}
            </p>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!canPrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              {isLoading ? "Print" : "Print"}
            </button>
          </div>

          <div className="invoice-print-root bg-white p-4 print:p-0">
            {isLoading ? (
              <p className="p-4 text-sm text-neutral-500">Loading invoice…</p>
            ) : isError || !data?.sale ? (
              <p className="p-4 text-sm text-red-700">Invoice not found.</p>
            ) : (
              <SaleInvoicePayslipDocument
                sale={data.sale}
                tenantName={data.businessName}
                tenantSection={data.businessSection}
                tenantAddress={data.businessAddress || data.businessLocationAddress}
                tenantMobile={data.businessMobile}
                tenantMobileSecondary={data.businessMobileSecondary}
                tenantEmail={data.businessEmail}
                locationLabel={data.businessLocation}
                payments={data.payments}
                termsBody={VONOS_AUTOMOTIVE_TERMS_BODY}
                termsTitle={VONOS_AUTOMOTIVE_TERMS_TITLE}
                disclaimer={VONOS_AUTOMOTIVE_DISCLAIMER}
                supportLine={VONOS_AUTOMOTIVE_SUPPORT_LINE}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f3f4f6] p-8 text-sm text-neutral-500">
          Loading invoice…
        </main>
      }
    >
      <PublicInvoiceContent token={token} />
    </Suspense>
  );
}
