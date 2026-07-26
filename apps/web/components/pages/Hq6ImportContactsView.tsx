"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { CsvImportResult } from "@vonos/types";
import { importCustomers } from "@/lib/api/customers";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { toast } from "@/stores/toastStore";

type ImportCol = {
  n: number;
  name: ReactNode;
  instruction: ReactNode;
};

/** Columns from contact/import.blade.php + ui-audit/07. */
const IMPORT_COLUMNS: ImportCol[] = [
  {
    n: 1,
    name: (
      <>
        Contact type <small className="text-muted">(Required)</small>
      </>
    ),
    instruction: (
      <>
        Available Options:
        <br />
        1 = Customer,
        <br />
        2 = Supplier
        <br />
        3 = Both
      </>
    ),
  },
  {
    n: 2,
    name: (
      <>
        Prefix <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 3,
    name: (
      <>
        First Name <small className="text-muted">(Required)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 4,
    name: (
      <>
        Middle name <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 5,
    name: (
      <>
        Last Name <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 6,
    name: (
      <>
        Business Name
        <br />
        <small className="text-muted">
          (Required if contact type is supplier or both)
        </small>
      </>
    ),
    instruction: "",
  },
  {
    n: 7,
    name: (
      <>
        Contact ID <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "Leave blank to auto generate Contact ID",
  },
  {
    n: 8,
    name: (
      <>
        Tax number <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 9,
    name: (
      <>
        Opening Balance <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 10,
    name: (
      <>
        Pay term
        <br />
        <small className="text-muted">
          (Required if contact type is supplier or both)
        </small>
      </>
    ),
    instruction: "",
  },
  {
    n: 11,
    name: (
      <>
        Pay term period
        <br />
        <small className="text-muted">
          (Required if contact type is supplier or both)
        </small>
      </>
    ),
    instruction: (
      <strong>Available Options: days and months</strong>
    ),
  },
  {
    n: 12,
    name: (
      <>
        Credit Limit <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 13,
    name: (
      <>
        Email <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 14,
    name: (
      <>
        Mobile <small className="text-muted">(Required)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 15,
    name: (
      <>
        Alternate contact number{" "}
        <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 16,
    name: (
      <>
        Landline <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 17,
    name: (
      <>
        City <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 18,
    name: (
      <>
        State <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 19,
    name: (
      <>
        Country <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 20,
    name: (
      <>
        Address line 1 <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 21,
    name: (
      <>
        Address line 2 <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 22,
    name: (
      <>
        Zip Code <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 23,
    name: (
      <>
        Date of birth <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "Format Y-m-d (e.g. 2026-07-25)",
  },
  {
    n: 24,
    name: (
      <>
        Custom Field 1 <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 25,
    name: (
      <>
        Custom Field 2 <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 26,
    name: (
      <>
        Custom Field 3 <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
  {
    n: 27,
    name: (
      <>
        Custom Field 4 <small className="text-muted">(Optional)</small>
      </>
    ),
    instruction: "",
  },
];

const TEMPLATE_CSV =
  "Contact type,Prefix,First Name,Middle name,Last Name,Business Name,Contact ID,Tax number,Opening Balance,Pay term,Pay term period,Credit Limit,Email,Mobile,Alternate contact number,Landline,City,State,Country,Address line 1,Address line 2,Zip Code,Date of birth,Custom Field 1,Custom Field 2,Custom Field 3,Custom Field 4\n";

/** Ultimate POS — contact/import.blade.php + ui-audit/07 (direct HTML lift). */
export function Hq6ImportContactsView() {
  const tenantId = useTenantId();
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
    if (!tenantId) {
      toast.error("Select a business first");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const csv = await file.text();
      const importResult = await importCustomers(tenantId, csv);
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
    const blob = new Blob([TEMPLATE_CSV], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_contacts_csv_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="hq6-page hq6-import-contacts-page">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Import Contacts
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
                                <label htmlFor="contacts_csv">
                                  File To Import:
                                </label>
                                <input
                                  id="contacts_csv"
                                  accept=".xls,.xlsx,.csv"
                                  required
                                  name="contacts_csv"
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
                          {IMPORT_COLUMNS.map((col) => (
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
    </div>
  );
}
