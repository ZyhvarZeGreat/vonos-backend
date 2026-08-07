import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { patchEntityInQueries } from "@/lib/query/optimistic";

describe("patchEntityInQueries", () => {
  it("patches catalog list pages used by product table", () => {
    const qc = new QueryClient();
    const key = ["catalog", "tenant_1", "hq6-upos", "page", 0];
    qc.setQueryData(key, {
      items: [
        { id: "a", name: "Old", sellPrice: 100 },
        { id: "b", name: "Other", sellPrice: 50 },
      ],
      hasMore: false,
      totalCount: 2,
    });

    patchEntityInQueries(qc, ["catalog"], "a", {
      name: "New",
      sellPrice: 4550,
    });

    const next = qc.getQueryData<{ items: Array<{ id: string; name: string; sellPrice: number }> }>(
      key,
    );
    expect(next?.items[0]).toMatchObject({
      id: "a",
      name: "New",
      sellPrice: 4550,
    });
    expect(next?.items[1]).toMatchObject({ id: "b", name: "Other" });
  });

  it("patches useInfiniteQuery pages (VAG users list)", () => {
    const qc = new QueryClient();
    const key = ["users", "all", "hq6", "infinite", ""];
    qc.setQueryData(key, {
      pages: [
        {
          items: [
            { id: "u1", name: "Ada" },
            { id: "u2", name: "Bola" },
          ],
          hasMore: true,
        },
        {
          items: [{ id: "u3", name: "Chi" }],
          hasMore: false,
        },
      ],
      pageParams: [undefined, "cursor-2"],
    });

    patchEntityInQueries(qc, ["users"], "u2", { name: "Bola Updated" });

    const next = qc.getQueryData<{
      pages: Array<{ items: Array<{ id: string; name: string }> }>;
    }>(key);
    expect(next?.pages[0]?.items[1]?.name).toBe("Bola Updated");
    expect(next?.pages[1]?.items[0]?.name).toBe("Chi");
  });
});
