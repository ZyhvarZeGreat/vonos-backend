import type { ComponentType } from "react";
import type { CreateFlowKey } from "./createFlows";
import { WarehouseInventoryView } from "@/components/pages/WarehouseInventoryView";
import { WarehouseReportsView } from "@/components/pages/ReportsView";
import { WarehouseSuppliersView } from "@/components/pages/WarehouseSuppliersView";
import { WarehouseTransfersView } from "@/components/pages/WarehouseTransfersView";

export type WarehousePageSlug =
  | "inventory"
  | "transfers"
  | "reports"
  | "suppliers";

export interface WarehousePageConfig {
  title: string;
  primaryActionLabel?: string;
  openCreateOnPrimary?: boolean;
  createFlowKey?: CreateFlowKey;
  createCopy?: {
    title: string;
    subtitle: string;
    submitLabel: string;
  };
  View: ComponentType;
}

export const warehousePages: Record<WarehousePageSlug, WarehousePageConfig> = {
  inventory: {
    title: "Inventory",
    primaryActionLabel: "Add Item",
    openCreateOnPrimary: true,
    createFlowKey: "item",
    createCopy: {
      title: "Add Item",
      subtitle: "Add a new SKU to warehouse inventory",
      submitLabel: "Add Item",
    },
    View: WarehouseInventoryView,
  },
  transfers: {
    title: "Transfers",
    primaryActionLabel: "New Transfer",
    openCreateOnPrimary: true,
    createFlowKey: "transfer",
    createCopy: {
      title: "New Transfer",
      subtitle: "Request a stock transfer between warehouse zones",
      submitLabel: "Create Transfer",
    },
    View: WarehouseTransfersView,
  },
  reports: {
    title: "Reports",
    View: WarehouseReportsView,
  },
  suppliers: {
    title: "Suppliers",
    View: WarehouseSuppliersView,
  },
};

export function isWarehousePageSlug(slug: string): slug is WarehousePageSlug {
  return slug in warehousePages;
}
