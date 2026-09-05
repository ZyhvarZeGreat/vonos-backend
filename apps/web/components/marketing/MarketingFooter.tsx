import Image from "next/image";
import Link from "next/link";

import FooterCtaScrollExpand from "@/components/marketing/FooterCtaScrollExpand";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
] as const;

const MARQUEE_SEGMENTS = ["Vonos", "-", "Vonos", "-", "Vonos", "-"] as const;
const scrollItem = { "scroll-item": "" } as const;

function FooterMarqueeItem() {
  return (
    <div className="marquee-item footer-marquee" aria-hidden="true">
      {MARQUEE_SEGMENTS.map((segment, index) => (
        <div key={`${segment}-${index}`} className="marquee-text">
          {segment}
        </div>
      ))}
    </div>
  );
}

function FooterMarquee() {
  return (
    <div className="footer-center">
      <div className="footer-marquee-list" aria-label="Vonos">
        <FooterMarqueeItem />
        <FooterMarqueeItem />
        <FooterMarqueeItem />
      </div>
    </div>
  );
}

type MarketingFooterProps = {
  id?: string;
  qa?: string;
  showCta?: boolean;
};

export default function MarketingFooter({
  id,
  qa = "99-footer",
  showCta = true,
}: MarketingFooterProps) {
  return (
    <footer id={id} data-scroll="load" className="footer" data-qa-section={qa}>
      <div className="container-full vonos-footer-outer">
        {showCta ? <FooterCtaScrollExpand /> : null}

        <div className="vonos-footer-blue-band vonos-footer-bleed">
          <div className="footer-info">
            <div className="vonos-inner-shell footer-info-inner">
              <div className="w-layout-grid grid-footer-top">
                <div {...scrollItem} className="footer-brand-detail">
                  <div className="footer-brand-item">
                    <Link href="/" className="footer-logo-link w-inline-block">
                      <Image
                        src="/brand/vonos-autos-logo.png"
                        alt="Vonos Logo"
                        width={160}
                        height={40}
                        className="footer-logo"
                        priority
                      />
                    </Link>
                    <div className="footer-brand-text">
                      Get service reminders and seasonal check-ups. No spam, just the stuff
                      that keeps your car healthy.
                    </div>
                  </div>
                </div>
                <div className="w-layout-grid grid-footer-menu">
                  <div className="w-layout-grid grid-menu-item">
                    <div {...scrollItem} className="footer-menu">
                      <div className="text-sm-uppercase">Pages links</div>
                      <div className="footer-links">
                        {FOOTER_LINKS.map((link) => (
                          <Link key={link.href} href={link.href} className="footer-link">
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div {...scrollItem} className="footer-contact-info">
                    <div className="text-sm-uppercase">Visit</div>
                    <div className="footer-contact-list">
                      <a
                        href="https://www.google.com/maps/search/?api=1&query=Vonos+Plaza+Military+Roundabout+Kubwa+Abuja"
                        target="_blank"
                        rel="noreferrer"
                        className="footer-contact-link"
                      >
                        Vonos Plaza, Military Roundabout, Kubwa (F01)
                      </a>
                      <div className="text-white">
                        Mon to Fri 8 am–6 pm&nbsp;&nbsp;&amp;&nbsp;&nbsp;Sat 9 am–1 pm
                      </div>
                      <a href="tel:+12025550147" className="footer-contact-link">
                        +1 202 555 0147
                      </a>
                    </div>
                    <div className="footer-social-detail">
                      <div className="text-sm-uppercase">Social</div>
                      <div className="footer-social-list">
                        <a
                          href="https://www.facebook.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="footer-social-link w-inline-block"
                        >
                          <Image
                            src="/images/icons/facebook.svg"
                            alt="Facebook"
                            width={24}
                            height={24}
                            className="footer-social-icon"
                          />
                        </a>
                        <a
                          href="https://www.x.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="footer-social-link w-inline-block"
                        >
                          <Image
                            src="/images/icons/twitter.svg"
                            alt="X"
                            width={24}
                            height={24}
                            className="footer-social-icon"
                          />
                        </a>
                        <a
                          href="https://www.instagram.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="footer-social-link w-inline-block"
                        >
                          <Image
                            src="/images/icons/instagram.svg"
                            alt="Instagram"
                            width={24}
                            height={24}
                            className="footer-social-icon"
                          />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <FooterMarquee />

          <div {...scrollItem} className="footer-bottom vonos-inner-shell">
            <p className="footer-copyright">© 2026 Vonos. All rights reserved.</p>
            <p className="footer-copyright right">
              Designed by{" "}
              <a
                href="https://webestica.com/"
                target="_blank"
                rel="noreferrer"
                className="footer-copyright-link"
              >
                Webestica
              </a>
              , Powered by{" "}
              <a
                href="https://webflow.com/"
                target="_blank"
                rel="noreferrer"
                className="footer-copyright-link"
              >
                Webflow
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
