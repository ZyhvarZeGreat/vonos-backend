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

/** Max simultaneously visible toasts — oldest are dropped past this. */
const MAX_TOASTS = 4;

/** Auto-dismiss delay by severity — errors linger so they can be read. */
const TOAST_DURATION_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4500,
  warning: 6000,
  error: 8000,
};

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
    set((state) => ({
      // Cap the stack so rapid-fire actions can't pile toasts off-screen.
      toasts: [...state.toasts, { id, type, message: trimmed }].slice(
        -MAX_TOASTS,
      ),
    }));
    window.setTimeout(() => get().dismiss(id), TOAST_DURATION_MS[type]);
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
