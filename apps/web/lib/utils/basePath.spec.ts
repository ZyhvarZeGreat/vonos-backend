import { afterEach, describe, expect, it, vi } from "vitest";

describe("basePath helpers", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("is a no-op when NEXT_PUBLIC_BASE_PATH is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    const { withBasePath, stripBasePath, APP_BASE_PATH } = await import(
      "./basePath"
    );
    expect(APP_BASE_PATH).toBe("");
    expect(withBasePath("/VA/sales")).toBe("/VA/sales");
    expect(stripBasePath("/VA/sales")).toBe("/VA/sales");
  });

  it("prefixes and strips /operations", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/operations");
    vi.resetModules();
    const { withBasePath, stripBasePath, publicAssetPath } = await import(
      "./basePath"
    );
    expect(withBasePath("/VA/sales")).toBe("/operations/VA/sales");
    expect(withBasePath("/operations/VA/sales")).toBe("/operations/VA/sales");
    expect(stripBasePath("/operations/VA/sales")).toBe("/VA/sales");
    expect(stripBasePath("/operations")).toBe("/");
    expect(publicAssetPath("/brand/logo.png")).toBe(
      "/operations/brand/logo.png",
    );
  });
});
