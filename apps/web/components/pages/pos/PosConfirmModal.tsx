"use client";

import { PosModal } from "./PosModal";

export function PosConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  tone = "primary",
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger" | "success";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmClass =
    tone === "danger"
      ? "tw-dw-btn tw-dw-btn-error tw-text-white"
      : tone === "success"
        ? "tw-dw-btn tw-dw-btn-success tw-text-white"
        : "tw-dw-btn tw-dw-btn-primary tw-text-white";

  return (
    <PosModal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="tw-dw-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={confirmClass}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-foreground">{message}</p>
    </PosModal>
  );
}
