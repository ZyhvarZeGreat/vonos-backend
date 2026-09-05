import Image from "next/image";
import Link from "next/link";

export default function FooterCtaScrollExpand() {
  return (
    <div className="footer-cta section-spacing-top vonos-footer-cta-band">
      <div className="footer-cta-item vonos-footer-cta-media">
        <Image
          src="/images/contact/footer-cta-bg.webp"
          alt="Vonos workshop"
          fill
          className="footer-cta-image"
          sizes="100vw"
          priority={false}
        />
        <div className="footer-cta-overlay" aria-hidden="true" />
      </div>
      <div className="footer-cta-content vonos-footer-cta-content">
        <div className="footer-cta-info">
          <div className="text-sm-uppercase">Ready when you are</div>
          <h2 className="footer-cta-title">Book your car in today.</h2>
        </div>
        <div className="footer-cta-btn">
          <Link
            href="/contact"
            className="button-primary w-variant-a364a7e4-709c-fd40-1d74-83c477702af1 w-inline-block"
          >
            <div className="button-title w-variant-a364a7e4-709c-fd40-1d74-83c477702af1">
              Book your car in
            </div>
            <div className="button-hover-bg" />
          </Link>
          <a href="tel:+12025550147" className="button-primary w-inline-block">
            <div className="button-title">Call&nbsp;&nbsp;+1 202 555 0147</div>
            <div className="button-hover-bg" />
          </a>
        </div>
      </div>
    </div>
  );
}
