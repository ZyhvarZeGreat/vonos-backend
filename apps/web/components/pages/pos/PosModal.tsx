"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Till dialog. Built on `cafe-pos-*` classes rather than the shared Modal atom
 * because HQ6 injects an unlayered `button { background: transparent }` reset
 * that blanks the atom's backdrop (see styles/cafe-pos.css).
 */
export function PosModal({
  open,
  title,
  onClose,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cafe-pos-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div
        role="presentation"
        className="cafe-pos-modal-scrim"
        onClick={onClose}
      />
      <div
        className={`cafe-pos-modal-panel${size === "sm" ? " cafe-pos-modal-panel--sm" : ""}`}
      >
        <div className="cafe-pos-modal-header">
          <h2 className="cafe-pos-modal-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="cafe-pos-icon-btn h-8 w-8"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="cafe-pos-modal-body">{children}</div>
        {footer ? <div className="cafe-pos-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
