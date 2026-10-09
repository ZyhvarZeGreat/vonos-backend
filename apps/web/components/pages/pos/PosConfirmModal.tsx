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
      ? "cafe-pos-btn cafe-pos-btn--danger"
      : tone === "success"
        ? "cafe-pos-btn cafe-pos-btn--success"
        : "cafe-pos-btn cafe-pos-btn--primary";

  return (
    <PosModal
      open={open}
      title={title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
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
