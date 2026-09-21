"use client";

import { Headset, PackageCheck, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import CatalogBrowser from "@/components/marketing/ecommerce/CatalogBrowser";
import ProductCard from "@/components/marketing/ecommerce/ProductCard";
import SectionHead from "@/components/marketing/ecommerce/SectionHead";
import { refreshMarketingScroll } from "@/components/marketing/MotocareMotion";
import { formatShopLabel, formatShopPrice, type ShopProduct } from "@/lib/marketing/shop-catalog";
import { fetchStoreCatalog } from "@/lib/marketing/store-api";
import { shopProductPath } from "@/lib/seo/site";

const CATALOG_PAGE_SIZE = 100;
const CATALOG_MAX_ITEMS = 2000;

/** Figma 59:175 — five browse tiles, each deep-links into the catalogue search. */
const BROWSE = [
  { title: "Interior Items", sub: "Save 15%", match: /interior|cabin|trim/i, query: "interior" },
  { title: "Brakes System", sub: "Get 10% off", match: /brake|pad|disc/i, query: "brake" },
  { title: "Body Parts", sub: "10% off only Today", match: /body|bumper|panel|mirror/i, query: "body" },
  { title: "Suspension & Steering", sub: "Sale 32% off", match: /suspension|shock|steer|arm/i, query: "suspension" },
  { title: "Electrical System", sub: "Save 25%", match: /electric|sensor|battery|plug/i, query: "electrical" },
] as const;

/** Figma 56:4 — service promises band. */
const TRUST = [
  { icon: PackageCheck, title: "Free Shipping", desc: "On workshop orders above ₦250,000" },
  { icon: Wallet, title: "Flexible Payment", desc: "Transfer, card, or on-collection" },
  { icon: Truck, title: "Fast Delivery", desc: "Same-day dispatch across Abuja" },
  { icon: Headset, title: "Premium Support", desc: "Parts advisors on WhatsApp daily" },
] as const;

const FALLBACK_IMAGE = "/images/services/service-01.webp";

function pickByCategory(catalog: ShopProduct[], match: RegExp): ShopProduct | undefined {
  return catalog.find((item) => match.test(`${item.category} ${item.name}`) && item.inStock !== false);
}

export default function ShopLanding() {
  const [catalog, setCatalog] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const first = await fetchStoreCatalog({ limit: CATALOG_PAGE_SIZE });
      let items = first.items;
      setCatalog(items);
      setCategories(first.categories);
      setLoading(false);

      // Warm the rest in the background so filters cover the whole catalogue.
      let cursor = first.nextCursor;
      if (!cursor) return;
      setWarming(true);
      while (cursor && items.length < CATALOG_MAX_ITEMS) {
        const next = await fetchStoreCatalog({ cursor, limit: CATALOG_PAGE_SIZE });
        if (next.items.length === 0) break;
        items = [...items, ...next.items];
        setCatalog(items);
        cursor = next.nextCursor;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn’t load the parts catalogue — please try again.",
      );
      setCatalog([]);
    } finally {
      setLoading(false);
      setWarming(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!loading) refreshMarketingScroll();
  }, [loading, catalog.length]);

  // Showcase rails only take priced, photographed, in-stock lines — service
  // rows (₦0, placeholder icon) stay in the catalogue grid below.
  const showcase = useMemo(() => {
    const sellable = catalog.filter((item) => item.inStock !== false && item.price > 0);
    const photographed = sellable.filter((item) => !item.icon.startsWith("/images/icons/"));
    return photographed.length >= 15 ? photographed : sellable;
  }, [catalog]);

  const featured = useMemo(() => showcase.slice(0, 5), [showcase]);
  const latest = useMemo(() => showcase.slice(5, 11), [showcase]);
  const promoTiles = useMemo(() => showcase.slice(11, 13), [showcase]);
  const spotlight = showcase[13] ?? showcase[0];
  const feature = showcase[14] ?? showcase[1];
  const moreProducts = useMemo(() => showcase.slice(15, 21), [showcase]);

  const browse = useMemo(
    () =>
      BROWSE.map((entry) => ({
        ...entry,
        image: pickByCategory(catalog, entry.match)?.icon ?? FALLBACK_IMAGE,
      })),
    [catalog],
  );

  return (
    <>
      <section className="vg-sec" data-node-id="59:170" data-qa-section="shop-categories">
        <div className="vg-container">
          <SectionHead title="Browse by Categories" viewAllHref="/shop#shop-catalog" />
          <div className="vg-cats">
            {browse.map((entry) => (
              <Link
                key={entry.title}
                href={`/shop?q=${encodeURIComponent(entry.query)}#shop-catalog`}
                className="vg-cat-card"
              >
                <div>
                  <p className="vg-cat-card__title">{entry.title}</p>
                  <p className="vg-cat-card__sub">{entry.sub}</p>
                </div>
                <span className="vg-cat-card__cta">Shop Now →</span>
                <div className="vg-cat-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.image} alt="" loading="lazy" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        className="vg-sec"
        id="shop-featured"
        data-node-id="74:314"
        data-qa-section="shop-featured"
      >
        <div className="vg-container">
          <SectionHead title="Featured Products" viewAllHref="/shop#shop-catalog" />
          {error ? (
            <div className="vg-error" role="alert">
              <p>{error}</p>
              <button type="button" className="vg-btn vg-btn--ghost" onClick={() => void loadCatalog()}>
                Try again
              </button>
            </div>
          ) : null}
          {loading ? (
            <ProductSkeletons count={5} />
          ) : (
            <div className="vg-products">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {feature ? (
        <section className="vg-sec" data-node-id="39:1563" data-qa-section="shop-promo">
          <div className="vg-container vg-promo">
            <div className="vg-promo__stack">
              {promoTiles.map((product, index) => (
                <Link
                  key={product.id}
                  href={shopProductPath(product.sku ?? product.id)}
                  className="vg-promo__tile"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.icon} alt="" loading="lazy" />
                  <div>
                    <p className="vg-promo__eyebrow">{index === 0 ? "Get 45% Off" : "New Product"}</p>
                    <p className="vg-promo__title">{formatShopLabel(product.name)}</p>
                  </div>
                  <span className="vg-promo__cta">Shop Now →</span>
                </Link>
              ))}
            </div>

            <Link href={shopProductPath(feature.sku ?? feature.id)} className="vg-promo__feature">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={feature.icon} alt="" loading="lazy" />
              <div className="vg-promo__feature-body">
                <p className="vg-promo__eyebrow">New Arrivals</p>
                <p className="vg-promo__feature-title">{formatShopLabel(feature.name)}</p>
                <p className="vg-promo__feature-desc">{feature.description}</p>
                <span className="vg-promo__price">Starting from {formatShopPrice(feature.price)}</span>
              </div>
              <span className="vg-promo__cta">Shop Now →</span>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="vg-sec" data-node-id="50:1793" data-qa-section="shop-latest">
        <div className="vg-container">
          <SectionHead title="Latest Products" viewAllHref="/shop#shop-catalog" />
          <div className="vg-latest">
            <div className="vg-latest__spot">
              <div className="vg-latest__spot-body">
                <p className="vg-latest__spot-eyebrow">Hello Mechanic</p>
                <p className="vg-latest__spot-title">
                  {spotlight ? formatShopLabel(spotlight.name) : "Workshop-grade parts"}
                </p>
                <p className="vg-latest__spot-desc">
                  {spotlight?.description ??
                    "Every part on this page is stocked in the Vonos warehouse and fitted by our own technicians."}
                </p>
              </div>
              <Link
                href={spotlight ? shopProductPath(spotlight.sku ?? spotlight.id) : "/shop#shop-catalog"}
                className="vg-textlink"
              >
                Shop Now →
              </Link>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero/hero-dashboard.webp" alt="" loading="lazy" />
            </div>

            {loading ? (
              <div className="vg-products vg-latest__grid">
                <ProductSkeletons count={6} bare />
              </div>
            ) : (
              <div className="vg-products vg-latest__grid">
                {latest.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="vg-sec vg-sec--tint vg-sec--tight" data-node-id="56:4" data-qa-section="shop-trust">
        <div className="vg-container vg-trust">
          {TRUST.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="vg-trust__item">
              <span className="vg-trust__icon">
                <Icon size={30} strokeWidth={1.2} aria-hidden />
              </span>
              <div>
                <p className="vg-trust__title">{title}</p>
                <p className="vg-trust__desc">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CatalogBrowser
        products={catalog}
        categories={categories}
        loading={loading}
        warming={warming}
        error={error}
      />

      {moreProducts.length > 0 ? (
        <section className="vg-sec" data-node-id="56:85" data-qa-section="shop-more-products">
          <div className="vg-container">
            <SectionHead title="More parts for you" viewAllHref="/shop#shop-catalog" />
            <div className="vg-products">
              {moreProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

function ProductSkeletons({ count, bare = false }: { count: number; bare?: boolean }) {
  const cards = Array.from({ length: count }, (_, index) => (
    <div key={index}>
      <div className="vg-skeleton vg-skeleton--card" />
      <div className="vg-skeleton vg-skeleton--line" />
      <div className="vg-skeleton vg-skeleton--line" />
    </div>
  ));

  return bare ? <>{cards}</> : <div className="vg-products">{cards}</div>;
}
