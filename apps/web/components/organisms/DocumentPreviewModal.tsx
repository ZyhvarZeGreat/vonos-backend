"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { Printer, X } from "lucide-react";

export interface DocumentPreviewModalProps {
  open: boolean;
  title: string;
  titleClassName?: string;
  onClose: () => void;
  children: ReactNode;
}

export function DocumentPreviewModal({
  open,
  title,
  titleClassName,
  onClose,
  children,
}: DocumentPreviewModalProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="invoice-print-overlay fixed inset-0 z-50 overflow-y-auto">
      <button
        type="button"
        className="no-print motion-backdrop-in fixed inset-0 bg-black/50"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative flex min-h-full items-start justify-center p-4 print:p-0">
        <div className="invoice-print-dialog motion-dialog-in my-4 w-full max-w-4xl rounded-lg border border-neutral-200 bg-white text-neutral-900 shadow-xl print:my-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none">
          <div className="no-print flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 py-3">
            <p
              className={
                titleClassName ?? "text-sm font-medium text-neutral-900"
              }
            >
              {title}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="motion-press inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-primary,#16a34a)] px-3 py-1.5 text-sm font-medium text-white"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={onClose}
                className="motion-press inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
          </div>
          <div className="invoice-print-root bg-white p-4 print:p-0">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
