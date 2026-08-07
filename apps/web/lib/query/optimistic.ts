import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type QuerySnapshot = Array<[QueryKey, unknown]>;

/** Snapshot matching caches for rollback. Do not await cancel — it blocked Save UX. */
export async function snapshotQueries(
  queryClient: QueryClient,
  keys: readonly QueryKey[],
): Promise<QuerySnapshot> {
  const previous: QuerySnapshot = [];
  for (const key of keys) {
    void queryClient.cancelQueries({ queryKey: key });
    previous.push(
      ...queryClient.getQueriesData({ queryKey: key }).map(
        ([queryKey, data]) => [queryKey, data] as [QueryKey, unknown],
      ),
    );
  }
  return previous;
}

export function restoreQueries(
  queryClient: QueryClient,
  previous: QuerySnapshot | undefined,
): void {
  if (!previous) return;
  for (const [queryKey, data] of previous) {
    queryClient.setQueryData(queryKey, data);
  }
}

/** Mark list caches stale and refetch in the background — never block UI. */
export function invalidateOptimisticKeys(
  queryClient: QueryClient,
  keys: readonly QueryKey[],
): void {
  for (const key of keys) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}

type ListLike<T> = {
  items?: T[];
  data?: T[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function mapCollection<T extends { id: string }>(
  data: unknown,
  mapItems: (items: T[]) => T[],
): unknown {
  if (Array.isArray(data)) {
    return mapItems(data as T[]);
  }
  if (!isRecord(data)) return data;

  // useInfiniteQuery: { pages: ListPage[], pageParams }
  if (Array.isArray(data.pages)) {
    return {
      ...data,
      pages: data.pages.map((page) => mapCollection(page, mapItems)),
    };
  }

  const list = data as ListLike<T>;
  if (Array.isArray(list.items)) {
    return { ...data, items: mapItems(list.items) };
  }
  if (Array.isArray(list.data)) {
    return { ...data, data: mapItems(list.data) };
  }
  if (typeof data.id === "string") {
    const single = data as unknown as T;
    const [next] = mapItems([single]);
    return next ?? data;
  }
  return data;
}

/** Patch every cached query under `keyPrefix` that looks like a list or entity. */
export function mapQueriesByPrefix<T extends { id: string }>(
  queryClient: QueryClient,
  keyPrefix: QueryKey,
  mapItems: (items: T[]) => T[],
): void {
  const entries = queryClient.getQueriesData({ queryKey: keyPrefix });
  for (const [queryKey, data] of entries) {
    queryClient.setQueryData(queryKey, mapCollection(data, mapItems));
  }
}

type PatchableEntity = { id: string };

/** Patch list-cache rows by id. `patch` is a plain object merge or updater. */
export function patchEntityInQueries(
  queryClient: QueryClient,
  keyPrefix: QueryKey,
  id: string,
  patch: object | ((current: PatchableEntity) => PatchableEntity),
): void {
  mapQueriesByPrefix<PatchableEntity>(queryClient, keyPrefix, (items) =>
    items.map((item) => {
      if (item.id !== id) return item;
      return typeof patch === "function"
        ? patch(item)
        : ({ ...item, ...patch } as PatchableEntity);
    }),
  );
}

export function removeEntityFromQueries(
  queryClient: QueryClient,
  keyPrefix: QueryKey,
  id: string,
): void {
  const entries = queryClient.getQueriesData({ queryKey: keyPrefix });
  for (const [queryKey, data] of entries) {
    if (Array.isArray(data)) {
      queryClient.setQueryData(
        queryKey,
        (data as Array<{ id: string }>).filter((item) => item.id !== id),
      );
      continue;
    }
    if (!isRecord(data)) continue;
    const list = data as ListLike<{ id: string }> & { totalCount?: number };
    if (Array.isArray(list.items)) {
      const nextItems = list.items.filter((item) => item.id !== id);
      const removed = nextItems.length !== list.items.length;
      queryClient.setQueryData(queryKey, {
        ...data,
        items: nextItems,
        ...(typeof list.totalCount === "number" && removed
          ? { totalCount: Math.max(0, list.totalCount - 1) }
          : {}),
      });
      continue;
    }
    if (Array.isArray(list.data)) {
      queryClient.setQueryData(queryKey, {
        ...data,
        data: list.data.filter((item) => item.id !== id),
      });
    }
  }
}

export function prependEntityInQueries<T extends { id: string }>(
  queryClient: QueryClient,
  keyPrefix: QueryKey,
  entity: T,
): void {
  const entries = queryClient.getQueriesData({ queryKey: keyPrefix });
  for (const [queryKey, data] of entries) {
    if (Array.isArray(data)) {
      const items = data as T[];
      if (items.some((item) => item.id === entity.id)) {
        queryClient.setQueryData(
          queryKey,
          items.map((item) => (item.id === entity.id ? entity : item)),
        );
      } else {
        queryClient.setQueryData(queryKey, [entity, ...items]);
      }
      continue;
    }
    if (!isRecord(data)) continue;
    const list = data as ListLike<T> & { totalCount?: number };
    if (Array.isArray(list.items)) {
      const exists = list.items.some((item) => item.id === entity.id);
      const items = exists
        ? list.items.map((item) => (item.id === entity.id ? entity : item))
        : [entity, ...list.items];
      queryClient.setQueryData(queryKey, {
        ...data,
        items,
        ...(typeof list.totalCount === "number" && !exists
          ? { totalCount: list.totalCount + 1 }
          : {}),
      });
      continue;
    }
    if (Array.isArray(list.data)) {
      const exists = list.data.some((item) => item.id === entity.id);
      const nextData = exists
        ? list.data.map((item) => (item.id === entity.id ? entity : item))
        : [entity, ...list.data];
      queryClient.setQueryData(queryKey, { ...data, data: nextData });
    }
  }
}

/** Client-only id for optimistic creates (replaced on commit / invalidate). */
export function optimisticTempId(prefix = "optimistic"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface OptimisticConfig<TVariables, TData = unknown> {
  /** Query key prefixes to cancel, snapshot, roll back, and invalidate. */
  keys: readonly QueryKey[];
  /** Apply cache edits before the network round-trip. */
  update?: (queryClient: QueryClient, variables: TVariables) => void;
  /** Optional post-success cache write before invalidation. */
  commit?: (
    queryClient: QueryClient,
    data: TData,
    variables: TVariables,
  ) => void;
  /** Invalidate keys after settle (default true). */
  invalidate?: boolean;
}

export interface OptimisticMutationContext {
  previous: QuerySnapshot;
}

/** Shared optimistic lifecycle for useAppMutation / raw useMutation. */
export function createOptimisticHandlers<TData, TVariables>(
  queryClient: QueryClient,
  config: OptimisticConfig<TVariables, TData>,
) {
  const invalidate = config.invalidate !== false;

  return {
    onMutate: async (
      variables: TVariables,
    ): Promise<OptimisticMutationContext> => {
      const previous = await snapshotQueries(queryClient, config.keys);
      config.update?.(queryClient, variables);
      return { previous };
    },
    onError: (
      _error: unknown,
      _variables: TVariables,
      context: OptimisticMutationContext | undefined,
    ) => {
      restoreQueries(queryClient, context?.previous);
    },
    onSuccess: (data: TData, variables: TVariables) => {
      config.commit?.(queryClient, data, variables);
    },
    onSettled: () => {
      // Don't block the mutation (or Saving chip) on list refetches.
      if (invalidate) {
        invalidateOptimisticKeys(queryClient, config.keys);
      }
    },
  };
}
