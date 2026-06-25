"use client";

import type { TenantConfig } from "@vonos/types";
import { create } from "zustand";

interface TenantState {
  activeTenantId: string | null;
  tenantConfig: TenantConfig | null;
  setActiveTenant: (tenantId: string | null) => void;
  setTenantConfig: (config: TenantConfig) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
  activeTenantId: null,
  tenantConfig: null,
  setActiveTenant: (tenantId) => set({ activeTenantId: tenantId }),
  setTenantConfig: (config) =>
    set({ tenantConfig: config, activeTenantId: config.tenantId }),
  clearTenant: () => set({ tenantConfig: null, activeTenantId: null }),
}));
