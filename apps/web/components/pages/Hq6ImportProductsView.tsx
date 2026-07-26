"use client";

import type { ReactNode } from "react";
import {
  Hq6BladeCsvImportView,
  type Hq6BladeImportCol,
} from "@/components/hq6/Hq6BladeCsvImportView";
import { importItems } from "@/lib/api/items";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

function opt(label: string, detail?: string): ReactNode {
  return (
    <>
      {label}{" "}
      <small className="text-muted">
        (Optional{detail ? `, ${detail}` : ""})
      </small>
    </>
  );
}

function req(label: string): ReactNode {
  return (
    <>
      {label} <small className="text-muted">(Required)</small>
    </>
  );
}

/** Columns from import_products/index.blade.php */
const COLUMNS: Hq6BladeImportCol[] = [
  { n: 1, name: req("Product Name"), instruction: "Name of the product" },
  {
    n: 2,
    name: opt("Brand"),
    instruction: (
      <>
        Name of the brand
        <br />
        <small className="text-muted">
          (If not found new brand with the given name will be created)
        </small>
      </>
    ),
  },
  { n: 3, name: req("Unit"), instruction: "Name of the unit" },
  {
    n: 4,
    name: opt("Category"),
    instruction: (
      <>
        Name of the Category
        <br />
        <small className="text-muted">
          (If not found new category with the given name will be created)
        </small>
      </>
    ),
  },
  {
    n: 5,
    name: opt("Sub category"),
    instruction: (
      <>
        Name of the Sub-Category
        <br />
        <small className="text-muted">
          (If not found new sub-category with the given name under the Parent
          Category will be created)
        </small>
      </>
    ),
  },
  {
    n: 6,
    name: opt("SKU"),
    instruction: "Product SKU. If blank an SKU will be automatically generated",
  },
  {
    n: 7,
    name: opt("Barcode Type", "Default: C128"),
    instruction: (
      <>
        Barcode Type for the product.
        <br />
        <strong>
          Currently supported: C128, C39, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14
        </strong>
      </>
    ),
  },
  {
    n: 8,
    name: req("Manage Stock?"),
    instruction: (
      <>
        Enable or disable stock management
        <br />
        <strong>
          1 = Yes
          <br />0 = No
        </strong>
      </>
    ),
  },
  { n: 9, name: opt("Alert quantity"), instruction: "Alert quantity" },
  {
    n: 10,
    name: opt("Expires in"),
    instruction: "Product expiry period (Only in numbers)",
  },
  {
    n: 11,
    name: opt("Expiry Period Unit"),
    instruction: (
      <>
        Unit associated with the expiry period
        <br />
        <strong>Available Options: days, months</strong>
      </>
    ),
  },
  {
    n: 12,
    name: opt("Applicable Tax"),
    instruction:
      "Name of the Tax Rate. Required if purchase price (Including Tax) and purchase price (Excluding Tax) are not the same.",
  },
  {
    n: 13,
    name: req("Selling Price Tax Type"),
    instruction: (
      <>
        Selling Price Tax Type
        <br />
        <strong>Available Options: inclusive, exclusive</strong>
      </>
    ),
  },
  {
    n: 14,
    name: req("Product Type"),
    instruction: (
      <>
        Product Type
        <br />
        <strong>Available Options: single, variable</strong>
      </>
    ),
  },
  {
    n: 15,
    name: (
      <>
        Variation Name{" "}
        <small className="text-muted">
          (Required if product type is variable)
        </small>
      </>
    ),
    instruction: 'Name of the variation (e.g. "Size", "Color" etc.)',
  },
  {
    n: 16,
    name: (
      <>
        Variation Values{" "}
        <small className="text-muted">
          (Required if product type is variable)
        </small>
      </>
    ),
    instruction:
      "Values for the variation separated with '|' (e.g. Red|Blue|Green)",
  },
  {
    n: 17,
    name: opt("Variation SKUs"),
    instruction: "SKUs of each variations separated with '|' if product type is variable",
  },
  {
    n: 18,
    name: (
      <>
        Purchase Price Including Tax
        <br />
        <small className="text-muted">
          (Required if purchase price excluding tax is not given)
        </small>
      </>
    ),
    instruction:
      "Purchase Price (Including Tax). For variable products separate with '|'",
  },
  {
    n: 19,
    name: (
      <>
        Purchase Price Excluding Tax
        <br />
        <small className="text-muted">
          (Required if purchase price including tax is not given)
        </small>
      </>
    ),
    instruction:
      "Purchase Price (Excluding Tax). For variable products separate with '|'",
  },
  {
    n: 20,
    name: opt("Profit Margin %"),
    instruction: (
      <>
        Profit Margin
        <br />
        <small className="text-muted">
          (If blank default business profit margin will be used for the product)
        </small>
      </>
    ),
  },
  {
    n: 21,
    name: opt("Selling Price"),
    instruction: (
      <>
        Selling Price
        <br />
        <small className="text-muted">
          (If blank it will be calculated with the given Purchase Price and
          Applicable Tax)
        </small>
      </>
    ),
  },
  {
    n: 22,
    name: opt("Opening Stock"),
    instruction:
      "Opening Stock. For variable products separate quantities with '|' (e.g. 100|150|200)",
  },
  {
    n: 23,
    name: (
      <>
        Opening stock location{" "}
        <small className="text-muted">(Optional)</small>
        <br />
        <small className="text-muted">
          (Name of business location)
        </small>
      </>
    ),
    instruction:
      "Name of the business location. If blank first business location will be used",
  },
  {
    n: 24,
    name: opt("Expiry Date"),
    instruction: "Stock Expiry Date in format mm-dd-yyyy (e.g. 11-25-2018)",
  },
  {
    n: 25,
    name: opt("Enable Product description, IMEI or Serial Number", "Default: 0"),
    instruction: (
      <>
        <strong>
          1 = Yes
          <br />0 = No
        </strong>
      </>
    ),
  },
  { n: 26, name: opt("Weight"), instruction: "Optional" },
  {
    n: 27,
    name: opt("Rack"),
    instruction:
      "Rack details separated by '|' for different business locations sequentially",
  },
  {
    n: 28,
    name: opt("Row"),
    instruction:
      "Row details separated by '|' for different business locations sequentially",
  },
  {
    n: 29,
    name: opt("Position"),
    instruction:
      "Position details separated by '|' for different business locations sequentially",
  },
  {
    n: 30,
    name: opt("Image"),
    instruction:
      "Image name with extension (Image must be uploaded previously) OR image URL",
  },
  { n: 31, name: opt("Product Description"), instruction: "" },
  { n: 32, name: opt("Custom Field 1"), instruction: "" },
  { n: 33, name: opt("Custom Field 2"), instruction: "" },
  { n: 34, name: opt("Custom Field 3"), instruction: "" },
  { n: 35, name: opt("Custom Field 4"), instruction: "" },
  {
    n: 36,
    name: opt("Not for selling"),
    instruction: (
      <>
        <strong>
          1 = Yes
          <br />0 = No
        </strong>
      </>
    ),
  },
  {
    n: 37,
    name: opt("Product locations"),
    instruction:
      "Comma separated names of business locations where product will be available",
  },
];

const TEMPLATE_CSV =
  "Product Name,Brand,Unit,Category,Sub category,SKU,Barcode Type,Manage Stock?,Alert quantity,Expires in,Expiry Period Unit,Applicable Tax,Selling Price Tax Type,Product Type,Variation Name,Variation Values,Variation SKUs,Purchase Price Including Tax,Purchase Price Excluding Tax,Profit Margin %,Selling Price,Opening Stock,Opening stock location,Expiry Date,Enable IMEI,Weight,Rack,Row,Position,Image,Product Description,Custom Field 1,Custom Field 2,Custom Field 3,Custom Field 4,Not for selling,Product locations\n";

/** Ultimate POS — import_products/index.blade.php */
export function Hq6ImportProductsView() {
  const tenantId = useTenantId();
  if (!tenantId) return null;

  return (
    <Hq6BladeCsvImportView
      pageClass="hq6-import-products-page"
      title="Import Products"
      columns={COLUMNS}
      templateCsv={TEMPLATE_CSV}
      templateFilename="import_products_csv_template.csv"
      onImport={(csv) => importItems(tenantId, csv)}
    />
  );
}
