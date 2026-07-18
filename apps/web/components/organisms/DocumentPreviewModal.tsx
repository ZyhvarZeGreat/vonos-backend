"use client";

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
  if (!open) return null;

  return (
    <div className="invoice-print-overlay fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="invoice-print-dialog my-4 w-full max-w-4xl rounded-lg border border-border bg-card shadow-xl">
        <div className="no-print flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p
            className={
              titleClassName ?? "text-sm font-medium text-foreground"
            }
          >
            {title}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-brand-primary)] px-3 py-1.5 text-sm font-medium text-white"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
