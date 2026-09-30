import Link from "next/link";

import { ACADEMY_CONTACT } from "@/lib/marketing/academy-courses";

const scrollItem = { "scroll-item": "show" } as const;

export default function AcademyAbout() {
  return (
    <section data-scroll="load" className="section-spacing" data-qa-section="academy-about">
      <div className="container">
        <div className="w-layout-grid grid-story">
          <div className="story-left">
            <div className="story-content">
              <div {...scrollItem} className="story-heading">
                <div className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
                  About the institute
                </div>
                <h2 className="story-title">Built for people who want to work on cars properly.</h2>
              </div>
              <p {...scrollItem} className="no-margin-bottom">
                Vonos Academy sits alongside the Vonos workshop. Courses are for apprentices,
                career-changers, and technicians who want structured upskilling — not a parts
                catalogue or a walk-in service booking. Training is in Kubwa, Abuja (
                {ACADEMY_CONTACT.location}). Theory is short; bay time is long.
              </p>
              <div {...scrollItem}>
                <Link
                  href="/contact"
                  className="button-primary w-variant-66141dc8-12be-af3f-9039-776e66b77489 w-inline-block"
                >
                  <div className="button-title">Book the workshop</div>
                  <div className="button-hover-bg" />
                </Link>
              </div>
            </div>
            <div className="w-layout-grid grid-story-feature">
              <div {...scrollItem} className="story-feature-item">
                <div className="story-feature-badge">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    src="/images/pages/about/6a7437a66edcdf3e9d81fc4d_tag_1.svg"
                    alt=""
                    className="story-feature-icon"
                  />
                </div>
                <div className="story-feature-content">
                  <div className="text-black">Bay time with working technicians</div>
                </div>
              </div>
              <div {...scrollItem} className="story-feature-item">
                <div className="story-feature-badge">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    src="/images/pages/about/6a75b82c799955559326f271_loupe_3.svg"
                    alt=""
                    className="story-feature-icon"
                  />
                </div>
                <div className="story-feature-content">
                  <div className="text-black">Diagnostics without the dealership wait</div>
                </div>
              </div>
              <div>
                <div {...scrollItem} className="story-feature-item">
                  <div className="story-feature-badge">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      loading="lazy"
                      src="/images/pages/about/6a7437a62d38f1d4f9679d87_security_1.svg"
                      alt=""
                      className="story-feature-icon"
                    />
                  </div>
                  <div className="story-feature-content">
                    <div className="text-black">Certificate when you complete</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div {...scrollItem} className="story-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/vonos-photos/IMG_0491.jpg"
              loading="lazy"
              sizes="(max-width: 479px) 48vw, 49vw"
              alt=""
              className="story-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
