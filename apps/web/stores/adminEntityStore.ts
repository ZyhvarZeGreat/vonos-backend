"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AUTOS_GROUP_ENTITIES,
  getTenantByCode,
  type TenantCode,
} from "@/lib/registries/tenants";

/** `null` = consolidated group view (no single entity). */
export type AdminViewingCode = TenantCode | null;

interface AdminEntityState {
  viewingCode: AdminViewingCode;
  setViewingCode: (code: AdminViewingCode) => void;
}

const AUTOS_CODES = new Set<string>(AUTOS_GROUP_ENTITIES.map((e) => e.code));

function isAutosCode(code: string | null | undefined): code is TenantCode {
  return Boolean(code && AUTOS_CODES.has(code));
}

/**
 * Admin-only viewing context. Independent of tenantStore.activeTenantId so
 * leaving an entity workspace does not leak into /admin API scoping.
 */
export const useAdminEntityStore = create<AdminEntityState>()(
  persist(
    (set) => ({
      viewingCode: null,
      setViewingCode: (code) =>
        set({ viewingCode: isAutosCode(code) ? code : null }),
    }),
    {
      name: "vonos-admin-entity",
      partialize: (state) => ({ viewingCode: state.viewingCode }),
    },
  ),
);

export function adminViewingTenantId(
  viewingCode: AdminViewingCode = useAdminEntityStore.getState().viewingCode,
): string | null {
  if (!viewingCode) return null;
  return getTenantByCode(viewingCode)?.tenantId ?? null;
}

/** Default entity for admin modules that need a single tenant (e.g. HRM). */
export const ADMIN_DEFAULT_ENTITY: TenantCode = "VA";
