/** UI list-row shapes for entities without dedicated backend tables yet. */

export interface Order {
  id: string;
  tenantId: string;
  reference: string;
  tableNumber: string | null;
  total: number;
  currency: string;
  status: string;
  itemCount: number;
  createdAt: string;
}

export interface SaleReturnRow {
  id: string;
  tenantId: string;
  reference: string;
  saleReference: string;
  customerName: string;
  amount: number;
  status: string;
  date: string;
}

export interface MenuItemRow {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  price: number;
  modifierGroups: number;
  available: boolean;
  createdAt: string;
}
