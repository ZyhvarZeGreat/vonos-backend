import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("items API client write contract", () => {
  const src = readFileSync(join(__dirname, "items.ts"), "utf8");

  it("createItem surfaces the server error body", () => {
    expect(src).toContain('throwApiError(response, "Failed to create item")');
  });

  it("updateItem surfaces the server error body and can scope tenant", () => {
    expect(src).toContain('throwApiError(response, "Failed to update item")');
    expect(src).toContain("withTenantQuery(`/items/${id}`, tenantId)");
  });
});
