"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4",
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="hq6-modal-backdrop absolute inset-0"
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
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="hq6-modal-field">
      <span>
        {label}
        {required ? ":*" : ":"}
        {hint}
      </span>
      {children}
    </label>
  );
}
