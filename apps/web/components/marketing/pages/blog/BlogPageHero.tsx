import Link from "next/link";

export default function BlogPageHero() {
  return (
    <section className="hero-section vonos-blog-hero">
      <div className="container-full">
        <div className="hero-about-content">
          <div className="w-layout-grid grid-about-top">
            <div className="hero-about-caption">
              <div data-show="show" className="breadcrumb-item">
                <Link href="/" className="breadcrumb-link text-black">
                  Home
                </Link>
                <div className="breadcrumb-text text-gray-3">/</div>
                <div className="breadcrumb-text text-gray-3">Blog</div>
              </div>
              <h1 data-show="show" className="no-margin-bottom">
                Workshop notes &amp; driver guides.
              </h1>
            </div>
            <div className="hero-about-info">
              <p data-show="show" className="no-margin-bottom">
                Practical advice from the Vonos team — maintenance tips, seasonal
                checks, and straight answers to the questions customers ask us
                every week.
              </p>
              <div data-show="show">
                <Link href="/contact" className="button-primary w-inline-block">
                  <div className="button-title">Book your car in</div>
                  <div className="button-hover-bg" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
