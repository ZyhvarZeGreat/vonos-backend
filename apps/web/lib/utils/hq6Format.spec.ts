import { describe, expect, it } from "vitest";
import { hq6DistinctName } from "./hq6Format";

describe("hq6DistinctName", () => {
  it("hides a contact name that repeats the business name", () => {
    expect(hq6DistinctName("Sunny Day", "Sunny Day")).toBe("");
    expect(hq6DistinctName("sunny day", "Sunny Day")).toBe("");
  });

  it("keeps a different contact person", () => {
    expect(hq6DistinctName("Ada", "Sunny Day")).toBe("Ada");
  });

  it("stays blank when no contact person was stored", () => {
    expect(hq6DistinctName(null, "Sunny Day")).toBe("");
    expect(hq6DistinctName("  ", "Sunny Day")).toBe("");
  });
});
