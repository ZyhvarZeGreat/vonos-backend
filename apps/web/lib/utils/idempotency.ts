/**
 * Opt-in idempotency for leave-first / retried writes.
 * apiFetch attaches X-Idempotency-Key when a key is active in this scope.
 * Requests outside withIdempotencyKey() are unchanged.
 */

const HEADER = "X-Idempotency-Key";

let activeKey: string | null = null;

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getActiveIdempotencyKey(): string | null {
  return activeKey;
}

export async function withIdempotencyKey<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = activeKey;
  activeKey = key;
  try {
    return await fn();
  } finally {
    activeKey = previous;
  }
}

/** Merge active key into fetch headers (no-op when none). */
export function applyIdempotencyHeaders(headers: Headers): void {
  if (!activeKey || headers.has(HEADER)) return;
  headers.set(HEADER, activeKey);
}

export { HEADER as IDEMPOTENCY_HEADER };
