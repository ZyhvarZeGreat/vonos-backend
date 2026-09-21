"use client";

import { useEffect, useMemo, useState } from "react";
import type { Sale, SaleDetail } from "@vonos/types";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import {
  getSale,
  updateSaleWorkshopStatus,
} from "@/lib/api/sales";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

const ALL_STAGES = [
  "Received",
  "Quoted",
  "Approved",
  "In Progress",
  "QC",
  "Delivered",
] as const;

function readSaleJobStatus(notes: string | null | undefined): string {
  if (!notes?.trim()) return "Received";
  const match = notes.match(/^Job status:\s*(.+)$/im);
  const raw = match?.[1]?.trim();
  return raw || "Received";
}

type Props = {
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
  onUpdated?: () => void;
};

/**
 * VA / VP All Sales → update workshop stage on the sale itself
 * (sales act as jobs — no Job row required).
 */
export function Hq6UpdateJobStatusModal({
  open,
  sale,
  onClose,
  onUpdated,
}: Props) {
  const tenantId = useTenantId();
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Received");
  const [notes, setNotes] = useState("");
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const currentStatus = detail
    ? readSaleJobStatus(detail.notes)
    : "Received";

  const statusOptions = useMemo(() => {
    // Quoted only when a linked job has a quote; otherwise skip that stage.
    if (detail?.jobId) {
      // Keep Quoted available when a job is linked (job may or may not have quote;
      // server validates against hasQuote).
      return [...ALL_STAGES];
    }
    return ALL_STAGES.filter((s) => s !== "Quoted");
  }, [detail?.jobId]);

  useEffect(() => {
    if (!open || !sale || !tenantId) {
      setDetail(null);
      setLoadError("");
      setNotes("");
      setNotifyWhatsApp(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setNotes("");
    setNotifyWhatsApp(true);

    void (async () => {
      try {
        const loaded = await getSale(sale.id, tenantId);
        if (cancelled) return;
        setDetail(loaded);
        setStatus(readSaleJobStatus(loaded.notes));
      } catch (err) {
        if (cancelled) return;
        setDetail(null);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load sale",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, sale, tenantId]);

  const handleUpdate = async () => {
    if (!detail || !tenantId || !sale) return;
    const trimmedNotes = notes.trim();
    if (status === currentStatus && !trimmedNotes) {
      toast.error("Change the status or add a note");
      return;
    }
    setSaving(true);
    try {
      const result = await updateSaleWorkshopStatus(tenantId, sale.id, {
        status,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
        notifyWhatsApp: status !== currentStatus ? notifyWhatsApp : false,
      });
      toast.success(
        status !== currentStatus
          ? `Sale ${sale.reference}: status → ${status}`
          : `Sale ${sale.reference}: notes saved`,
      );
      const wa = result.whatsappNotify;
      if (wa?.sent) {
        toast.success("WhatsApp update sent to customer");
      } else if (wa?.channel === "wa_me" && wa.waMeUrl) {
        toast.success("Opening WhatsApp…");
        window.open(wa.waMeUrl, "_blank", "noopener,noreferrer");
      } else if (wa?.error && notifyWhatsApp && status !== currentStatus) {
        toast.error(wa.error);
      }
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update sale status",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Hq6Modal
      open={open && Boolean(sale)}
      onClose={onClose}
      title="Update sale status"
      size="md"
      footer={
        <Hq6ModalSaveClose
          saveLabel="Update"
          onSave={() => void handleUpdate()}
          onClose={onClose}
          saving={saving}
          saveDisabled={!detail || loading || Boolean(loadError)}
        />
      }
    >
      {loading ? (
        <p className="text-sm text-[#6b7280]">Loading sale status…</p>
      ) : loadError ? (
        <p className="text-sm text-[#b91c1c]">{loadError}</p>
      ) : detail ? (
        <div className="space-y-3">
          <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm">
            <div>
              <span className="font-semibold text-[#374151]">Sale:</span>{" "}
              {sale?.reference ?? detail.reference}
            </div>
            {detail.customerName ? (
              <div className="text-[#6b7280]">{detail.customerName}</div>
            ) : null}
            <div className="text-xs text-[#6b7280]">
              Current: {currentStatus}
            </div>
          </div>

          <Hq6Field label="Sale status" required>
            <select
              className="hq6-form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Hq6Field>

          <Hq6Field label="Notes (optional)">
            <textarea
              className="hq6-form-input min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal note for this status change"
            />
          </Hq6Field>

          {status !== currentStatus ? (
            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
              />
              Notify customer on WhatsApp with tracking link
            </label>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[#6b7280]">Sale not found.</p>
      )}
    </Hq6Modal>
  );
}
