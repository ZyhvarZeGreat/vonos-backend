import Link from "next/link";

/** Diagnosis-first pricing — no published price list on the homepage. */
export default function PricingSection() {
  return (
    <section
      data-scroll="load"
      className="section-spacing-bottom vonos-diagnosis-section"
      data-qa-section="10-pricing"
    >
      <div className="container-medium">
        <div className="vonos-diagnosis-panel" data-reveal="">
          <div className="vonos-diagnosis-copy">
            <div className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
              Transparent pricing
            </div>
            <h2 className="no-margin-bottom">Pricing confirmed on diagnosis.</h2>
            <p className="vonos-diagnosis-lead no-margin-bottom">
              We inspect your vehicle first, then give you a clear quote before any repair work
              starts. No surprise bills — you approve every line item.
            </p>
          </div>
          <div className="vonos-diagnosis-actions">
            <Link href="/contact" className="button-primary w-inline-block">
              <div className="button-title">Book a diagnosis</div>
              <div className="button-hover-bg" />
            </Link>
            <Link href="/shop" className="shop-continue-link shop-continue-link--dark">
              Browse parts in the shop
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
