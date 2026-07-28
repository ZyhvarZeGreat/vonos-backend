"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CsvExportPayload } from "@/lib/utils/exportCsv";

export type ListTableColumnMeta = {
  key: string;
  label: string;
  hideable: boolean;
};

export type ListTableBridgeApi = {
  /** Build export rows for the currently visible table page. */
  getExportPayload: (filenameBase: string) => CsvExportPayload | null;
  getColumns: () => ListTableColumnMeta[];
  getVisibleKeys: () => string[];
  setVisibleKeys: (keys: string[]) => void;
  resetVisibleKeys: () => void;
};

type ListTableBridgeContextValue = {
  api: ListTableBridgeApi | null;
  register: (api: ListTableBridgeApi) => () => void;
};

const ListTableBridgeContext = createContext<ListTableBridgeContextValue | null>(
  null,
);

export function ListTableBridgeProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<ListTableBridgeApi | null>(null);
  const register = useCallback((next: ListTableBridgeApi) => {
    setApi(next);
    return () => {
      setApi((prev) => (prev === next ? null : prev));
    };
  }, []);

  const value = useMemo(() => ({ api, register }), [api, register]);

  return (
    <ListTableBridgeContext.Provider value={value}>
      {children}
    </ListTableBridgeContext.Provider>
  );
}

export function useListTableBridge(): ListTableBridgeContextValue | null {
  return useContext(ListTableBridgeContext);
}

/**
 * Register the active table with the nearest ListPageShell bridge.
 * No-op when rendered outside a bridge provider.
 */
export function useRegisterListTable(api: ListTableBridgeApi | null): void {
  const bridge = useContext(ListTableBridgeContext);
  const apiRef = useRef(api);
  apiRef.current = api;

  const stableApi = useMemo<ListTableBridgeApi | null>(() => {
    if (!api) return null;
    return {
      getExportPayload: (filenameBase) =>
        apiRef.current?.getExportPayload(filenameBase) ?? null,
      getColumns: () => apiRef.current?.getColumns() ?? [],
      getVisibleKeys: () => apiRef.current?.getVisibleKeys() ?? [],
      setVisibleKeys: (keys) => {
        apiRef.current?.setVisibleKeys(keys);
      },
      resetVisibleKeys: () => {
        apiRef.current?.resetVisibleKeys();
      },
    };
  }, [api != null]);

  useEffect(() => {
    if (!bridge || !stableApi) return;
    return bridge.register(stableApi);
  }, [bridge, stableApi]);
}
