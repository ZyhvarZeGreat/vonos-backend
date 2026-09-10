import { describe, expect, it } from "vitest";
import { hasMultiEntityClearance } from "./viewingTenant";

describe("hasMultiEntityClearance", () => {
  it("requires more than one cleared entity", () => {
    expect(hasMultiEntityClearance([])).toBe(false);
    expect(hasMultiEntityClearance(["VA"])).toBe(false);
    expect(hasMultiEntityClearance(["VA", "VISP"])).toBe(true);
  });
});
