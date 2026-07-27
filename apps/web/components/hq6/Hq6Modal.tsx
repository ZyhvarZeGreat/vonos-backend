"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Hq6ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  bodyClassName?: string;
}

const SIZE_CLASS: Record<NonNullable<Hq6ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
};

function subscribeNoop() {
  return () => undefined;
}

/** True on client from the first paint — no useEffect frame delay before portal. */
function useIsClient() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export function Hq6Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
  bodyClassName,
}: Hq6ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !isClient) return null;

  return createPortal(
    <div
      className={cn(
        "hq6-modal-root fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4",
        className,
      )}
      data-hq6="true"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="hq6-modal-backdrop fixed inset-0"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          "hq6-modal-panel relative z-10 my-auto w-full overflow-hidden",
          SIZE_CLASS[size],
        )}
      >
        <div className="hq6-modal-header">
          <h4 className="hq6-modal-title">{title}</h4>
          <button
            type="button"
            className="hq6-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={cn("hq6-modal-body", bodyClassName)}>{children}</div>
        {footer ? <div className="hq6-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Hq6ModalSaveClose({
  onSave,
  onClose,
  saveLabel = "Save",
  closeLabel = "Close",
  saving = false,
  saveDisabled = false,
}: {
  onSave?: () => void;
  onClose: () => void;
  saveLabel?: string;
  closeLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
}) {
  return (
    <>
      {onSave ? (
        <button
          type="button"
          className="hq6-modal-btn hq6-modal-btn-save"
          disabled={saving || saveDisabled}
          onClick={onSave}
        >
          {saving ? "Saving…" : saveLabel}
        </button>
      ) : null}
      <button
        type="button"
        className="hq6-modal-btn hq6-modal-btn-close"
        onClick={onClose}
      >
        {closeLabel}
      </button>
    </>
  );
}

export function Hq6Field({
  label,
  required,
  children,
  hint,
  className,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("hq6-modal-field", className)}>
      <span>
        {label}
        {required ? ":*" : ":"}
        {hint}
      </span>
      {children}
    </label>
  );
}
