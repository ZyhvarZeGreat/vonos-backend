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
  | "this_month"
  | "custom";

export interface CustomDateRange {
  from: string;
  to: string;
}

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
  /** When set, Add Sale form pre-selects this job (VA). */
  saleJobId: string | null;
  dateRange: DateRangePreset;
  customDateRange: CustomDateRange | null;
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
  openAddSaleModal: (
    tenantId?: string,
    presetStatus?: SaleFormPresetStatus,
    jobId?: string | null,
  ) => void;
  openAddProductModal: (flow?: ProductFlowKey) => void;
  openExportModal: (
    copy?: Partial<ExportModalCopy>,
    payload?: CsvExportPayload | null,
  ) => void;
  closeModal: () => void;
  setDateRange: (range: DateRangePreset) => void;
  setCustomDateRange: (range: CustomDateRange | null) => void;
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
  saleJobId: null,
  dateRange: "last_7_days",
  customDateRange: null,
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
  openAddSaleModal: (tenantId, presetStatus = "final", jobId = null) =>
    set({
      activeModal: "addSale",
      createFlow: null,
      financeActionTenantId: tenantId ?? null,
      salePresetStatus: presetStatus,
      saleJobId: jobId ?? null,
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
      saleJobId: null,
    }),
  setDateRange: (dateRange) =>
    set((state) => ({
      dateRange,
      customDateRange: dateRange === "custom" ? state.customDateRange : null,
    })),
  setCustomDateRange: (customDateRange) =>
    set({
      dateRange: customDateRange ? "custom" : "all_time",
      customDateRange,
    }),
}));
