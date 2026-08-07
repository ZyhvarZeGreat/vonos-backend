import { create } from "zustand";
import { toast } from "@/stores/toastStore";

interface NavigationBusyState {
  pending: boolean;
  /** Soft progress 0–90 while waiting; 100 on complete. */
  percent: number;
  start: () => void;
  complete: () => void;
  reset: () => void;
}

let tickTimer: ReturnType<typeof setInterval> | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearTick() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function clearFinish() {
  if (finishTimer) {
    clearTimeout(finishTimer);
    finishTimer = null;
  }
}

function clearSafety() {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

function startTick() {
  clearTick();
  tickTimer = setInterval(() => {
    useNavigationBusyStore.setState((state) => {
      if (!state.pending) return state;
      const gap = 90 - state.percent;
      return { percent: Math.min(90, state.percent + Math.max(0.9, gap * 0.14)) };
    });
  }, 80);
}

/** Route-transition busy flag — start on link click, complete when pathname settles. */
export const useNavigationBusyStore = create<NavigationBusyState>((set, get) => ({
  pending: false,
  percent: 0,
  start: () => {
    clearFinish();
    clearSafety();
    if (!get().pending) {
      // Start already moving so the chip does not sit at 0%.
      set({ pending: true, percent: 8 });
      startTick();
    }
    // Hard stop if navigation is cancelled / never lands.
    safetyTimer = setTimeout(() => {
      if (get().pending) get().complete();
    }, 12_000);
  },
  complete: () => {
    if (!get().pending && get().percent === 0) {
      // Still clear a leftover redirect chip (announceRedirect) if present.
      toast.dismissProgress("navigation");
      return;
    }
    clearTick();
    clearSafety();
    set({ pending: false, percent: 100 });
    clearFinish();
    finishTimer = setTimeout(() => {
      toast.dismissProgress("navigation");
      set({ percent: 0 });
      finishTimer = null;
    }, 220);
  },
  reset: () => {
    clearTick();
    clearFinish();
    clearSafety();
    toast.dismissProgress("navigation");
    set({ pending: false, percent: 0 });
  },
}));

export function startNavigationProgress(): void {
  useNavigationBusyStore.getState().start();
}

export function completeNavigationProgress(): void {
  useNavigationBusyStore.getState().complete();
}
