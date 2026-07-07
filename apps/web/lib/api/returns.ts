import type { Sale, SaleFilters } from "@vonos/types";
import { getAllSales, getSales, getSalesPage } from "@/lib/api/sales";
import type { ListPage } from "@/lib/api/fetchAllPages";
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

const returnsFilters = (filters?: SaleFilters): SaleFilters => ({
  ...filters,
  returnsOnly: true,
});

export async function getReturnsPage(
  tenantId: string,
  filters: SaleFilters | undefined,
  cursor: string | undefined,
  limit?: number,
): Promise<ListPage<SaleReturnRow>> {
  const salesPage = await getSalesPage(
    tenantId,
    returnsFilters(filters),
    cursor,
    limit,
  );
  return {
    ...salesPage,
    items: salesPage.items.map(saleToReturnRow),
  };
}

/** Full returns list for export — not for table rendering. */
export async function getAllReturns(
  tenantId: string,
  filters?: SaleFilters,
): Promise<SaleReturnRow[]> {
  const sales = await getAllSales(tenantId, returnsFilters(filters));
  return sales.map(saleToReturnRow);
}

export async function getReturns(tenantId: string): Promise<SaleReturnRow[]> {
  const sales = await getSales(tenantId, { returnsOnly: true });
  return sales.filter((sale) => RETURN_STATUSES.has(sale.status)).map(saleToReturnRow);
}

export async function getReturn(
  tenantId: string,
  id: string,
): Promise<SaleReturnRow | null> {
  const returns = await getReturns(tenantId);
  return returns.find((row) => row.id === id) ?? null;
}
