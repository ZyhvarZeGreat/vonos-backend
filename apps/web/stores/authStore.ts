"use client";

import type { Role } from "@vonos/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { decodeAccessToken } from "@/lib/utils/jwt";

const STORAGE_KEY = "vonos-auth";

interface AuthState {
  userId: string | null;
  email: string | null;
  name: string | null;
  tenantId: string | null;
  role: Role | null;
  tenantRoleId: string | null;
  tenantRoleName: string | null;
  tenantRolePermissions: string[];
  tenantRoleLocked: boolean;
  /** Entity codes cleared for this user (header location switcher). */
  allowedTenantCodes: string[];
  token: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (payload: {
    userId: string;
    email: string;
    name: string;
    tenantId: string | null;
    role: Role;
    token: string;
    tenantRoleId?: string | null;
    tenantRoleName?: string | null;
    tenantRolePermissions?: string[];
    tenantRoleLocked?: boolean;
    allowedTenantCodes?: string[];
  }) => void;
  clearAuth: () => void;
  setHydrated: (hydrated: boolean) => void;
}

type PersistedAuth = Pick<
  AuthState,
  | "userId"
  | "email"
  | "name"
  | "tenantId"
  | "role"
  | "tenantRoleId"
  | "tenantRoleName"
  | "tenantRolePermissions"
  | "tenantRoleLocked"
  | "allowedTenantCodes"
  | "token"
  | "isAuthenticated"
>;

function tokenIssuedAt(token: string | null | undefined): number {
  if (!token) return 0;
  const decoded = decodeAccessToken(token);
  return decoded?.iat ?? 0;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      email: null,
      name: null,
      tenantId: null,
      role: null,
      tenantRoleId: null,
      tenantRoleName: null,
      tenantRolePermissions: [],
      tenantRoleLocked: false,
      allowedTenantCodes: [],
      token: null,
      isAuthenticated: false,
      hydrated: false,
      setAuth: ({
        userId,
        email,
        name,
        tenantId,
        role,
        token,
        tenantRoleId = null,
        tenantRoleName = null,
        tenantRolePermissions = [],
        tenantRoleLocked = false,
        allowedTenantCodes = [],
      }) => {
        const decoded = decodeAccessToken(token);
        if (!decoded) {
          set({
            userId: null,
            email: null,
            name: null,
            tenantId: null,
            role: null,
            tenantRoleId: null,
            tenantRoleName: null,
            tenantRolePermissions: [],
            tenantRoleLocked: false,
            allowedTenantCodes: [],
            token: null,
            isAuthenticated: false,
            hydrated: true,
          });
          return;
        }
        set({
          userId,
          email,
          name,
          tenantId,
          role,
          tenantRoleId,
          tenantRoleName,
          tenantRolePermissions,
          tenantRoleLocked,
          allowedTenantCodes,
          token,
          isAuthenticated: true,
          hydrated: true,
        });
      },
      clearAuth: () =>
        set({
          userId: null,
          email: null,
          name: null,
          tenantId: null,
          role: null,
          tenantRoleId: null,
          tenantRoleName: null,
          tenantRolePermissions: [],
          tenantRoleLocked: false,
          allowedTenantCodes: [],
          token: null,
          isAuthenticated: false,
        }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userId: state.userId,
        email: state.email,
        name: state.name,
        tenantId: state.tenantId,
        role: state.role,
        tenantRoleId: state.tenantRoleId,
        tenantRoleName: state.tenantRoleName,
        tenantRolePermissions: state.tenantRolePermissions,
        tenantRoleLocked: state.tenantRoleLocked,
        allowedTenantCodes: state.allowedTenantCodes,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<PersistedAuth>;
        // Login won the race against rehydration — keep the fresh session.
        if (
          current.isAuthenticated &&
          current.token &&
          tokenIssuedAt(current.token) >= tokenIssuedAt(stored.token)
        ) {
          return { ...current };
        }
        return {
          ...current,
          ...stored,
          allowedTenantCodes: stored.allowedTenantCodes ?? [],
          hydrated: current.hydrated,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (!state?.token) {
          state?.setHydrated(true);
          return;
        }
        const decoded = decodeAccessToken(state.token);
        if (!decoded) {
          state.clearAuth();
        }
        state.setHydrated(true);
      },
    },
  ),
);
