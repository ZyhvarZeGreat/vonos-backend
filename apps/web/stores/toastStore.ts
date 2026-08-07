import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning" | "progress";

export type ToastProgressSource = "navigation" | "mutation" | "manual";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** Progress toasts bind % to nav/mutation stores, or use `percent`. */
  source?: ToastProgressSource;
  percent?: number;
  sticky?: boolean;
}

interface ToastState {
  toasts: Toast[];
  show: (type: Exclude<ToastType, "progress">, message: string) => void;
  progress: (
    message: string,
    opts?: { source?: ToastProgressSource; percent?: number },
  ) => string;
  updateProgress: (id: string, percent: number) => void;
  dismissProgress: (source?: ToastProgressSource) => void;
  dismiss: (id: string) => void;
}

let lastToastKey = "";
let lastToastAt = 0;

/** Max simultaneously visible toasts — oldest are dropped past this. */
const MAX_TOASTS = 4;

/** Auto-dismiss delay by severity — errors linger so they can be read. */
const TOAST_DURATION_MS: Record<Exclude<ToastType, "progress">, number> = {
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
      toasts: [
        { id, type, message: trimmed },
        ...state.toasts.filter(
          (t) => !(t.type === "progress" && t.source === "mutation"),
        ),
      ].slice(0, MAX_TOASTS),
    }));
    window.setTimeout(() => get().dismiss(id), TOAST_DURATION_MS[type]);
  },
  progress: (message, opts) => {
    const trimmed = message.trim() || "Please wait…";
    const id = crypto.randomUUID();
    set((state) => ({
      toasts: [
        {
          id,
          type: "progress" as const,
          message: trimmed,
          source: opts?.source ?? "manual",
          percent: opts?.percent ?? 0,
          sticky: true,
        },
        ...state.toasts.filter((t) => t.type !== "progress"),
      ].slice(0, MAX_TOASTS),
    }));
    return id;
  },
  updateProgress: (id, percent) => {
    set((state) => ({
      toasts: state.toasts.map((t) =>
        t.id === id ? { ...t, percent: Math.max(0, Math.min(100, percent)) } : t,
      ),
    }));
  },
  dismissProgress: (source) =>
    set((state) => ({
      toasts: state.toasts.filter(
        (t) =>
          t.type !== "progress" ||
          (source != null && t.source !== source),
      ),
    })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show("success", message),
  error: (message: string) => useToastStore.getState().show("error", message),
  info: (message: string) => useToastStore.getState().show("info", message),
  warning: (message: string) => useToastStore.getState().show("warning", message),
  progress: (
    message: string,
    opts?: { source?: ToastProgressSource; percent?: number },
  ) => useToastStore.getState().progress(message, opts),
  dismissProgress: (source?: ToastProgressSource) =>
    useToastStore.getState().dismissProgress(source),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};
