"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  cartCount,
  cartTotal,
  SHOP_CART_STORAGE_KEY,
  type CartLine,
  type ShopProduct,
} from "@/lib/marketing/shop-catalog";

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as CartLine;
  return (
    typeof line.productId === "string" &&
    typeof line.qty === "number" &&
    typeof line.product === "object" &&
    line.product !== null &&
    typeof line.product.id === "string" &&
    typeof line.product.name === "string" &&
    typeof line.product.price === "number"
  );
}

export const CART_ADDED_EVENT = "vonos:cart-added";

/** Reads legacy raw-array carts written before Zustand persist. */
const shopCartStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const lines = parsed.filter(isCartLine);
        return JSON.stringify({ state: { lines }, version: 0 });
      }
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(name);
  },
};

interface ShopCartState {
  lines: CartLine[];
  hydrated: boolean;
  addProduct: (product: ShopProduct, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeLine: (productId: string) => void;
  clearCart: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useShopCartStore = create<ShopCartState>()(
  persist(
    (set) => ({
      lines: [],
      hydrated: false,
      addProduct: (product, qty = 1) =>
        set((state) => {
          const existing = state.lines.find((line) => line.productId === product.id);
          const next = existing
            ? {
                lines: state.lines.map((line) =>
                  line.productId === product.id
                    ? { ...line, qty: line.qty + qty, product }
                    : line,
                ),
              }
            : { lines: [...state.lines, { productId: product.id, qty, product }] };

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent(CART_ADDED_EVENT, {
                detail: { productId: product.id, name: product.name },
              }),
            );
          }

          return next;
        }),
      updateQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { lines: state.lines.filter((line) => line.productId !== productId) };
          }
          return {
            lines: state.lines.map((line) =>
              line.productId === productId ? { ...line, qty } : line,
            ),
          };
        }),
      removeLine: (productId) =>
        set((state) => ({
          lines: state.lines.filter((line) => line.productId !== productId),
        })),
      clearCart: () => set({ lines: [] }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: SHOP_CART_STORAGE_KEY,
      storage: createJSONStorage(() => shopCartStorage),
      partialize: (state) => ({ lines: state.lines }),
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<Pick<ShopCartState, "lines">>;
        return {
          ...current,
          lines: Array.isArray(stored.lines) ? stored.lines.filter(isCartLine) : [],
          hydrated: current.hydrated,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export function resolveCartLine(line: CartLine): {
  product: ShopProduct;
  qty: number;
  subtotal: number;
} | null {
  if (!line.product) return null;
  return {
    product: line.product,
    qty: line.qty,
    subtotal: line.product.price * line.qty,
  };
}

/** Same surface as the old Context hook — backed by Zustand + localStorage. */
export function useShopCart() {
  const lines = useShopCartStore((s) => s.lines);
  const hydrated = useShopCartStore((s) => s.hydrated);
  const addProduct = useShopCartStore((s) => s.addProduct);
  const updateQty = useShopCartStore((s) => s.updateQty);
  const removeLine = useShopCartStore((s) => s.removeLine);
  const clearCart = useShopCartStore((s) => s.clearCart);

  return useMemo(
    () => ({
      lines,
      count: cartCount(lines),
      total: cartTotal(lines),
      hydrated,
      addProduct,
      updateQty,
      removeLine,
      clearCart,
      resolveLine: resolveCartLine,
    }),
    [lines, hydrated, addProduct, updateQty, removeLine, clearCart],
  );
}
