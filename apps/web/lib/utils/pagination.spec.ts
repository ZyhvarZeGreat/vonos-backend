import { describe, expect, it } from "vitest";
import {
  appointmentListCursor,
  compositeListCursor,
  createdAtListCursor,
  encodeCompositeCursor,
  expenseListCursor,
  invoiceListCursor,
  itemListCursor,
  plateListCursor,
  saleListCursor,
} from "./pagination";

describe("composite cursors", () => {
  it("round-trips sort value + id", () => {
    const encoded = encodeCompositeCursor({
      sortValue: "2026-08-01T00:00:00.000Z",
      id: "sale_1",
    });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    expect(JSON.parse(json)).toEqual({
      sortValue: "2026-08-01T00:00:00.000Z",
      id: "sale_1",
    });
  });

  it("builds sale / generic list cursors", () => {
    const sale = saleListCursor({
      id: "s1",
      date: "2026-08-01T12:00:00.000Z",
    });
    const generic = compositeListCursor(
      { id: "i1", name: "Brake pad" },
      "name",
    );
    expect(JSON.parse(Buffer.from(sale, "base64url").toString("utf8")).id).toBe(
      "s1",
    );
    expect(
      JSON.parse(Buffer.from(generic, "base64url").toString("utf8")).sortValue,
    ).toBe("Brake pad");
  });

  it("builds entity-specific composite cursors matching API sort fields", () => {
    const decode = (c: string) =>
      JSON.parse(Buffer.from(c, "base64url").toString("utf8")) as {
        sortValue: string;
        id: string;
      };

    expect(
      decode(
        itemListCursor({
          id: "i1",
          name: "Oil",
          updatedAt: "2026-08-01T12:00:00.000Z",
        }),
      ),
    ).toEqual({
      sortValue: "2026-08-01T12:00:00.000Z",
      id: "i1",
    });
    expect(
      decode(
        createdAtListCursor({
          id: "j1",
          createdAt: "2026-08-01T12:00:00.000Z",
        }),
      ),
    ).toEqual({ sortValue: "2026-08-01T12:00:00.000Z", id: "j1" });
    expect(
      decode(plateListCursor({ id: "v1", plateNumber: "ABC-123" })),
    ).toEqual({ sortValue: "ABC-123", id: "v1" });
    expect(
      decode(
        expenseListCursor({
          id: "e1",
          expenseDate: "2026-08-01T00:00:00.000Z",
        }),
      ),
    ).toEqual({ sortValue: "2026-08-01T00:00:00.000Z", id: "e1" });
    expect(
      decode(
        invoiceListCursor({
          id: "inv1",
          documentDate: "2026-08-01T00:00:00.000Z",
        }),
      ),
    ).toEqual({ sortValue: "2026-08-01T00:00:00.000Z", id: "inv1" });
    expect(
      decode(
        appointmentListCursor({
          id: "a1",
          startTime: "2026-08-01T09:30:00.000Z",
        }),
      ),
    ).toEqual({ sortValue: "2026-08-01T09:30:00.000Z", id: "a1" });
  });
});
