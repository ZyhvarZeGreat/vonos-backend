import type { Sale } from "@vonos/types";
import { getSales } from "@/lib/api";
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
  };
}

export async function getOrders(tenantId: string): Promise<Order[]> {
  const sales = await getSales(tenantId);
  return sales.map(saleToOrder);
}
