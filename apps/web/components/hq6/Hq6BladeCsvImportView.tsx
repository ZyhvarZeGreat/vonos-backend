"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { CsvImportResult } from "@vonos/types";
import { toast } from "@/stores/toastStore";

export type Hq6BladeImportCol = {
  n: number;
  name: ReactNode;
  instruction: ReactNode;
};

type Props = {
  pageClass: string;
  title: string;
  columns: Hq6BladeImportCol[];
  templateCsv: string;
  templateFilename: string;
  fileTip?: string;
  accept?: string;
  onImport: (csv: string) => Promise<CsvImportResult>;
};

/** Shared Ultimate POS import layout (import_products / import_opening_stock / contacts). */
export function Hq6BladeCsvImportView({
  pageClass,
  title,
  columns,
  templateCsv,
  templateFilename,
  fileTip,
  accept = ".xls,.xlsx,.csv",
  onImport,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!file) {
      toast.error("Choose a file to import");
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

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`hq6-page hq6-import-contacts-page ${pageClass}`}>
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          {title}
        </h1>
      </section>

      <section className="content">
        {error ? (
          <div className="row">
            <div className="col-sm-12">
              <div className="alert alert-danger alert-dismissible">
                <button
                  type="button"
                  className="close"
                  aria-label="Close"
                  onClick={() => setError(null)}
                >
                  ×
                </button>
                {error}
              </div>
            </div>
          </div>
        ) : null}

        <div className="row">
          <div className="col-sm-12">
            <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
              <div className="tw-p-2 sm:tw-p-3">
                <div className="tw-flow-root tw-border-gray-200">
                  <div>
                    <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                      <form onSubmit={handleSubmit}>
                        <div className="row">
                          <div className="col-sm-6">
                            <div className="col-sm-8">
                              <div className="form-group">
                                <label htmlFor="products_csv">
                                  File To Import:
                                  {fileTip ? (
                                    <>
                                      {" "}
                                      <i
                                        className="fa fa-info-circle text-info hover-q"
                                        aria-hidden
                                        title={fileTip}
                                      />
                                    </>
                                  ) : null}
                                </label>
                                <input
                                  id="products_csv"
                                  accept={accept}
                                  required
                                  name="products_csv"
                                  type="file"
                                  onChange={(e) =>
                                    setFile(e.target.files?.[0] ?? null)
                                  }
                                />
                              </div>
                            </div>
                            <div className="col-sm-4">
                              <br />
                              <button
                                type="submit"
                                className="tw-dw-btn tw-dw-btn-primary tw-text-white"
                                disabled={busy}
                              >
                                {busy ? "Importing…" : "Submit"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                      <br />
                      <br />
                      <div className="row">
                        <div className="col-sm-4">
                          <button
                            type="button"
                            className="tw-dw-btn tw-dw-btn-success tw-text-white"
                            onClick={handleDownloadTemplate}
                          >
                            <i className="fa fa-download" aria-hidden /> Download
                            template file
                          </button>
                        </div>
                      </div>
                      {result ? (
                        <p className="tw-mt-3 text-sm text-[#6b7280]">
                          Imported {result.created + result.updated} row(s)
                          {result.errors.length > 0
                            ? ` · ${result.errors.length} error(s)`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-sm-12">
            <div className="box-primary tw-mb-4 tw-transition-all lg:tw-col-span-2 tw-duration-200 tw-bg-white tw-shadow-sm tw-rounded-xl tw-ring-1 hover:tw-shadow-md tw-ring-gray-200">
              <div className="tw-p-2 sm:tw-p-3">
                <div className="box-header">
                  <h3 className="box-title">Instructions</h3>
                </div>
                <div className="tw-flow-root tw-border-gray-200">
                  <div>
                    <div className="tw-py-2 tw-align-middle sm:tw-px-5">
                      <strong>
                        Carefully follow the instructions before importing the
                        file.
                      </strong>
                      <br />
                      The columns of the CSV file should be in the following
                      order.
                      <br />
                      <br />
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Column Number</th>
                            <th>Column Name</th>
                            <th>Instruction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columns.map((col) => (
                            <tr key={col.n}>
                              <td>{col.n}</td>
                              <td>{col.name}</td>
                              <td>{col.instruction || "\u00a0"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <p className="hq6-footer">
        Vonos Autos Head Office - V8.1 | Copyright © {new Date().getFullYear()}{" "}
        All rights reserved.
      </p>
    </div>
  );
}
