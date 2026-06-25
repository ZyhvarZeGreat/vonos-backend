"use client";

import { useEffect } from "react";
import { SalesListView } from "@/components/pages/EntityListViews";
import { OrdersListView } from "@/components/pages/EntityListViews";
import { useUiStore } from "@/stores/uiStore";

export function AddSaleView() {
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);

  useEffect(() => {
    openAddSaleModal();
  }, [openAddSaleModal]);

  return <SalesListView />;
}

export function AddOrderView() {
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);

  useEffect(() => {
    openAddSaleModal();
  }, [openAddSaleModal]);

  return <OrdersListView />;
}
