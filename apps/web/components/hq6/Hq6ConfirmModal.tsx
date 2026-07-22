"use client";

import { Hq6Modal } from "@/components/hq6/Hq6Modal";

export function Hq6ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirming = false,
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirming?: boolean;
  danger?: boolean;
}) {
  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            className={
              danger
                ? "hq6-modal-btn hq6-modal-btn-danger"
                : "hq6-modal-btn hq6-modal-btn-save"
            }
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? "Please wait…" : confirmLabel}
          </button>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-close"
            onClick={onClose}
          >
            Close
          </button>
        </>
      }
    >
      <p className="text-sm text-[#4b5563]">{message}</p>
    </Hq6Modal>
  );
}
