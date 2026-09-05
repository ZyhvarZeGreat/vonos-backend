import Link from "next/link";

const SHOP_HERO_IMAGE = "/images/hero/hero.webp";

const STATS = [
  { value: "500+", label: "Parts in stock" },
  { value: "VSP", label: "Live marketplace" },
  { value: "Paystack", label: "Secure checkout" },
  { value: "Abuja", label: "Workshop fitment" },
] as const;

export default function ShopPageHero() {
  return (
    <section className="vonos-shop-hero" data-qa-section="shop-00-hero">
      <div className="container-full">
        <div className="vonos-shop-hero-inner">
          <div className="vonos-shop-hero-copy">
            <p className="vonos-shop-hero-eyebrow">Vonos Parts · VSP</p>
            <h1 className="vonos-shop-hero-title">Genuine parts. Workshop ready.</h1>
            <p className="vonos-shop-hero-lead">
              Brake kits, filters, fluids and batteries — the same OE-spec stock our technicians
              fit every day. Order online, pay with Paystack, and get parts delivered — or book
              fitment at Vonos Plaza.
            </p>
            <div className="vonos-shop-hero-actions">
              <a href="#shop-catalog" className="vonos-shop-btn vonos-shop-btn--primary">
                Shop now
              </a>
              <Link href="/services" className="vonos-shop-btn vonos-shop-btn--ghost">
                Our services
              </Link>
            </div>
          </div>

          <div className="vonos-shop-hero-bg" aria-hidden>
            <img
              src={SHOP_HERO_IMAGE}
              alt=""
              className="vonos-shop-hero-bg-image"
              fetchPriority="high"
            />
            <div className="vonos-shop-hero-bg-shade" />
          </div>

          <ul className="vonos-shop-hero-stats">
            {STATS.map((stat) => (
              <li key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
