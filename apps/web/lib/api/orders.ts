import type { Sale, SaleFilters } from "@vonos/types";
import { getAllSales, getSales, getSalesPage } from "@/lib/api/sales";
import type { ListPage } from "@/lib/api/fetchAllPages";
import type { Order } from "@/lib/types/entityRows";

const ORDER_STATUS_MAP: Record<string, string> = {
  Completed: "Served",
  Refunded: "Served",
  Restocked: "Served",
  "Written Off": "Served",
};

export function saleToOrder(sale: Sale): Order {
  return {
    id: sale.id,
    tenantId: sale.tenantId,
    reference: sale.reference,
    tableNumber: null,
    total: sale.total,
    currency: sale.currency,
    status: ORDER_STATUS_MAP[sale.status] ?? "New",
    itemCount: sale.itemCount,
    createdAt: sale.createdAt,
    saleDate: sale.date,
  };
}

export async function getOrdersPage(
  tenantId: string,
  filters: SaleFilters | undefined,
  cursor: string | undefined,
  limit?: number,
): Promise<ListPage<Order>> {
  const salesPage = await getSalesPage(tenantId, filters, cursor, limit);
  return {
    ...salesPage,
    items: salesPage.items.map(saleToOrder),
  };
}

/** Full order list for export — not for table rendering. */
export async function getAllOrders(
  tenantId: string,
  filters?: SaleFilters,
): Promise<Order[]> {
  const sales = await getAllSales(tenantId, filters);
  return sales.map(saleToOrder);
}

export async function getOrders(tenantId: string): Promise<Order[]> {
  const sales = await getSales(tenantId);
  return sales.map(saleToOrder);
}
