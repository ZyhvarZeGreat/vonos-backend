import { describe, expect, it } from "vitest";
import {
  hasMultiEntityClearance,
  isCafeAdminCrossSite,
} from "./viewingTenant";

describe("hasMultiEntityClearance", () => {
  it("requires more than one cleared entity", () => {
    expect(hasMultiEntityClearance([])).toBe(false);
    expect(hasMultiEntityClearance(["VA"])).toBe(false);
    expect(hasMultiEntityClearance(["VA", "VISP"])).toBe(true);
  });
});

describe("isCafeAdminCrossSite", () => {
  it("unlocks Cafe entity admins for Autos + Cafe switching", () => {
    expect(isCafeAdminCrossSite("admin", ["VC"], "tenant_vc_001")).toBe(true);
    expect(isCafeAdminCrossSite("admin", [], "tenant_vc_001")).toBe(true);
    expect(isCafeAdminCrossSite("admin", ["VW", "VC"], "tenant_vw_001")).toBe(
      true,
    );
  });

  it("does not unlock non-admin or non-Cafe staff", () => {
    expect(isCafeAdminCrossSite("staff", ["VC"], "tenant_vc_001")).toBe(false);
    expect(isCafeAdminCrossSite("admin", ["VW"], "tenant_vw_001")).toBe(false);
    expect(isCafeAdminCrossSite("super_admin", ["VC"], null)).toBe(false);
  });
});
