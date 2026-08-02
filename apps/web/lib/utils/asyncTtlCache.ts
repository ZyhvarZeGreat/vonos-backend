/**
 * Tiny in-memory TTL cache for async results (typeahead / option lists).
 *
 * Keeps recent lookups instant without a network round-trip — a big win when
 * the API talks to a geographically distant database. In-flight promises are
 * shared so rapid keystrokes for the same key coalesce into one request.
 *
 * This is a per-session, per-tab memo — not a correctness-critical store. Use a
 * short TTL so freshly created/edited records surface quickly.
 */
interface Entry<T> {
  value?: T;
  promise: Promise<T>;
  expiresAt: number;
}

export interface AsyncTtlCacheOptions {
  /** Time a resolved value stays fresh, in ms. */
  ttlMs?: number;
  /** Max distinct keys retained (oldest evicted first). */
  maxEntries?: number;
}

export function createAsyncTtlCache<T>(options?: AsyncTtlCacheOptions) {
  const ttlMs = options?.ttlMs ?? 30_000;
  const maxEntries = options?.maxEntries ?? 100;
  const store = new Map<string, Entry<T>>();

  function evictIfNeeded() {
    while (store.size > maxEntries) {
      const oldestKey = store.keys().next().value;
      if (oldestKey === undefined) break;
      store.delete(oldestKey);
    }
  }

  return {
    async get(key: string, loader: () => Promise<T>): Promise<T> {
      const now = Date.now();
      const existing = store.get(key);
      if (existing && existing.expiresAt > now) {
        return existing.promise;
      }

      const promise = loader();
      const entry: Entry<T> = { promise, expiresAt: now + ttlMs };
      // Refresh recency ordering on write.
      store.delete(key);
      store.set(key, entry);
      evictIfNeeded();

      try {
        entry.value = await promise;
        return entry.value;
      } catch (err) {
        // Never cache failures — allow the next attempt to retry immediately.
        if (store.get(key) === entry) store.delete(key);
        throw err;
      }
    },
    clear() {
      store.clear();
    },
  };
}
