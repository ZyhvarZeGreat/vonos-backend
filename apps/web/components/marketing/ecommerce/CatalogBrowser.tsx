"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ProductCard from "@/components/marketing/ecommerce/ProductCard";
import SectionHead from "@/components/marketing/ecommerce/SectionHead";
import { formatShopLabel, type ShopProduct } from "@/lib/marketing/shop-catalog";
import { matchSearchRows } from "@/lib/utils/listClientSearch";

const PAGE_SIZE = 12;
const SEARCH_KEYS = ["name", "sku", "category", "description"] as const;

const SORT_OPTIONS = [
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name_asc", label: "Name: A–Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

type CatalogBrowserProps = {
  products: ShopProduct[];
  categories: string[];
  loading: boolean;
  warming: boolean;
  error: string;
};

function parsePrice(raw: string): number | undefined {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Items with no price sort last in either direction rather than leading the grid at ₦0. */
function sortPrice(product: ShopProduct, unpriced: number): number {
  return product.price > 0 ? product.price : unpriced;
}

function compare(a: ShopProduct, b: ShopProduct, sort: SortValue): number {
  switch (sort) {
    case "price_asc":
      return (
        sortPrice(a, Number.POSITIVE_INFINITY) - sortPrice(b, Number.POSITIVE_INFINITY) ||
        a.name.localeCompare(b.name)
      );
    case "price_desc":
      return (
        sortPrice(b, Number.NEGATIVE_INFINITY) - sortPrice(a, Number.NEGATIVE_INFINITY) ||
        a.name.localeCompare(b.name)
      );
    case "name_asc":
      return a.name.localeCompare(b.name);
    default: {
      const exhaustive: never = sort;
      return exhaustive;
    }
  }
}

export default function CatalogBrowser({
  products,
  categories,
  loading,
  warming,
  error,
}: CatalogBrowserProps) {
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q")?.trim() ?? "";

  const [search, setSearch] = useState(queryFromUrl);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortValue>("price_asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!queryFromUrl) return;
    setSearch(queryFromUrl);
    requestAnimationFrame(() => {
      document.getElementById("shop-catalog")?.scrollIntoView({ behavior: "smooth" });
    });
  }, [queryFromUrl]);

  useEffect(() => {
    setPage(0);
  }, [search, category, sort, minPrice, maxPrice, inStockOnly]);

  const categoryOptions = useMemo(() => {
    const source = categories.length > 0 ? categories : products.map((item) => item.category);
    const unique = Array.from(
      new Map(source.map((name) => [name.trim().toLowerCase(), name.trim()])).values(),
    )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return ["All", ...unique];
  }, [categories, products]);

  const filtered = useMemo(() => {
    const min = parsePrice(minPrice);
    const max = parsePrice(maxPrice);
    let rows = products;

    if (category !== "All") {
      const needle = category.trim().toLowerCase();
      rows = rows.filter((item) => item.category.trim().toLowerCase() === needle);
    }
    if (min != null) rows = rows.filter((item) => item.price >= min);
    if (max != null) rows = rows.filter((item) => item.price <= max);
    if (inStockOnly) rows = rows.filter((item) => item.inStock !== false);

    rows = matchSearchRows(rows, search, [...SEARCH_KEYS]);

    // In-stock parts always rank above back-order lines.
    return [...rows].sort((a, b) => {
      const stockDelta = Number(a.inStock !== false) - Number(b.inStock !== false);
      if (stockDelta !== 0) return -stockDelta;
      return compare(a, b, sort);
    });
  }, [products, category, minPrice, maxPrice, inStockOnly, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const filtersActive =
    category !== "All" ||
    Boolean(search.trim()) ||
    inStockOnly ||
    sort !== "price_asc" ||
    Boolean(minPrice) ||
    Boolean(maxPrice);

  function goToPage(next: number) {
    setPage(next);
    document.getElementById("shop-catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  function clearFilters() {
    setSearch("");
    setCategory("All");
    setSort("price_asc");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
  }

  return (
    <section className="vg-sec" id="shop-catalog" data-qa-section="shop-catalog">
      <div className="vg-container">
        <SectionHead id="shop-catalog-heading" title="All Products" />

        {error ? (
          <div className="vg-error" role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        <div className="vg-catalog">
          <aside className="vg-filters" aria-label="Filter parts">
            <div className="vg-filters__head">
              <p className="vg-filters__title">Filters</p>
              {filtersActive ? (
                <button type="button" className="vg-filters__clear" onClick={clearFilters}>
                  Clear
                </button>
              ) : null}
            </div>

            <div className="vg-field vg-search">
              <label className="vg-field__label" htmlFor="vg-catalog-search">
                Search
              </label>
              <Search size={16} strokeWidth={1.8} aria-hidden />
              <input
                id="vg-catalog-search"
                type="search"
                className="vg-input"
                placeholder="Part name or SKU"
                value={search}
                autoComplete="off"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="vg-field">
              <label className="vg-field__label" htmlFor="vg-catalog-category">
                Category
              </label>
              <select
                id="vg-catalog-category"
                className="vg-select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name === "All" ? "All categories" : formatShopLabel(name)}
                  </option>
                ))}
              </select>
            </div>

            <div className="vg-field">
              <label className="vg-field__label" htmlFor="vg-catalog-sort">
                Sort by
              </label>
              <select
                id="vg-catalog-sort"
                className="vg-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortValue)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="vg-field">
              <span className="vg-field__label">Price (₦)</span>
              <div className="vg-field__row">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="vg-input"
                  placeholder="Min"
                  aria-label="Minimum price"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
                <span aria-hidden>–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="vg-input"
                  placeholder="Max"
                  aria-label="Maximum price"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </div>
            </div>

            <label className="vg-check">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
              />
              In stock only
            </label>
          </aside>

          <div>
            <p className="vg-catalog__meta">
              {loading
                ? "Loading parts…"
                : `${filtered.length} part${filtered.length === 1 ? "" : "s"} · page ${safePage + 1} of ${totalPages}${
                    warming ? " · loading more…" : ""
                  }`}
            </p>

            {loading && products.length === 0 ? (
              <div className="vg-products vg-catalog__grid">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index}>
                    <div className="vg-skeleton vg-skeleton--card" />
                    <div className="vg-skeleton vg-skeleton--line" />
                  </div>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="vg-empty">
                No parts found{search.trim() ? ` for “${search.trim()}”` : ""}. Try another
                search or category.
              </p>
            ) : (
              <div className="vg-products vg-catalog__grid">
                {visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {!loading && totalPages > 1 ? (
              <nav className="vg-pager" aria-label="Catalogue pages">
                <button
                  type="button"
                  className="vg-pager__btn"
                  disabled={safePage === 0}
                  onClick={() => goToPage(safePage - 1)}
                >
                  <ChevronLeft size={18} aria-hidden />
                  Previous
                </button>
                <span className="vg-pager__count">
                  Page {safePage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  className="vg-pager__btn"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => goToPage(safePage + 1)}
                >
                  Next
                  <ChevronRight size={18} aria-hidden />
                </button>
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
