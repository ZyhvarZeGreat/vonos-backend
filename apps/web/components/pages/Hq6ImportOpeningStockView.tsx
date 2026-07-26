"use client";

import type { ReactNode } from "react";
import {
  Hq6BladeCsvImportView,
  type Hq6BladeImportCol,
} from "@/components/hq6/Hq6BladeCsvImportView";
import { importOpeningStock } from "@/lib/api/items";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

function req(label: string): ReactNode {
  return (
    <>
      {label} <small className="text-muted">(Required)</small>
    </>
  );
}

function opt(label: string, extra?: ReactNode): ReactNode {
  return (
    <>
      {label} <small className="text-muted">(Optional)</small>
      {extra ? (
        <>
          <br />
          <small className="text-muted">{extra}</small>
        </>
      ) : null}
    </>
  );
}

/** Columns from import_opening_stock/index.blade.php */
const COLUMNS: Hq6BladeImportCol[] = [
  { n: 1, name: req("SKU"), instruction: "" },
  {
    n: 2,
    name: opt("Location", "Name of business location"),
    instruction:
      "Name of the business location. If blank first business location will be used",
  },
  { n: 3, name: req("Quantity"), instruction: "" },
  { n: 4, name: req("Unit cost (Before Tax)"), instruction: "" },
  { n: 5, name: opt("Lot Number"), instruction: "" },
  {
    n: 6,
    name: opt("Expiry Date"),
    instruction: (
      <>
        Stock expiry date in Business date format{" "}
        <b>dd-mm-yyyy</b>, Type: <b>text</b>, Example:{" "}
        <b>
          {new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).replace(/\//g, "-")}
        </b>
      </>
    ),
  },
];

const TEMPLATE_CSV =
  "SKU,Location,Quantity,Unit cost (Before Tax),Lot Number,Expiry Date\n";

/** Ultimate POS — import_opening_stock/index.blade.php */
export function Hq6ImportOpeningStockView() {
  const tenantId = useTenantId();
  if (!tenantId) return null;

  return (
    <Hq6BladeCsvImportView
      pageClass="hq6-import-opening-stock-page"
      title="Import Opening Stock"
      columns={COLUMNS}
      templateCsv={TEMPLATE_CSV}
      templateFilename="import_opening_stock_csv_template.csv"
      fileTip="Import opening stock for existing products by SKU"
      accept=".xls,.xlsx,.csv"
      onImport={(csv) => importOpeningStock(tenantId, csv)}
    />
  );
}
