import { create } from "zustand";

interface MutationBusyState {
  pendingCount: number;
  begin: () => void;
  end: () => void;
  reset: () => void;
}

export const useMutationBusyStore = create<MutationBusyState>((set) => ({
  pendingCount: 0,
  begin: () => set((state) => ({ pendingCount: state.pendingCount + 1 })),
  end: () =>
    set((state) => ({
      pendingCount: Math.max(0, state.pendingCount - 1),
    })),
  reset: () => set({ pendingCount: 0 }),
}));

export function isMutationBusy(): boolean {
  return useMutationBusyStore.getState().pendingCount > 0;
}
