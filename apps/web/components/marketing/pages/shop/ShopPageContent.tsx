"use client";

import Link from "next/link";
import { BadgeCheck, ChevronLeft, ChevronRight, CreditCard, Search, Truck, Wrench } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { refreshMarketingScroll } from "@/components/marketing/MotocareMotion";
import ShopProductCard from "@/components/marketing/shop/ShopProductCard";
import ShopProductListCard from "@/components/marketing/shop/ShopProductListCard";
import {
  ShopCategoryGridSkeleton,
  ShopProductGridSkeleton,
  ShopProductListSkeleton,
} from "@/components/marketing/shop/ShopProductSkeletons";
import {
  formatShopLabel,
  type ShopProduct,
} from "@/lib/marketing/shop-catalog";
import { fetchStoreCatalog } from "@/lib/marketing/store-api";
import { matchSearchRows } from "@/lib/utils/listClientSearch";
import { useShopCart } from "@/stores/shopCartStore";

const PAGE_SIZE = 12;
const CATALOG_PAGE_SIZE = 100;
const CATALOG_MAX_ITEMS = 2000;

const SORT_OPTIONS = [
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name: A–Z" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const BROWSE_PRIORITY = [/oil/i, /lubr/i, /filter/i, /brake/i, /suspension/i, /electrical/i, /sensor/i];

const SEARCH_KEYS = ["name", "sku", "category", "description"] as const;

const TRUST_ITEMS: Array<{ icon: ReactNode; title: string; desc: string }> = [
  { icon: <Truck className="ve-shop-lucide--lg" aria-hidden />, title: "Home delivery", desc: "Parts brought to you" },
  { icon: <Wrench className="ve-shop-lucide--lg" aria-hidden />, title: "Book fitment", desc: "We install what you buy" },
  { icon: <CreditCard className="ve-shop-lucide--lg" aria-hidden />, title: "Paystack checkout", desc: "Secure online payment" },
  { icon: <BadgeCheck className="ve-shop-lucide--lg" aria-hidden />, title: "OE-spec stock", desc: "Same parts we fit daily" },
];

function isOilLike(product: ShopProduct): boolean {
  return /oil|lubr/i.test(`${product.category} ${product.name}`);
}

function isInStock(product: ShopProduct): boolean {
  return product.inStock !== false;
}

function categoryPriority(name: string): number {
  const index = BROWSE_PRIORITY.findIndex((re) => re.test(name));
  return index === -1 ? BROWSE_PRIORITY.length : index;
}

function pickBrowseCategories(all: string[]): string[] {
  const withoutAll = all.filter((c) => c !== "All");
  return [...withoutAll]
    .sort((a, b) => categoryPriority(a) - categoryPriority(b) || a.localeCompare(b))
    .slice(0, 8);
}

function parseOptionalPrice(raw: string): number | undefined {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function categoriesFromCatalog(items: ShopProduct[]): string[] {
  const unique = Array.from(
    new Map(items.map((item) => [item.category.trim().toLowerCase(), item.category.trim()])).values(),
  ).sort((a, b) => categoryPriority(a) - categoryPriority(b) || a.localeCompare(b));
  return ["All", ...unique];
}

function compareBySort(a: ShopProduct, b: ShopProduct, sort: SortValue): number {
  switch (sort) {
    case "price_asc":
      return a.price - b.price || a.name.localeCompare(b.name);
    case "price_desc":
      return b.price - a.price || a.name.localeCompare(b.name);
    case "name_asc":
      return a.name.localeCompare(b.name);
    case "newest":
      return 0;
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

/** In-stock first, oils next (when browsing all), then the active sort. */
function sortProducts(
  items: ShopProduct[],
  sort: SortValue,
  prioritizeOils: boolean,
): ShopProduct[] {
  return [...items].sort((a, b) => {
    const stockDelta = Number(isInStock(a)) - Number(isInStock(b));
    if (stockDelta !== 0) return -stockDelta; // in-stock (true) first

    if (prioritizeOils) {
      const oilDelta = Number(isOilLike(a)) - Number(isOilLike(b));
      if (oilDelta !== 0) return -oilDelta; // oils first
    }

    return compareBySort(a, b, sort);
  });
}

export default function ShopPageContent() {
  const [catalog, setCatalog] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogWarming, setCatalogWarming] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortValue>("price_asc");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(0);
  const { addProduct } = useShopCart();

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogWarming(false);
    setError("");

    try {
      const first = await fetchStoreCatalog({ limit: CATALOG_PAGE_SIZE });
      let items = first.items;
      setCatalog(items);
      setCategories(
        first.categories.length > 0
          ? [
              "All",
              ...Array.from(
                new Map(
                  first.categories.map((c) => [c.trim().toLowerCase(), c.trim()]),
                ).values(),
              )
                .filter(Boolean)
                .sort((a, b) => categoryPriority(a) - categoryPriority(b) || a.localeCompare(b)),
            ]
          : categoriesFromCatalog(items),
      );
      setCatalogLoading(false);

      let cursor = first.nextCursor;
      if (!cursor) return;

      setCatalogWarming(true);
      while (cursor && items.length < CATALOG_MAX_ITEMS) {
        const pageResult = await fetchStoreCatalog({
          cursor,
          limit: CATALOG_PAGE_SIZE,
        });
        if (pageResult.items.length === 0) break;
        items = [...items, ...pageResult.items];
        setCatalog(items);
        setCategories(categoriesFromCatalog(items));
        cursor = pageResult.nextCursor;
        if (!pageResult.nextCursor) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load parts catalog");
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
      setCatalogWarming(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const minPrice = parseOptionalPrice(minPriceInput);
  const maxPrice = parseOptionalPrice(maxPriceInput);

  const filteredProducts = useMemo(() => {
    let rows = catalog;

    if (category !== "All") {
      const needle = category.trim().toLowerCase();
      rows = rows.filter((item) => item.category.trim().toLowerCase() === needle);
    }

    if (minPrice != null) {
      rows = rows.filter((item) => item.price >= minPrice);
    }
    if (maxPrice != null) {
      rows = rows.filter((item) => item.price <= maxPrice);
    }

    if (inStockOnly) {
      rows = rows.filter((item) => item.inStock !== false);
    }

    // Same match-sorter / contains ranking as HQ6 operations tables.
    rows = matchSearchRows(rows, searchInput, [...SEARCH_KEYS]);

    const prioritizeOils = category === "All";
    return sortProducts(rows, sort, prioritizeOils);
  }, [catalog, category, minPrice, maxPrice, inStockOnly, searchInput, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage(0);
  }, [category, sort, minPriceInput, maxPriceInput, searchInput, inStockOnly]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const visibleProducts = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safePage]);

  useEffect(() => {
    if (!catalogLoading) {
      refreshMarketingScroll();
    }
  }, [catalogLoading, visibleProducts.length]);

  const categoryCards = useMemo(() => {
    const browse = pickBrowseCategories(categories);
    return browse.map((name) => {
      const sample = catalog.find((p) => p.category.toLowerCase() === name.toLowerCase());
      return {
        name,
        image: sample?.icon ?? "/images/icons/service-01.svg",
      };
    });
  }, [categories, catalog]);

  const featured = useMemo(() => filteredProducts.slice(0, 4), [filteredProducts]);

  const hasPrev = safePage > 0;
  const hasNext = safePage < totalPages - 1;
  const filtersActive =
    category !== "All" ||
    Boolean(searchInput.trim()) ||
    inStockOnly ||
    sort !== "price_asc" ||
    minPrice != null ||
    maxPrice != null;

  function handleAdd(product: ShopProduct, qty = 1) {
    addProduct(product, qty);
  }

  function selectCategory(name: string) {
    setCategory(name);
    document.getElementById("shop-catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  function goPrevPage() {
    if (!hasPrev) return;
    setPage((current) => Math.max(0, current - 1));
    document.getElementById("shop-catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  function goNextPage() {
    if (!hasNext) return;
    setPage((current) => current + 1);
    document.getElementById("shop-catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  function clearFilters() {
    setCategory("All");
    setSort("price_asc");
    setMinPriceInput("");
    setMaxPriceInput("");
    setSearchInput("");
    setInStockOnly(false);
    setPage(0);
  }

  const resultLabel =
    category === "All" && !searchInput.trim()
      ? "All products"
      : [
          category !== "All" ? formatShopLabel(category) : null,
          searchInput.trim() ? `“${searchInput.trim()}”` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="vonos-shop">
      <section className="vonos-shop-section" aria-labelledby="shop-categories-heading">
        <div className="container-full">
          <h2 id="shop-categories-heading" className="vonos-shop-section-title">
            Browse by categories
          </h2>
          {catalogLoading && categoryCards.length === 0 ? (
            <ShopCategoryGridSkeleton />
          ) : categoryCards.length > 0 ? (
            <ul className="vonos-shop-category-grid">
              {categoryCards.map((cat) => (
                <li key={cat.name}>
                  <button
                    type="button"
                    className="vonos-shop-category-card"
                    onClick={() => selectCategory(cat.name)}
                  >
                    <div className="vonos-shop-category-copy">
                      <span className="vonos-shop-category-name">{formatShopLabel(cat.name)}</span>
                      <span className="vonos-shop-category-meta">Browse</span>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.image} alt="" className="vonos-shop-category-img" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vonos-shop-muted">Categories load with the catalogue.</p>
          )}
        </div>
      </section>

      {catalogLoading && featured.length === 0 ? (
        <section className="vonos-shop-section" aria-labelledby="shop-featured-heading">
          <div className="container-full">
            <h2 id="shop-featured-heading" className="vonos-shop-section-title">
              Featured products
            </h2>
            <ShopProductListSkeleton count={3} />
          </div>
        </section>
      ) : featured.length > 0 ? (
        <section className="vonos-shop-section" aria-labelledby="shop-featured-heading">
          <div className="container-full">
            <h2 id="shop-featured-heading" className="vonos-shop-section-title">
              Featured products
            </h2>
            <div className="ve-shop" style={{ display: "grid", gap: 16 }}>
              {featured.map((product) => (
                <ShopProductListCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="vonos-shop-section vonos-shop-section--tight">
        <div className="container-full">
          <div className="vonos-shop-promo-grid">
            <div className="vonos-shop-promo-card vonos-shop-promo-card--accent">
              <div className="vonos-shop-promo-copy">
                <p className="vonos-shop-promo-eyebrow">Workshop fitment</p>
                <h3 className="vonos-shop-promo-title">We fit what you buy</h3>
                <p className="vonos-shop-promo-text">
                  Choose fitment at checkout and our technicians install with the same warranty as
                  any in-house repair.
                </p>
                <Link href="/contact" className="vonos-shop-btn vonos-shop-btn--primary vonos-shop-btn--sm">
                  Book fitment
                </Link>
              </div>
            </div>
            <div className="vonos-shop-promo-card vonos-shop-promo-card--dark">
              <div className="vonos-shop-promo-copy">
                <p className="vonos-shop-promo-eyebrow">VSP marketplace</p>
                <h3 className="vonos-shop-promo-title">Live stock, real prices</h3>
                <p className="vonos-shop-promo-text">
                  Every item syncs from Vonos SP — pay online and we deliver to your door.
                </p>
                <a href="#shop-catalog" className="vonos-shop-btn vonos-shop-btn--ghost vonos-shop-btn--sm">
                  View catalogue
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="shop-catalog" className="vonos-shop-section" aria-labelledby="shop-latest-heading">
        <div className="container-full">
          <div className="vonos-shop-latest-header">
            <div>
              <h2 id="shop-latest-heading" className="vonos-shop-section-title no-margin-bottom">
                {resultLabel}
              </h2>
              <p className="vonos-shop-catalog-meta">
                {catalogLoading
                  ? "Loading parts…"
                  : `${filteredProducts.length} match${filteredProducts.length === 1 ? "" : "es"} · page ${safePage + 1} of ${totalPages}${
                      catalogWarming ? " · loading more…" : ""
                    }`}
              </p>
            </div>
          </div>

          {error ? <p className="vonos-shop-error">{error}</p> : null}

          <div className="vonos-shop-latest-layout">
            <aside className="vonos-shop-filter-card" aria-label="Filter parts">
              <div className="vonos-shop-filter-card-head">
                <h3 className="vonos-shop-filter-card-title">Filters</h3>
                {filtersActive ? (
                  <button type="button" className="vonos-shop-filter-clear" onClick={clearFilters}>
                    Clear
                  </button>
                ) : null}
              </div>

              <label className="vonos-shop-search vonos-shop-search--sidebar">
                <Search className="vonos-shop-search-icon" aria-hidden size={16} />
                <span className="sr-only">Search parts</span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search parts"
                  autoComplete="off"
                />
              </label>

              <div className="vonos-shop-filter-block">
                <label className="vonos-shop-filter-label" htmlFor="shop-filter-category">
                  Category
                </label>
                <select
                  id="shop-filter-category"
                  className="vonos-shop-filter-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === "All" ? "All categories" : formatShopLabel(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vonos-shop-filter-block">
                <label className="vonos-shop-filter-label" htmlFor="shop-filter-sort">
                  Sort by
                </label>
                <select
                  id="shop-filter-sort"
                  className="vonos-shop-filter-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortValue)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vonos-shop-filter-block">
                <p className="vonos-shop-filter-label">Price (₦)</p>
                <div className="vonos-shop-filter-price-row">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="vonos-shop-filter-input"
                    placeholder="Min"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    aria-label="Minimum price"
                  />
                  <span className="vonos-shop-filter-price-sep" aria-hidden>
                    –
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="vonos-shop-filter-input"
                    placeholder="Max"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    aria-label="Maximum price"
                  />
                </div>
              </div>

              <label className="vonos-shop-filter-check">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                <span>In stock only</span>
              </label>
            </aside>

            <div className="vonos-shop-latest-main">
              {catalogLoading && catalog.length === 0 ? (
                <ShopProductGridSkeleton count={8} />
              ) : visibleProducts.length === 0 ? (
                <p className="vonos-shop-muted">
                  No parts found
                  {searchInput.trim() ? ` for “${searchInput.trim()}”` : ""}. Try another search
                  or category.
                </p>
              ) : (
                <div className="ve-product-grid ve-shop">
                  {visibleProducts.map((product) => (
                    <ShopProductCard key={product.id} product={product} onAdd={handleAdd} />
                  ))}
                </div>
              )}

              {!catalogLoading && (hasPrev || hasNext) ? (
                <nav className="vonos-shop-pagination" aria-label="Catalogue pages">
                  <button
                    type="button"
                    className="vonos-shop-page-btn"
                    disabled={!hasPrev}
                    onClick={goPrevPage}
                  >
                    <ChevronLeft size={18} aria-hidden />
                    Previous
                  </button>
                  <span className="vonos-shop-page-indicator">
                    Page {safePage + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="vonos-shop-page-btn"
                    disabled={!hasNext}
                    onClick={goNextPage}
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

      <section className="vonos-shop-trust" aria-label="Shop benefits">
        <div className="container-full">
          <ul className="vonos-shop-trust-grid">
            {TRUST_ITEMS.map((item) => (
              <li key={item.title} className="vonos-shop-trust-item">
                <span className="vonos-shop-trust-icon" aria-hidden>
                  {item.icon}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
