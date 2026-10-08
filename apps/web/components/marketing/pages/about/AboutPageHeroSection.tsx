import Link from "next/link";

import AboutHeroCarousel from "@/components/marketing/AboutHeroCarousel";
import { cdn } from "@/lib/cdn";
import { ABOUT_HERO_SLIDES } from "@/lib/marketing/vonos-photos";

const TICKER = [
  "12-month warranty",
  "Fixed-price quotes",
  "Genuine parts only",
  "Abuja · Kubwa",
  "All makes welcome",
  "Honest work",
] as const;

function MarqueeItem() {
  return (
    <div className="marquee-item">
      {TICKER.flatMap((label) => [
        <div key={`${label}-t`} className="text-sm-uppercase text-gray-3">
          {label}
        </div>,
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${label}-i`}
          src={cdn("/images/pages/about/6a741b15a66dd7f5c7dee251_ticker_sepsvg.svg")}
          loading="lazy"
          alt=""
          className="marquee-icon"
        />,
      ])}
    </div>
  );
}

export default function AboutPageHeroSection() {
  return (
    <section className="hero-section" data-qa-section="about-01-hero">
      <div className="container-full">
        <div className="hero-about-content">
          <div className="w-layout-grid grid-about-top">
            <div className="hero-about-caption">
              <div data-show="show" className="breadcrumb-item">
                <Link href="/" className="breadcrumb-link text-black">
                  Home
                </Link>
                <div className="breadcrumb-text text-gray-3">/</div>
                <div className="breadcrumb-text text-gray-3">About</div>
              </div>
              <h1 data-show="show" className="no-margin-bottom">
                Honest work. Since 2009.
              </h1>
            </div>
            <div className="hero-about-info">
              <p data-show="show" className="no-margin-bottom">
                From an MOT to a major engine job, we service and repair every make with
                dealer-level kits, genuine parts, and a fixed price quoted before any work starts.
              </p>
              <div data-show="show">
                <Link href="/contact" className="button-primary w-inline-block">
                  <div className="button-title">Book your car in</div>
                  <div className="button-hover-bg" />
                </Link>
              </div>
            </div>
          </div>
          <div className="hero-about-bottom">
            <AboutHeroCarousel images={ABOUT_HERO_SLIDES} />
            <div data-show="show" className="marquee-list">
              <MarqueeItem />
              <MarqueeItem />
              <MarqueeItem />
              <div className="marquee-overlay" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
