"use client";

import { useEffect } from "react";
import { WarehouseInventoryView } from "@/components/pages/WarehouseInventoryView";
import { CatalogListView } from "@/components/pages/EntityListViews";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { useUiStore } from "@/stores/uiStore";

export function AddProductView() {
  const openAddProductModal = useUiStore((state) => state.openAddProductModal);
  const { tenantCode, config } = useRouteTenant();
  const retailMode = config?.archetype === "transaction";

  useEffect(() => {
    openAddProductModal(retailMode && tenantCode === "VC" ? "menu-item" : "item");
  }, [tenantCode, openAddProductModal, retailMode]);

  if (retailMode) {
    return <CatalogListView />;
  }
  return <WarehouseInventoryView />;
}
