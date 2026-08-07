/**
 * Background write retries for leave-first / dismiss-first saves.
 * Default: up to 3 attempts (initial + 2 retries) on transient failures only.
 */
export function isTransientWriteError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return /network|fetch failed|failed to fetch|timeout|timed out|ECONN|ENOTFOUND|ETIMEDOUT|503|502|504|429|can't reach|unavailable|socket|idempotency key is already in progress|retry shortly/i.test(
    msg,
  );
}

export async function withWriteRetries<T>(
  fn: () => Promise<T>,
  options?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const delayMs = Math.max(0, options?.delayMs ?? 400);
  let lastError: unknown;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const canRetry =
        i < attempts - 1 && isTransientWriteError(err);
      if (!canRetry) break;
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * (i + 1)),
      );
    }
  }

  throw lastError;
}
