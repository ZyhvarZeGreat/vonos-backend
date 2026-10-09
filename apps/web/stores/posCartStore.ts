"use client";

import { create } from "zustand";
import type { PosPercentOrFixed } from "@/lib/pos/posTotals";

export interface PosCartLine {
  key: string;
  itemId: string;
  sku: string;
  name: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  unit?: string | null;
  stockQty: number;
}

export interface PosCartItemPick {
  id: string;
  sku: string;
  name: string;
  imageUrl?: string | null;
  sellPrice: number | null;
  costPrice?: number | null;
  unit?: string | null;
  stockQty: number;
}

interface PosCartState {
  /** null = walk-in customer (UPOS default). */
  customerId: string | null;
  lines: PosCartLine[];
  discount: PosPercentOrFixed;
  orderTax: PosPercentOrFixed;
  shipping: number;
  addItem: (item: PosCartItemPick) => void;
  setQuantity: (key: string, quantity: number) => void;
  setUnitPrice: (key: string, unitPrice: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  /** Replace the whole ticket — used when resuming a draft. */
  loadCart: (
    lines: PosCartLine[],
    opts?: { customerId?: string | null; discountAmount?: number; taxAmount?: number },
  ) => void;
  setCustomer: (customerId: string | null) => void;
  setDiscount: (discount: PosPercentOrFixed) => void;
  setOrderTax: (orderTax: PosPercentOrFixed) => void;
  setShipping: (shipping: number) => void;
  resetAdjustments: () => void;
}

const EMPTY_ADJUSTMENTS = {
  discount: { kind: "fixed", amount: 0 } as PosPercentOrFixed,
  orderTax: { kind: "fixed", amount: 0 } as PosPercentOrFixed,
  shipping: 0,
};

/**
 * Till cart. Deliberately NOT persisted — a refresh starts a fresh ticket,
 * matching the audited UPOS page (cart lives in the page only).
 */
export const usePosCartStore = create<PosCartState>()((set) => ({
  customerId: null,
  lines: [],
  ...EMPTY_ADJUSTMENTS,

  addItem: (item) =>
    set((state) => {
      const existing = state.lines.find((line) => line.itemId === item.id);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.itemId === item.id
              ? { ...line, quantity: roundQty(line.quantity + 1) }
              : line,
          ),
        };
      }
      const unitPrice = item.sellPrice ?? item.costPrice ?? 0;
      return {
        lines: [
          ...state.lines,
          {
            key: `pos-${item.id}`,
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            imageUrl: item.imageUrl,
            quantity: 1,
            unitPrice: Number.isFinite(unitPrice) ? Math.max(0, unitPrice) : 0,
            unit: item.unit,
            stockQty: item.stockQty,
          },
        ],
      };
    }),

  setQuantity: (key, quantity) =>
    set((state) => {
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return { lines: state.lines.filter((line) => line.key !== key) };
      }
      return {
        lines: state.lines.map((line) =>
          line.key === key ? { ...line, quantity: roundQty(quantity) } : line,
        ),
      };
    }),

  setUnitPrice: (key, unitPrice) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.key === key
          ? {
              ...line,
              unitPrice:
                Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : 0,
            }
          : line,
      ),
    })),

  removeLine: (key) =>
    set((state) => ({ lines: state.lines.filter((line) => line.key !== key) })),

  clearCart: () =>
    set({ lines: [], customerId: null, ...EMPTY_ADJUSTMENTS }),

  loadCart: (lines, opts) =>
    set({
      lines,
      customerId: opts?.customerId ?? null,
      discount: { kind: "fixed", amount: opts?.discountAmount ?? 0 },
      orderTax: { kind: "fixed", amount: opts?.taxAmount ?? 0 },
      shipping: 0,
    }),

  setCustomer: (customerId) => set({ customerId }),

  setDiscount: (discount) => set({ discount }),
  setOrderTax: (orderTax) => set({ orderTax }),
  setShipping: (shipping) =>
    set({
      shipping: Number.isFinite(shipping) && shipping > 0 ? shipping : 0,
    }),

  resetAdjustments: () => set({ ...EMPTY_ADJUSTMENTS }),
}));

function roundQty(value: number): number {
  return Math.round(value * 100) / 100;
}
