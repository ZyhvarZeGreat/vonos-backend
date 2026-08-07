import { describe, expect, it, vi } from "vitest";
import { createAccumulatingPicker } from "./accumulatingPicker";

type Row = { id: string; name: string };

function pageOf(items: Row[], hasMore = false) {
  return { items, hasMore, pageSize: items.length || 10 };
}

describe("createAccumulatingPicker", () => {
  it("loads the first batch once and reuses it on second open", async () => {
    const fetchPage = vi.fn(async () =>
      pageOf([
        { id: "1", name: "Alpha" },
        { id: "2", name: "Beta" },
      ]),
    );
    const picker = createAccumulatingPicker<Row>({
      getCursor: (row) => row.id,
      searchKeys: ["name"],
      fetchPage,
      batchSize: 10,
    });

    const first = await picker.ensureFirst("t1");
    const second = await picker.ensureFirst("t1");

    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("loadMore appends the next page and advances the cursor", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(
        pageOf(
          [
            { id: "1", name: "A" },
            { id: "2", name: "B" },
          ],
          true,
        ),
      )
      .mockResolvedValueOnce(
        pageOf(
          [
            { id: "3", name: "C" },
            { id: "4", name: "D" },
          ],
          false,
        ),
      );

    const picker = createAccumulatingPicker<Row>({
      getCursor: (row) => row.id,
      searchKeys: ["name"],
      fetchPage,
      batchSize: 2,
    });

    await picker.ensureFirst("t1");
    const more = await picker.loadMore("t1");

    expect(more.appended.map((r) => r.id)).toEqual(["3", "4"]);
    expect(more.items.map((r) => r.id)).toEqual(["1", "2", "3", "4"]);
    expect(more.hasMore).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage.mock.calls[1]?.[0]).toBe("2");
  });

  it("search matches locally first and skips the API when hits exist", async () => {
    const fetchPage = vi.fn(async (_cursor, _limit, search?: string) => {
      if (search) {
        return pageOf([{ id: "99", name: "Remote Only" }]);
      }
      return pageOf([
        { id: "1", name: "Spark Plug" },
        { id: "2", name: "Oil Filter" },
      ]);
    });

    const picker = createAccumulatingPicker<Row>({
      getCursor: (row) => row.id,
      searchKeys: ["name"],
      fetchPage,
      batchSize: 10,
    });

    const hits = await picker.search("t1", "oil");
    expect(hits.items.map((r) => r.name)).toEqual(["Oil Filter"]);
    // ensureFirst + no search API call
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage.mock.calls[0]?.[2]).toBeUndefined();
  });

  it("search falls back to API when local roster has no matches", async () => {
    const fetchPage = vi.fn(async (_cursor, _limit, search?: string) => {
      if (search) {
        return pageOf([{ id: "9", name: "Zebra Gasket" }]);
      }
      return pageOf([{ id: "1", name: "Alpha" }]);
    });

    const picker = createAccumulatingPicker<Row>({
      getCursor: (row) => row.id,
      searchKeys: ["name"],
      fetchPage,
      batchSize: 10,
    });

    const hits = await picker.search("t1", "zebra");
    expect(hits.items.map((r) => r.name)).toEqual(["Zebra Gasket"]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage.mock.calls[1]?.[2]).toBe("zebra");
  });

  it("clear forces the next open to refetch", async () => {
    const fetchPage = vi.fn(async () =>
      pageOf([{ id: "1", name: "One" }]),
    );
    const picker = createAccumulatingPicker<Row>({
      getCursor: (row) => row.id,
      searchKeys: ["name"],
      fetchPage,
    });

    await picker.ensureFirst("t1");
    picker.clear("t1");
    await picker.ensureFirst("t1");
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
