"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Info } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { downloadCsv } from "@/lib/utils/exportCsv";
import { exportTablePdf } from "@/lib/utils/exportPdf";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils/cn";

type ExportFormat = "csv" | "pdf";

export function ExportDocumentModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const exportCopy = useUiStore((state) => state.exportCopy);
  const exportPayload = useUiStore((state) => state.exportPayload);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [error, setError] = useState<string | null>(null);
  const open = activeModal === "export";

  const handleExport = () => {
    if (!exportPayload || exportPayload.rows.length === 0) {
      setError("No data available to export from this view.");
      return;
    }
    if (format === "pdf") {
      try {
        exportTablePdf(exportPayload);
        toast.success("PDF export opened — choose Save as PDF in the print dialog");
        setError(null);
        closeModal();
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF export failed");
      }
      return;
    }
    downloadCsv(exportPayload);
    toast.success("CSV export started");
    setError(null);
    closeModal();
  };

  const handleClose = () => {
    setError(null);
    closeModal();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader
        title={exportCopy.title}
        subtitle={exportCopy.subtitle}
        onClose={handleClose}
      />
      <div className="space-y-4 px-4 pb-2">
        {(
          [
            {
              id: "csv" as const,
              label: "Spreadsheet (CSV)",
              description: "Opens in Excel, Google Sheets, or Numbers",
              icon: FileSpreadsheet,
            },
            {
              id: "pdf" as const,
              label: "PDF",
              description: "Opens print dialog — choose Save as PDF",
              icon: FileText,
            },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFormat(option.id)}
            className={cn(
              "flex w-full items-center justify-between rounded border px-3 py-4 text-left transition-colors",
              format === option.id
                ? "border-foreground/20 bg-[var(--color-surface-muted)]"
                : "border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-nav-hover)]",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-success-bg)] text-success">
                <option.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted">{option.description}</p>
              </div>
            </div>
            <div
              className={cn(
                "h-[18px] w-[18px] rounded-full border-2",
                format === option.id ? "border-foreground bg-foreground" : "border-muted",
              )}
            />
          </button>
        ))}
        <div className="flex items-center gap-2 text-xs text-muted">
          <Info className="h-4 w-4 shrink-0" />
          CSV exports the current view. Open the file in Excel or Google Sheets.
        </div>
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleExport}>
          Export
        </Button>
      </ModalFooter>
    </Modal>
  );
}
