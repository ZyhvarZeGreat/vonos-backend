"use client";

import { useEffect, useState } from "react";
import { Hq6Field, Hq6Modal } from "@/components/hq6/Hq6Modal";
import { updateSaleShipping } from "@/lib/api/sales";
import { toast } from "@/stores/toastStore";
import {
  SHIPPING_STATUSES,
  type Sale,
  type ShippingStatus,
} from "@vonos/types";

export function Hq6EditShippingModal({
  open,
  tenantId,
  sale,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string | null;
  sale: Sale | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>("pending");
  const [shippingAddress, setShippingAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !sale) return;
    setShippingStatus(
      (sale.shippingStatus as ShippingStatus | null) ?? "pending",
    );
    setShippingAddress(sale.shippingAddress ?? "");
  }, [open, sale]);

  const save = async () => {
    if (!tenantId || !sale || saving) return;
    setSaving(true);
    try {
      await updateSaleShipping(tenantId, sale.id, {
        shippingStatus,
        shippingAddress: shippingAddress.trim() || null,
      });
      toast.success(`Shipping updated for ${sale.reference}`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update shipping",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={
        sale
          ? `Edit Shipping — ${sale.reference}`
          : "Edit Shipping"
      }
      size="md"
      footer={
        <>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-close"
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-save"
            onClick={() => void save()}
            disabled={saving || !sale}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Hq6Field label="Shipping Status" required>
          <select
            className="hq6-modal-input"
            value={shippingStatus}
            onChange={(e) =>
              setShippingStatus(e.target.value as ShippingStatus)
            }
          >
            {SHIPPING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </Hq6Field>
        <Hq6Field label="Shipping Address">
          <textarea
            className="hq6-modal-input"
            rows={3}
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            placeholder="Delivery address"
          />
        </Hq6Field>
      </div>
    </Hq6Modal>
  );
}
