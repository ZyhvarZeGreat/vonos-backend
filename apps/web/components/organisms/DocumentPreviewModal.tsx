"use client";

import { createPortal } from "react-dom";
import { useEffect, type ReactNode } from "react";
import { ArrowLeft, Printer, X } from "lucide-react";

export interface DocumentPreviewModalProps {
  open: boolean;
  title: string;
  titleClassName?: string;
  onClose: () => void;
  children: ReactNode;
  /** Back returns to the previous screen (defaults to onClose). */
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
  /**
   * Default "Save as PDF" filename (via document.title).
   * Omit the .pdf extension — the browser adds it.
   */
  printFileName?: string | null;
  /** When true, Print is disabled (e.g. invoice lines still loading). */
  printDisabled?: boolean;
  printDisabledLabel?: string;
  /** Bottom primary print button label (HQ6 Sell Details uses "Print Invoice"). */
  printLabel?: string;
}

/**
 * Print preview shell — HQ6 footer actions match Ultimate POS sell view:
 * Print Invoice (blue) + Close (gray) at the bottom.
 */
export function DocumentPreviewModal({
  open,
  title,
  titleClassName,
  onClose,
  children,
  showBack = false,
  onBack,
  backLabel = "Back",
  printFileName = null,
  printDisabled = false,
  printDisabledLabel,
  printLabel = "Print Invoice",
}: DocumentPreviewModalProps) {
  useEffect(() => {
    if (!open || !printFileName || typeof document === "undefined") return;
    const previous = document.title;
    document.title = printFileName;
    return () => {
      document.title = previous;
    };
  }, [open, printFileName]);

  if (!open || typeof document === "undefined") return null;

  const handleBack = onBack ?? onClose;

  const handlePrint = () => {
    if (printDisabled) return;
    if (printFileName) {
      document.title = printFileName;
    }
    window.print();
  };

  return createPortal(
    <div
      className="invoice-print-overlay fixed inset-0 z-50 overflow-y-auto"
      data-hq6="true"
    >
      <button
        type="button"
        className="no-print motion-backdrop-in fixed inset-0 bg-black/50"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative flex min-h-full items-start justify-center p-4 print:p-0">
        <div className="invoice-print-dialog motion-dialog-in my-4 flex w-full max-w-4xl flex-col rounded-lg border border-neutral-200 bg-white text-neutral-900 shadow-xl print:my-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
          <div className="no-print flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              {showBack ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="hq6-modal-btn hq6-modal-btn-close inline-flex items-center gap-1"
                  aria-label={backLabel}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{backLabel}</span>
                </button>
              ) : null}
              <p
                className={
                  titleClassName ??
                  "truncate text-sm font-medium text-neutral-900"
                }
              >
                {title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hq6-modal-close"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="invoice-print-root flex-1 bg-white p-4 print:p-0">
            {children}
          </div>

          <div className="hq6-modal-footer no-print">
            <button
              type="button"
              onClick={handlePrint}
              disabled={printDisabled}
              className="hq6-modal-btn hq6-modal-btn-print"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              {printDisabled && printDisabledLabel
                ? printDisabledLabel
                : printLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="hq6-modal-btn hq6-modal-btn-close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
