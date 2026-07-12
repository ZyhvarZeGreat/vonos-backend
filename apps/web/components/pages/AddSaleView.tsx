"use client";

import { useEffect } from "react";
import {
  DraftsListView,
  OrdersListView,
  QuotationsListView,
  SalesListView,
} from "@/components/pages/EntityListViews";
import { useUiStore } from "@/stores/uiStore";

export function AddSaleView() {
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);

  useEffect(() => {
    openAddSaleModal(undefined, "final");
  }, [openAddSaleModal]);

  return <SalesListView />;
}

export function AddDraftView() {
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);

  useEffect(() => {
    openAddSaleModal(undefined, "draft");
  }, [openAddSaleModal]);

  return <DraftsListView />;
}

export function AddQuotationView() {
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);

  useEffect(() => {
    openAddSaleModal(undefined, "quotation");
  }, [openAddSaleModal]);

  return <QuotationsListView />;
}

export function AddOrderView() {
  const openAddSaleModal = useUiStore((state) => state.openAddSaleModal);

  useEffect(() => {
    openAddSaleModal(undefined, "final");
  }, [openAddSaleModal]);

  return <OrdersListView />;
}
