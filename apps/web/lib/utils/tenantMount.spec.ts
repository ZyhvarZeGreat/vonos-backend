import { afterEach, describe, expect, it, vi } from "vitest";

describe("tenantMount", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("nests VC, VS and VKW under /operations when basePath is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    const { tenantBasePath, tenantPath } = await import("./tenantMount");
    expect(tenantBasePath("VC")).toBe("/operations/VC");
    expect(tenantBasePath("VS")).toBe("/operations/VS");
    expect(tenantBasePath("VKW")).toBe("/operations/VKW");
    expect(tenantBasePath("VA")).toBe("/VA");
    expect(tenantPath("VS", "overview")).toBe("/operations/VS/overview");
    expect(tenantPath("VC", "orders")).toBe("/operations/VC/orders");
    expect(tenantPath("VA", "sales", "abc")).toBe("/VA/sales/abc");
  });

  it("does not double-nest when APP_BASE_PATH is /operations", async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/operations");
    const { tenantBasePath, tenantPath } = await import("./tenantMount");
    expect(tenantBasePath("VC")).toBe("/VC");
    expect(tenantBasePath("VS")).toBe("/VS");
    expect(tenantBasePath("VKW")).toBe("/VKW");
    expect(tenantPath("VS", "appointments")).toBe("/VS/appointments");
  });
});

describe("parseTenantPath with operations mount", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it(
    "parses /operations/VC, /operations/VS and /operations/VKW paths",
    async () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    const { parseTenantPath, tenantOverviewPath } = await import(
      "./tenantRoutes"
    );
    expect(parseTenantPath("/operations/VS/overview")).toEqual({
      tenantCode: "VS",
      section: "overview",
      recordId: null,
    });
    expect(parseTenantPath("/operations/VC/orders")).toEqual({
      tenantCode: "VC",
      section: "orders",
      recordId: null,
    });
    expect(parseTenantPath("/operations/VKW/inventory/item1")).toEqual({
      tenantCode: "VKW",
      section: "inventory",
      recordId: "item1",
    });
    expect(parseTenantPath("/VA/sales")).toEqual({
      tenantCode: "VA",
      section: "sales",
      recordId: null,
    });
    expect(tenantOverviewPath("VS")).toBe("/operations/VS/overview");
    expect(tenantOverviewPath("VC")).toBe("/operations/VC/overview");
    expect(tenantOverviewPath("VA")).toBe("/VA/overview");
  },
    15_000,
  );
});
