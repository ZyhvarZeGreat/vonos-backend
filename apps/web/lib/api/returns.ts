import type { Sale } from "@vonos/types";
import { getSales } from "@/lib/api";
import type { SaleReturnRow } from "@/lib/types/entityRows";

const RETURN_STATUSES = new Set(["Refunded", "Restocked", "Written Off"]);

function saleToReturnRow(sale: Sale): SaleReturnRow {
  return {
    id: sale.id,
    tenantId: sale.tenantId,
    reference: `RET-${sale.reference}`,
    saleReference: sale.reference,
    customerName: sale.customerName ?? "Walk-in",
    amount: sale.total,
    status: sale.status,
    date: sale.date,
  };
}

export async function getReturns(tenantId: string): Promise<SaleReturnRow[]> {
  const sales = await getSales(tenantId);
  return sales.filter((sale) => RETURN_STATUSES.has(sale.status)).map(saleToReturnRow);
}

export async function getReturn(
  tenantId: string,
  id: string,
): Promise<SaleReturnRow | null> {
  const returns = await getReturns(tenantId);
  return returns.find((row) => row.id === id) ?? null;
}
