import { afterEach, describe, expect, it, vi } from "vitest";

describe("isAuthSkipped", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("is false unless NEXT_PUBLIC_SKIP_AUTH=true", async () => {
    vi.stubEnv("NEXT_PUBLIC_SKIP_AUTH", "false");
    const { isAuthSkipped } = await import("./devAccess");
    expect(isAuthSkipped()).toBe(false);
  });

  it("is true when SKIP_AUTH is enabled for e2e / local", async () => {
    vi.stubEnv("NEXT_PUBLIC_SKIP_AUTH", "true");
    vi.resetModules();
    const { isAuthSkipped } = await import("./devAccess");
    expect(isAuthSkipped()).toBe(true);
  });
});
