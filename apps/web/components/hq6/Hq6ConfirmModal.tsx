"use client";

import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { cn } from "@/lib/utils/cn";

export function Hq6ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Close",
  confirming = false,
  danger = false,
  /** SweetAlert-style centered warning (matches UPOS delete payment). */
  alertStyle = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  danger?: boolean;
  alertStyle?: boolean;
}) {
  if (alertStyle) {
    return (
      <Hq6Modal
        open={open}
        onClose={onClose}
        title=""
        size="sm"
        hideHeader
        footer={
          <div className="flex w-full justify-end gap-2">
            <button
              type="button"
              className="hq6-modal-btn hq6-modal-btn-cancel"
              disabled={confirming}
              onClick={onClose}
            >
              {cancelLabel === "Close" ? "Cancel" : cancelLabel}
            </button>
            <Hq6BusyButton
              className="hq6-modal-btn hq6-modal-btn-danger"
              busy={confirming}
              busyLabel="Please wait…"
              onClick={onConfirm}
            >
              {confirmLabel === "Confirm" ? "OK" : confirmLabel}
            </Hq6BusyButton>
          </div>
        }
      >
        <div className="flex flex-col items-center px-2 pb-1 pt-4 text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#f8bb86]"
            aria-hidden
          >
            <span className="text-4xl font-light leading-none text-[#f8bb86]">
              !
            </span>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-[#595959]">
            {title}
          </h3>
          <p className="text-sm text-[#797979]">{message}</p>
        </div>
      </Hq6Modal>
    );
  }

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-close"
            disabled={confirming}
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <Hq6BusyButton
            className={cn(
              danger
                ? "hq6-modal-btn hq6-modal-btn-danger"
                : "hq6-modal-btn hq6-modal-btn-save",
            )}
            busy={confirming}
            busyLabel="Please wait…"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Hq6BusyButton>
        </div>
      }
    >
      <p className="text-sm text-[#4b5563]">{message}</p>
    </Hq6Modal>
  );
}
