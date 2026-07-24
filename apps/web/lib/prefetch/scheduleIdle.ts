/** Run work when the browser is idle so login / first paint stay responsive. */
export function scheduleIdle(work: () => void, timeoutMs = 2000): void {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => work(), { timeout: timeoutMs });
  } else {
    globalThis.setTimeout(work, Math.min(timeoutMs, 250));
  }
}

/**
 * Run prefetch tasks one-at-a-time across idle slices.
 * Wide gaps keep post-login overview / first paint from competing with nav warm.
 */
export function scheduleIdleBatch(tasks: Array<() => void>, gapMs = 400): void {
  if (tasks.length === 0) return;
  let index = 0;
  const runNext = () => {
    const task = tasks[index];
    if (!task) return;
    task();
    index += 1;
    if (index >= tasks.length) return;
    globalThis.setTimeout(() => scheduleIdle(runNext, gapMs + 1500), gapMs);
  };
  scheduleIdle(runNext, 2500);
}
