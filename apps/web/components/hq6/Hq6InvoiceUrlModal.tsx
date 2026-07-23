"use client";

import { useQuery } from "@tanstack/react-query";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { getSaleInvoiceUrl } from "@/lib/api/sales";

/** HQ6 “Invoice URL” modal — public share link without login. */
export function Hq6InvoiceUrlModal({
  open,
  tenantId,
  saleId,
  invoiceNo,
  onClose,
}: {
  open: boolean;
  tenantId: string | null;
  saleId: string | null;
  invoiceNo?: string | null;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sale-invoice-url", tenantId, saleId],
    queryFn: () => getSaleInvoiceUrl(tenantId!, saleId!),
    enabled: Boolean(open && tenantId && saleId),
  });

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const url = data?.path ? `${origin}${data.path}` : "";

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={
        invoiceNo
          ? `Invoice URL - Invoice No.: ${invoiceNo}`
          : "Invoice URL"
      }
      size="md"
      footer={
        <>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-close"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-view"
            disabled={!url}
            onClick={() => {
              if (!url) return;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            View
          </button>
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-[#6b7280]">Loading invoice link…</p>
      ) : isError ? (
        <p className="text-sm text-[#b91c1c]">Could not load invoice URL.</p>
      ) : (
        <div className="space-y-2">
          <input
            className="hq6-modal-input w-full"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
          />
          <p className="text-sm text-[#6b7280]">
            Link to view the invoice without login.
          </p>
        </div>
      )}
    </Hq6Modal>
  );
}
