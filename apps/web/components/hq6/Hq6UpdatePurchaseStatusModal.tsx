"use client";

import { useEffect, useState } from "react";
import type { MovementStatus, StockMovementListRow } from "@vonos/types";
import { MOVEMENT_STATUSES } from "@vonos/types";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { updateStockMovementStatus } from "@/lib/api/stockMovements";
import { parsePurchaseNotes } from "@/lib/utils/purchaseNotes";
import { toast } from "@/stores/toastStore";

const PURCHASE_STATUS_OPTIONS: MovementStatus[] = [
  "Ordered",
  "Pending",
  "Received",
  "Delivered",
];

type Props = {
  open: boolean;
  purchase: StockMovementListRow | null;
  onClose: () => void;
  onUpdated?: (status: MovementStatus) => void;
};

/**
 * HQ6 Update Purchase Status — status select + notes context (UPOS-style).
 */
export function Hq6UpdatePurchaseStatusModal({
  open,
  purchase,
  onClose,
  onUpdated,
}: Props) {
  const [status, setStatus] = useState<MovementStatus>("Received");
  const [saving, setSaving] = useState(false);

  const parsed = parsePurchaseNotes(purchase?.notes);

  useEffect(() => {
    if (!open || !purchase) return;
    const current = purchase.status;
    setStatus(
      (PURCHASE_STATUS_OPTIONS.includes(current)
        ? current
        : MOVEMENT_STATUSES.includes(current)
          ? current
          : "Received") as MovementStatus,
    );
  }, [open, purchase]);

  const handleUpdate = async () => {
    if (!purchase) return;
    setSaving(true);
    try {
      await updateStockMovementStatus(purchase.id, status);
      toast.success(`Status → ${status}`);
      onUpdated?.(status);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Hq6Modal
      open={open && Boolean(purchase)}
      onClose={onClose}
      title="Update Status"
      size="sm"
      footer={
        <Hq6ModalSaveClose
          saveLabel="Update"
          onSave={() => void handleUpdate()}
          onClose={onClose}
          saving={saving}
          saveDisabled={!purchase || status === purchase.status}
        />
      }
    >
      {purchase ? (
        <div className="space-y-3">
          <Hq6Field label="Purchase Status" required>
            <select
              className="hq6-form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as MovementStatus)}
            >
              {PURCHASE_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Hq6Field>

          <div>
            <div className="mb-1 text-xs font-semibold text-[#374151]">
              Additional Notes
            </div>
            <p className="hq6-purchase-note-well min-h-[2.5rem] whitespace-pre-wrap">
              {parsed.additionalNotes || "—"}
            </p>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-[#374151]">
              Payment note
            </div>
            <p className="hq6-purchase-note-well min-h-[2.5rem] whitespace-pre-wrap">
              {parsed.paymentNote || "—"}
            </p>
          </div>
        </div>
      ) : null}
    </Hq6Modal>
  );
}
