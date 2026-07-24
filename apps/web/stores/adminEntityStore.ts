"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getTenantByCode, type TenantCode } from "@/lib/registries/tenants";
import {
  getVagViewUnit,
  isVagViewUnitId,
  type VagViewUnitId,
  vagViewUnitIdForTenantCode,
} from "@/lib/registries/vagViewUnits";

/**
 * `null` = consolidated group view.
 * Otherwise a VAG view unit (VA, VW, or SP = VISP+VSP combined).
 */
export type AdminViewingCode = VagViewUnitId | null;

interface AdminEntityState {
  viewingCode: AdminViewingCode;
  setViewingCode: (code: AdminViewingCode | string | null) => void;
}

function normalizeViewingCode(
  code: string | null | undefined,
): AdminViewingCode {
  if (!code) return null;
  if (isVagViewUnitId(code)) return code;
  // Migrate persisted VISP/VSP → combined SP; map any tenant → unit
  return vagViewUnitIdForTenantCode(code);
}

/**
 * Admin-only viewing context. Independent of tenantStore.activeTenantId so
 * leaving an entity workspace does not leak into /admin API scoping.
 */
export const useAdminEntityStore = create<AdminEntityState>()(
  persist(
    (set) => ({
      viewingCode: null,
      setViewingCode: (code) => set({ viewingCode: normalizeViewingCode(code) }),
    }),
    {
      name: "vonos-admin-entity",
      partialize: (state) => ({ viewingCode: state.viewingCode }),
      merge: (persisted, current) => {
        const raw =
          persisted && typeof persisted === "object" && "viewingCode" in persisted
            ? (persisted as { viewingCode?: string | null }).viewingCode
            : null;
        return {
          ...current,
          viewingCode: normalizeViewingCode(raw),
        };
      },
    },
  ),
);

/** Primary tenant id for X-Viewing-Tenant / single-tenant admin modules. */
export function adminViewingTenantId(
  viewingCode: AdminViewingCode = useAdminEntityStore.getState().viewingCode,
): string | null {
  if (!viewingCode) return null;
  const primary = getVagViewUnit(viewingCode).enterCode;
  return getTenantByCode(primary)?.tenantId ?? null;
}

/** All tenant ids for the current view unit (1 or 2 for SP). */
export function adminViewingTenantIds(
  viewingCode: AdminViewingCode = useAdminEntityStore.getState().viewingCode,
): string[] {
  if (!viewingCode) return [];
  const ids: string[] = [];
  for (const code of getVagViewUnit(viewingCode).tenantCodes) {
    const id = getTenantByCode(code)?.tenantId;
    if (id) ids.push(id);
  }
  return ids;
}

/** Default entity for admin modules that need a single tenant (e.g. HRM). */
export const ADMIN_DEFAULT_ENTITY: TenantCode = "VA";
