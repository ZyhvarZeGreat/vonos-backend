"use client";

import { useQuery } from "@tanstack/react-query";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { getJobTrackUrl, notifyJobWhatsApp } from "@/lib/api/jobs";
import { getSaleTrackUrl, notifySaleWhatsApp } from "@/lib/api/sales";
import { copyTextToClipboard } from "@/lib/utils/copyTextToClipboard";
import { toast } from "@/stores/toastStore";

/** HQ6 “Track job URL” modal — public share link without login. */
export function Hq6JobTrackUrlModal({
  open,
  tenantId,
  jobId,
  saleId,
  jobReference,
  onClose,
}: {
  open: boolean;
  tenantId: string | null;
  /** Direct job id (Jobs list / job detail). */
  jobId?: string | null;
  /** Sale id — VA/VP sales act as jobs (All Sales). */
  saleId?: string | null;
  jobReference?: string | null;
  onClose: () => void;
}) {
  const resolvedJobId = jobId ?? null;
  const resolvedSaleId = saleId ?? null;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "job-track-url",
      tenantId,
      resolvedJobId,
      resolvedSaleId,
    ],
    queryFn: async () => {
      if (resolvedJobId) {
        return getJobTrackUrl(tenantId!, resolvedJobId);
      }
      return getSaleTrackUrl(tenantId!, resolvedSaleId!);
    },
    enabled: Boolean(
      open && tenantId && (resolvedJobId || resolvedSaleId),
    ),
    retry: false,
  });

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const url = data?.path ? `${origin}${data.path}` : data?.url ?? "";

  const canWhatsApp = Boolean(
    resolvedJobId ||
      resolvedSaleId ||
      (data && "jobId" in data && data.jobId),
  );

  const handleWhatsApp = () => {
    if (resolvedJobId) {
      void notifyJobWhatsApp(resolvedJobId).then((result) => {
        if (result.waMeUrl) {
          window.open(result.waMeUrl, "_blank", "noopener,noreferrer");
        }
      });
      return;
    }
    if (resolvedSaleId && tenantId) {
      void notifySaleWhatsApp(tenantId, resolvedSaleId).then((result) => {
        if (result.waMeUrl) {
          window.open(result.waMeUrl, "_blank", "noopener,noreferrer");
        }
      });
      return;
    }
    const linkedJobId =
      data && "jobId" in data ? (data as { jobId?: string | null }).jobId : null;
    if (linkedJobId) {
      void notifyJobWhatsApp(linkedJobId).then((result) => {
        if (result.waMeUrl) {
          window.open(result.waMeUrl, "_blank", "noopener,noreferrer");
        }
      });
    }
  };

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={
        jobReference
          ? `Track job URL - ${jobReference}`
          : "Track job URL"
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
            disabled={!url || !canWhatsApp}
            onClick={handleWhatsApp}
          >
            WhatsApp
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
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-view"
            disabled={!url}
            onClick={() => {
              if (!url) return;
              void copyTextToClipboard(url).then((ok) => {
                if (ok) toast.success("Tracking link copied");
                else toast.error("Could not copy — select the link and copy manually");
              });
            }}
          >
            Copy
          </button>
        </>
      }
    >
      {isLoading ? (
        <p className="text-sm text-[#6b7280]">Loading track link…</p>
      ) : isError ? (
        <p className="text-sm text-[#b91c1c]">
          {error instanceof Error
            ? error.message
            : "Could not load track URL."}
        </p>
      ) : (
        <div className="space-y-2">
          <input
            className="hq6-modal-input w-full"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
          />
          <p className="text-sm text-[#6b7280]">
            Link for the customer to track workshop progress without login.
          </p>
        </div>
      )}
    </Hq6Modal>
  );
}
