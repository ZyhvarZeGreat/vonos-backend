/**
 * Opt-in idempotency for leave-first / retried writes.
 * apiFetch attaches X-Idempotency-Key when a key is active in this scope.
 * Requests outside withIdempotencyKey() are unchanged.
 *
 * One-shot per scope: only the first apiFetch inside withIdempotencyKey()
 * gets the header. Follow-up calls in the same mutation (pay, sync sell
 * price, etc.) must not reuse it — the API rejects same key + different body.
 */

const HEADER = "X-Idempotency-Key";

let activeKey: string | null = null;
let consumed = false;

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getActiveIdempotencyKey(): string | null {
  return activeKey && !consumed ? activeKey : null;
}

export async function withIdempotencyKey<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = activeKey;
  const previousConsumed = consumed;
  activeKey = key;
  consumed = false;
  try {
    return await fn();
  } finally {
    activeKey = previous;
    consumed = previousConsumed;
  }
}

/** Merge active key into fetch headers (no-op when none / already used once). */
export function applyIdempotencyHeaders(headers: Headers): void {
  if (!activeKey || consumed || headers.has(HEADER)) return;
  headers.set(HEADER, activeKey);
  consumed = true;
}

export { HEADER as IDEMPOTENCY_HEADER };
