import { describe, expect, it } from "vitest";
import {
  productDuplicateQueryKey,
  productEditQueryKey,
} from "./prefetchListDetails";

describe("product form prefetch keys", () => {
  it("edit page key matches AddProductView", () => {
    expect(productEditQueryKey("imp_shuiyz06ar7layu9h3h2481c")).toEqual([
      "item",
      "edit-page",
      "imp_shuiyz06ar7layu9h3h2481c",
    ]);
  });

  it("duplicate page key matches AddProductView", () => {
    expect(productDuplicateQueryKey("item_1")).toEqual([
      "item",
      "duplicate-page",
      "item_1",
    ]);
  });
});
