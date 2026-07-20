/** Run work when the browser is idle so login / first paint stay responsive. */
export function scheduleIdle(work: () => void, timeoutMs = 2000): void {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => work(), { timeout: timeoutMs });
  } else {
    globalThis.setTimeout(work, 0);
  }
}

/** Stagger multiple prefetch tasks across idle slices. */
export function scheduleIdleBatch(tasks: Array<() => void>, gapMs = 50): void {
  tasks.forEach((task, index) => {
    scheduleIdle(() => {
      globalThis.setTimeout(task, index * gapMs);
    });
  });
}
