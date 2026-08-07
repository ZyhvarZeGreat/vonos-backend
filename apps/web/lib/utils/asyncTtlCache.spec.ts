import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAsyncTtlCache } from "./asyncTtlCache";

describe("createAsyncTtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same value without re-running the loader within TTL", async () => {
    const cache = createAsyncTtlCache<string>({ ttlMs: 10_000 });
    const loader = vi.fn(async () => "alpha");

    const first = await cache.get("k", loader);
    const second = await cache.get("k", loader);

    expect(first).toBe("alpha");
    expect(second).toBe("alpha");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("coalesces in-flight loads for the same key into one loader call", async () => {
    const cache = createAsyncTtlCache<string>({ ttlMs: 10_000 });
    let resolveLoader!: (value: string) => void;
    const loader = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoader = resolve;
        }),
    );

    const p1 = cache.get("same", loader);
    const p2 = cache.get("same", loader);
    expect(loader).toHaveBeenCalledTimes(1);

    resolveLoader("ready");
    await expect(Promise.all([p1, p2])).resolves.toEqual(["ready", "ready"]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures — next get retries the loader", async () => {
    const cache = createAsyncTtlCache<string>({ ttlMs: 10_000 });
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("ok");

    await expect(cache.get("k", loader)).rejects.toThrow("boom");
    await expect(cache.get("k", loader)).resolves.toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("reloads after TTL expiry", async () => {
    const cache = createAsyncTtlCache<string>({ ttlMs: 1_000 });
    const loader = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    await expect(cache.get("k", loader)).resolves.toBe("v1");
    vi.advanceTimersByTime(1_001);
    await expect(cache.get("k", loader)).resolves.toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("evicts the oldest key when maxEntries is exceeded", async () => {
    const cache = createAsyncTtlCache<string>({
      ttlMs: 60_000,
      maxEntries: 2,
    });
    const loader = vi.fn(async (v: string) => v);

    await cache.get("a", () => loader("a"));
    await cache.get("b", () => loader("b"));
    await cache.get("c", () => loader("c"));

    // "a" should have been evicted — loading it again hits the loader.
    const before = loader.mock.calls.length;
    await cache.get("a", () => loader("a-again"));
    expect(loader.mock.calls.length).toBe(before + 1);
  });

  it("warm hit is faster than a slow cold miss (elapsed budget)", async () => {
    vi.useRealTimers();
    const cache = createAsyncTtlCache<number[]>({ ttlMs: 30_000 });
    const payload = Array.from({ length: 500 }, (_, i) => i);

    const coldStart = performance.now();
    await cache.get("roster", async () => {
      await new Promise((r) => setTimeout(r, 40));
      return payload;
    });
    const coldMs = performance.now() - coldStart;

    const warmStart = performance.now();
    await cache.get("roster", async () => {
      throw new Error("loader must not run on warm hit");
    });
    const warmMs = performance.now() - warmStart;

    expect(coldMs).toBeGreaterThanOrEqual(35);
    expect(warmMs).toBeLessThan(5);
    expect(warmMs).toBeLessThan(coldMs / 4);
  });
});
