"use client";

import type { Notification } from "@vonos/types";
import { create } from "zustand";
import type { CreateFlowKey } from "@/lib/registries/createFlows";
import type { CsvExportPayload } from "@/lib/utils/exportCsv";

export type ActiveModal = "create" | "export" | "addExpense" | "addSale" | "addProduct" | null;

export type SaleFormPresetStatus = "final" | "draft" | "quotation";

export type ProductFlowKey = "item" | "menu-item";

export interface CreateModalCopy {
  title: string;
  subtitle: string;
  submitLabel: string;
}

export interface ExportModalCopy {
  title: string;
  subtitle: string;
}

const defaultCreateCopy: CreateModalCopy = {
  title: "Create record",
  subtitle: "Fill in the details below",
  submitLabel: "Create",
};

const defaultExportCopy: ExportModalCopy = {
  title: "Export Document",
  subtitle: "Download the current view as a file",
};

export type DateRangePreset =
  | "all_time"
  | "last_hour"
  | "last_1_day"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "this_month";

interface UiState {
  sidebarCollapsed: boolean;
  activeNav: string | null;
  notifications: Notification[];
  notificationsOpen: boolean;
  activeModal: ActiveModal;
  createFlow: CreateFlowKey | null;
  productFlow: ProductFlowKey;
  createCopy: CreateModalCopy;
  exportCopy: ExportModalCopy;
  exportPayload: CsvExportPayload | null;
  /** When set, expense/sale modals post to this tenant (VAG admin group finance). */
  financeActionTenantId: string | null;
  salePresetStatus: SaleFormPresetStatus | null;
  dateRange: DateRangePreset;
  toggleSidebar: () => void;
  setActiveNav: (route: string) => void;
  setNotifications: (notifications: Notification[]) => void;
  setNotificationsOpen: (open: boolean) => void;
  toggleNotifications: () => void;
  openCreateModal: (
    flow: CreateFlowKey,
    copy?: Partial<CreateModalCopy>,
  ) => void;
  openAddExpenseModal: (tenantId?: string) => void;
  openAddSaleModal: (tenantId?: string, presetStatus?: SaleFormPresetStatus) => void;
  openAddProductModal: (flow?: ProductFlowKey) => void;
  openExportModal: (
    copy?: Partial<ExportModalCopy>,
    payload?: CsvExportPayload | null,
  ) => void;
  closeModal: () => void;
  setDateRange: (range: DateRangePreset) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  activeNav: null,
  notifications: [],
  notificationsOpen: false,
  activeModal: null,
  createFlow: null,
  productFlow: "item",
  createCopy: defaultCreateCopy,
  exportCopy: defaultExportCopy,
  exportPayload: null,
  financeActionTenantId: null,
  salePresetStatus: null,
  dateRange: "last_7_days",
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveNav: (route) => set({ activeNav: route }),
  setNotifications: (notifications) => set({ notifications }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  toggleNotifications: () =>
    set((state) => ({ notificationsOpen: !state.notificationsOpen })),
  openCreateModal: (flow, copy) =>
    set({
      activeModal: "create",
      createFlow: flow,
      createCopy: { ...defaultCreateCopy, ...copy },
    }),
  openAddExpenseModal: (tenantId) =>
    set({
      activeModal: "addExpense",
      createFlow: null,
      financeActionTenantId: tenantId ?? null,
    }),
  openAddSaleModal: (tenantId, presetStatus = "final") =>
    set({
      activeModal: "addSale",
      createFlow: null,
      financeActionTenantId: tenantId ?? null,
      salePresetStatus: presetStatus,
    }),
  openAddProductModal: (flow = "item") =>
    set({
      activeModal: "addProduct",
      createFlow: null,
      productFlow: flow,
    }),
  openExportModal: (copy, payload) =>
    set({
      activeModal: "export",
      exportCopy: { ...defaultExportCopy, ...copy },
      exportPayload: payload ?? null,
    }),
  closeModal: () =>
    set({
      activeModal: null,
      createFlow: null,
      productFlow: "item",
      exportPayload: null,
      financeActionTenantId: null,
      salePresetStatus: null,
    }),
  setDateRange: (dateRange) => set({ dateRange }),
}));
