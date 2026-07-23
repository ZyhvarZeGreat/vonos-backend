"use client";

import { useState, type MouseEvent } from "react";
import { Download } from "lucide-react";
import type { CsvImportResult } from "@vonos/types";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { toast } from "@/stores/toastStore";

export type Hq6ImportColumn = {
  n: number;
  name: string;
  instruction: string;
};

/** Strip "(Required)" / "(Optional)" suffixes for CSV header row. */
function csvHeaderFromColumnName(name: string): string {
  return name
    .replace(/\s*\((?:Required|Optional)(?:[^)]*)\)\s*$/i, "")
    .trim();
}

function buildTemplateCsv(columns: Hq6ImportColumn[]): string {
  const headers = columns.map((col) => {
    const header = csvHeaderFromColumnName(col.name);
    return header.includes(",") ? `"${header}"` : header;
  });
  return `${headers.join(",")}\n`;
}

export function Hq6GuideImportPage({
  title,
  submitLabel = "Submit",
  uploadReviewLabel,
  columns,
  numberedInstructions,
  historyTitle,
  historyColumns,
  templateHref,
  onImport,
}: {
  title: string;
  submitLabel?: string;
  /** When set, primary button uses this label (Import Sales). */
  uploadReviewLabel?: string;
  columns: Hq6ImportColumn[];
  numberedInstructions?: string[];
  historyTitle?: string;
  historyColumns?: string[];
  templateHref?: string;
  onImport?: (csv: string) => Promise<CsvImportResult>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Choose a file to import");
      return;
    }
    if (!onImport) {
      toast.info("Import parsing is ready — wire the API endpoint to finish uploads.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const csv = await file.text();
      const importResult = await onImport(csv);
      setResult(importResult);
      const applied = importResult.created + importResult.updated;
      if (importResult.errors.length > 0) {
        toast.success(
          `Imported ${applied} row(s) · ${importResult.errors.length} error(s)`,
        );
      } else {
        toast.success(`Imported ${applied} row(s)`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadTemplate = (e: MouseEvent<HTMLAnchorElement>) => {
    if (templateHref) return;
    e.preventDefault();
    const blob = new Blob([buildTemplateCsv(columns)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Hq6FormShell multiCard title={title}>
      <section className="hq6-form-card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="hq6-form-label min-w-[14rem] flex-1">
            <span>File To Import:</span>
            <div className="hq6-form-file">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </label>
          <button
            type="button"
            className="hq6-btn-purple"
            disabled={busy}
            onClick={() => void handleSubmit()}
          >
            {busy ? "Importing…" : uploadReviewLabel ?? submitLabel}
          </button>
        </div>
        <div className="mt-3">
          <a
            className="hq6-btn-green inline-flex items-center gap-2 no-underline"
            href={templateHref ?? "#"}
            download={Boolean(templateHref)}
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4" />
            Download template file
          </a>
        </div>
        {error ? <p className="mt-2 text-sm text-[#dc2626]">{error}</p> : null}
        {result ? (
          <div className="mt-2 space-y-1 text-sm text-[#6b7280]">
            <p>
              Imported {result.created + result.updated} row(s)
              {result.errors.length > 0 ? ` · ${result.errors.length} error(s)` : ""}
            </p>
            {result.errors.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto rounded border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[#b91c1c]">
                {result.errors.slice(0, 20).map((row) => (
                  <li key={`${row.row}-${row.message}`}>
                    Row {row.row}: {row.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="hq6-form-card">
        <h2 className="hq6-form-card-title">Instructions</h2>
        {numberedInstructions?.length ? (
          <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-[#374151]">
            {numberedInstructions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        ) : (
          <p className="mb-3 text-sm text-[#555]">
            Follow the instructions carefully before importing the file.
            The columns of the file should be in the following order.
          </p>
        )}
        {numberedInstructions?.length ? (
          <h3 className="mb-2 text-sm font-semibold text-[#111827]">
            Importable fields:
          </h3>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                <th className="pb-2 pr-3 font-medium">Column Number</th>
                <th className="pb-2 pr-3 font-medium">Column Name</th>
                <th className="pb-2 font-medium">Instruction</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col) => (
                <tr key={col.n} className="border-b border-[#f3f4f6]">
                  <td className="py-2 pr-3 tabular-nums">{col.n}</td>
                  <td className="py-2 pr-3 font-medium text-[#111827]">{col.name}</td>
                  <td className="py-2 text-[#6b7280]">{col.instruction || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {historyTitle && historyColumns ? (
        <section className="hq6-form-card">
          <h2 className="hq6-form-card-title">{historyTitle}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                  {historyColumns.map((col) => (
                    <th key={col} className="pb-2 pr-3 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={historyColumns.length}
                    className="py-6 text-center text-[#9ca3af]"
                  >
                    No data available in table
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </Hq6FormShell>
  );
}
