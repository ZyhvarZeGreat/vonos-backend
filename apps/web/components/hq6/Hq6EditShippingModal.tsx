"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6Field, Hq6Modal } from "@/components/hq6/Hq6Modal";
import { updateSaleShipping } from "@/lib/api/sales";
import { patchEntityInQueries } from "@/lib/query/optimistic";
import { dismissFirstWrite } from "@/lib/utils/dismissFirstWrite";
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
  const queryClient = useQueryClient();
  const [shippingStatus, setShippingStatus] =
    useState<ShippingStatus>("pending");
  const [shippingAddress, setShippingAddress] = useState("");

  useEffect(() => {
    if (!open || !sale) return;
    setShippingStatus(
      (sale.shippingStatus as ShippingStatus | null) ?? "pending",
    );
    setShippingAddress(sale.shippingAddress ?? "");
  }, [open, sale]);

  const save = async () => {
    if (!tenantId || !sale) return;
    const nextStatus = shippingStatus;
    const nextAddress = shippingAddress.trim() || null;
    // Instant list badge — don't wait for Neon then invalidate.
    patchEntityInQueries(queryClient, ["sales"], sale.id, {
      shippingStatus: nextStatus,
      shippingAddress: nextAddress,
    });
    await dismissFirstWrite({
      dismiss: onClose,
      label: "Updating shipping",
      write: () =>
        updateSaleShipping(tenantId, sale.id, {
          shippingStatus: nextStatus,
          shippingAddress: nextAddress,
        }),
      successMessage: `Shipping updated for ${sale.reference}`,
      errorMessage: "Failed to update shipping",
      onSuccess: () => onSaved?.(),
    });
  };

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={
        sale ? `Edit Shipping — ${sale.reference}` : "Edit Shipping"
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
          <Hq6BusyButton
            className="hq6-modal-btn hq6-modal-btn-save"
            onClick={() => void save()}
            busy={false}
          >
            Update
          </Hq6BusyButton>
        </>
      }
    >
      <div className="space-y-3">
        <Hq6Field label="Shipping Status">
          <select
            className="hq6-modal-input"
            value={shippingStatus}
            onChange={(e) =>
              setShippingStatus(e.target.value as ShippingStatus)
            }
          >
            {SHIPPING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </Hq6Field>
        <Hq6Field label="Shipping Address">
          <textarea
            className="hq6-modal-input min-h-[88px]"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
          />
        </Hq6Field>
      </div>
    </Hq6Modal>
  );
}
