import Link from "next/link";

import AboutHeroCarousel from "@/components/marketing/AboutHeroCarousel";
import { ACADEMY_TICKER } from "@/lib/marketing/academy-courses";
import { ACADEMY_HERO_SLIDES } from "@/lib/marketing/vonos-photos";

function MarqueeItem() {
  return (
    <div className="marquee-item">
      {ACADEMY_TICKER.flatMap((label) => [
        <div key={`${label}-t`} className="text-sm-uppercase text-gray-3">
          {label}
        </div>,
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${label}-i`}
          src="/images/pages/about/6a741b15a66dd7f5c7dee251_ticker_sepsvg.svg"
          loading="lazy"
          alt=""
          className="marquee-icon"
        />,
      ])}
    </div>
  );
}

export default function AcademyHero() {
  return (
    <section className="hero-section" data-qa-section="academy-hero">
      <div className="container-full">
        <div className="hero-about-content">
          <div className="w-layout-grid grid-about-top">
            <div className="hero-about-caption">
              <div data-show="show" className="breadcrumb-item">
                <Link href="/" className="breadcrumb-link text-black">
                  Home
                </Link>
                <div className="breadcrumb-text text-gray-3">/</div>
                <div className="breadcrumb-text text-gray-3">Academy</div>
              </div>
              <h1 data-show="show" className="no-margin-bottom">
                Train where the cars actually get fixed.
              </h1>
            </div>
            <div className="hero-about-info">
              <p data-show="show" className="no-margin-bottom">
                Vonos Academy — practical automotive programmes in Abuja. Manufacturer-minded
                skills, supervised bay time, and a clear path from apprentice to technician.
              </p>
              <div data-show="show">
                <a href="#enrol" className="button-primary w-inline-block">
                  <div className="button-title">Enquire to enrol</div>
                  <div className="button-hover-bg" />
                </a>
              </div>
            </div>
          </div>
          <div className="hero-about-bottom">
            <AboutHeroCarousel images={ACADEMY_HERO_SLIDES} />
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
