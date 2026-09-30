import { ACADEMY_WHO_FOR } from "@/lib/marketing/academy-courses";
import { WHO_FOR_IMAGE } from "@/lib/marketing/vonos-photos";

const scrollItem = { "scroll-item": "show" } as const;
const CHECK_ICON = "/images/pages/about/6a75710eaad25c81aca869a1_check-list-icon.svg";
const WHO_IMAGE = WHO_FOR_IMAGE;

export default function AcademyWhoFor() {
  return (
    <section
      data-scroll="load"
      className="section-spacing-bottom"
      data-qa-section="academy-who"
    >
      <div className="container">
        <div className="w-layout-grid grid-about">
          <div {...scrollItem} className="about-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={WHO_IMAGE}
              loading="lazy"
              sizes="(max-width: 479px) 48vw, 49vw"
              alt=""
              className="about-image"
            />
          </div>
          <div className="about-right">
            <div className="about-content">
              <div {...scrollItem} className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
                Who it’s for
              </div>
              <h2 {...scrollItem} className="no-margin-bottom">
                Built for people ready to work with their hands.
              </h2>
              <p {...scrollItem} className="no-margin-bottom">
                Vonos Academy isn’t a parts catalogue or a walk-in service desk. It’s structured
                training for people who want bay skills that transfer to a real workshop.
              </p>
            </div>
            <div {...scrollItem} className="about-feature-list">
              {ACADEMY_WHO_FOR.map((item) => (
                <div key={item} className="list-item">
                  <div className="list-icon-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" src={CHECK_ICON} alt="" className="list-icon" />
                  </div>
                  <div className="list-title w-variant-82b56992-5294-3eef-c465-a7178ad9b7df">
                    {item}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
