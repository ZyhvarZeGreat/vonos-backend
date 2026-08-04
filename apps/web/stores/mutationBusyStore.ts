import { create } from "zustand";

interface MutationBusyState {
  pendingCount: number;
  /** 0–100 display progress while writes are in flight. */
  percent: number;
  /** Brief hold at 100% before reset. */
  finishing: boolean;
  label: string;
  begin: (label?: string) => void;
  end: () => void;
  reset: () => void;
}

let tickTimer: ReturnType<typeof setInterval> | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;

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

function startTick() {
  clearTick();
  tickTimer = setInterval(() => {
    useMutationBusyStore.setState((state) => {
      if (state.pendingCount <= 0 || state.finishing) return state;
      // Ease toward 90% while the network request is open.
      const gap = 90 - state.percent;
      const step = Math.max(0.8, gap * 0.12);
      return { percent: Math.min(90, state.percent + step) };
    });
  }, 80);
}

export const useMutationBusyStore = create<MutationBusyState>((set, get) => ({
  pendingCount: 0,
  percent: 0,
  finishing: false,
  label: "Saving",
  begin: (label) => {
    clearFinish();
    const wasIdle = get().pendingCount === 0;
    set((state) => ({
      pendingCount: state.pendingCount + 1,
      finishing: false,
      label: label?.trim() || state.label || "Saving",
      percent: wasIdle ? 0 : state.percent,
    }));
    if (wasIdle) startTick();
  },
  end: () => {
    const next = Math.max(0, get().pendingCount - 1);
    if (next > 0) {
      set({ pendingCount: next });
      return;
    }
    clearTick();
    set({ pendingCount: 0, percent: 100, finishing: true });
    clearFinish();
    finishTimer = setTimeout(() => {
      set({ percent: 0, finishing: false, label: "Saving" });
      finishTimer = null;
    }, 180);
  },
  reset: () => {
    clearTick();
    clearFinish();
    set({ pendingCount: 0, percent: 0, finishing: false, label: "Saving" });
  },
}));

export function isMutationBusy(): boolean {
  const s = useMutationBusyStore.getState();
  return s.pendingCount > 0 || s.finishing;
}

/**
 * Wrap non–React Query writes (manual fetch / setSaving) so they share the
 * global 0–100% progress indicator.
 */
export async function withWriteProgress<T>(
  fn: () => Promise<T>,
  label = "Saving",
): Promise<T> {
  useMutationBusyStore.getState().begin(label);
  try {
    return await fn();
  } finally {
    useMutationBusyStore.getState().end();
  }
}
