import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

let lastToastKey = "";
let lastToastAt = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (type, message) => {
    const trimmed = message.trim();
    if (!trimmed) return;

    const key = `${type}:${trimmed}`;
    const now = Date.now();
    if (key === lastToastKey && now - lastToastAt < 1500) return;
    lastToastKey = key;
    lastToastAt = now;

    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, type, message: trimmed }] }));
    window.setTimeout(() => get().dismiss(id), 4500);
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show("success", message),
  error: (message: string) => useToastStore.getState().show("error", message),
  info: (message: string) => useToastStore.getState().show("info", message),
  warning: (message: string) => useToastStore.getState().show("warning", message),
};
