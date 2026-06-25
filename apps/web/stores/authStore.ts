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
  }) => void;
  clearAuth: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      email: null,
      name: null,
      tenantId: null,
      role: null,
      token: null,
      isAuthenticated: false,
      hydrated: false,
      setAuth: ({ userId, email, name, tenantId, role, token }) => {
        const decoded = decodeAccessToken(token);
        if (!decoded) {
          set({
            userId: null,
            email: null,
            name: null,
            tenantId: null,
            role: null,
            token: null,
            isAuthenticated: false,
          });
          return;
        }
        set({
          userId,
          email,
          name,
          tenantId,
          role,
          token,
          isAuthenticated: true,
        });
      },
      clearAuth: () =>
        set({
          userId: null,
          email: null,
          name: null,
          tenantId: null,
          role: null,
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
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
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
