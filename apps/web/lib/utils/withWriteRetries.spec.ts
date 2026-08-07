import { describe, expect, it, vi } from "vitest";
import {
  isTransientWriteError,
  withWriteRetries,
} from "./withWriteRetries";

describe("withWriteRetries", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withWriteRetries(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("done");
    await expect(
      withWriteRetries(fn, { attempts: 3, delayMs: 1 }),
    ).resolves.toBe("done");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry validation errors", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Name is required"));
    await expect(
      withWriteRetries(fn, { attempts: 3, delayMs: 1 }),
    ).rejects.toThrow("Name is required");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("detects transient errors", () => {
    expect(isTransientWriteError(new Error("Failed to fetch"))).toBe(true);
    expect(isTransientWriteError(new Error("Select a payment account"))).toBe(
      false,
    );
  });
});
