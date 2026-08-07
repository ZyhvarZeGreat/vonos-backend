import { describe, expect, it } from "vitest";
import {
  applyIdempotencyHeaders,
  getActiveIdempotencyKey,
  newIdempotencyKey,
  withIdempotencyKey,
} from "./idempotency";

describe("idempotency helpers", () => {
  it("generates non-empty keys", () => {
    expect(newIdempotencyKey().length).toBeGreaterThan(8);
  });

  it("scopes the active key for nested apiFetch calls", async () => {
    expect(getActiveIdempotencyKey()).toBeNull();
    await withIdempotencyKey("abc-123", async () => {
      expect(getActiveIdempotencyKey()).toBe("abc-123");
      const headers = new Headers();
      applyIdempotencyHeaders(headers);
      expect(headers.get("X-Idempotency-Key")).toBe("abc-123");
    });
    expect(getActiveIdempotencyKey()).toBeNull();
  });

  it("restores the previous key after nested scopes", async () => {
    await withIdempotencyKey("outer", async () => {
      await withIdempotencyKey("inner", async () => {
        expect(getActiveIdempotencyKey()).toBe("inner");
      });
      expect(getActiveIdempotencyKey()).toBe("outer");
    });
  });
});
