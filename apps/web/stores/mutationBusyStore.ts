import { create } from "zustand";
import { toast } from "@/stores/toastStore";
import { nextIndeterminatePercent } from "@/lib/utils/indeterminateProgress";
import { withWriteRetries } from "@/lib/utils/withWriteRetries";

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
      return { percent: nextIndeterminatePercent(state.percent) };
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
    const nextLabel = label?.trim() || get().label || "Saving";
    set((state) => ({
      pendingCount: state.pendingCount + 1,
      finishing: false,
      label: nextLabel,
      // Start already moving so the bar doesn't sit at 0.
      percent: wasIdle ? 8 : state.percent,
    }));
    if (wasIdle) {
      startTick();
    }
    toast.progress(`${nextLabel}…`, { source: "mutation" });
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
      toast.dismissProgress("mutation");
      set({ percent: 0, finishing: false, label: "Saving" });
    }, 220);
  },
  reset: () => {
    clearTick();
    clearFinish();
    toast.dismissProgress("mutation");
    set({ pendingCount: 0, percent: 0, finishing: false, label: "Saving" });
  },
}));

export function isMutationBusy(): boolean {
  const s = useMutationBusyStore.getState();
  return s.pendingCount > 0 || s.finishing;
}

/**
 * Wrap non–React Query writes (manual fetch / setSaving) so they share the
 * global 0–100% progress indicator and retry a couple times in the background.
 */
export async function withWriteProgress<T>(
  fn: () => Promise<T>,
  label = "Saving",
): Promise<T> {
  useMutationBusyStore.getState().begin(label);
  try {
    return await withWriteRetries(fn);
  } finally {
    useMutationBusyStore.getState().end();
  }
}
