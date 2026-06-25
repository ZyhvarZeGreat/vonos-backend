import type { CsvExportPayload } from "@/lib/utils/exportCsv";
import type { SaleDetail } from "@vonos/types";

export function buildSaleDetailExport(sale: SaleDetail): CsvExportPayload {
  const summary: CsvExportPayload["rows"] = [
    {
      sku: "—",
      name: `Sale ${sale.reference}`,
      quantity: "",
      unitPrice: "",
      lineTotal: "",
    },
    {
      sku: "—",
      name: `Customer: ${sale.customerName}`,
      quantity: "",
      unitPrice: "",
      lineTotal: "",
    },
    {
      sku: "—",
      name: `Date: ${sale.date}`,
      quantity: "",
      unitPrice: `Status: ${sale.status}`,
      lineTotal: sale.total,
    },
    {
      sku: "",
      name: "",
      quantity: "",
      unitPrice: "",
      lineTotal: "",
    },
  ];

  return {
    filename: `${sale.reference}-detail`,
    columns: [
      { key: "sku", header: "SKU" },
      { key: "name", header: "Item" },
      { key: "quantity", header: "Qty" },
      { key: "unitPrice", header: "Unit Price" },
      { key: "lineTotal", header: "Line Total" },
    ],
    rows: [
      ...summary,
      ...sale.lines.map((line) => ({
        sku: line.sku,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    ],
  };
}
