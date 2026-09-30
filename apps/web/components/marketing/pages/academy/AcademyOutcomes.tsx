import { Fragment } from "react";

import { ACADEMY_OUTCOMES } from "@/lib/marketing/academy-courses";

const scrollItem = { "scroll-item": "show" } as const;

export default function AcademyOutcomes() {
  return (
    <section
      data-scroll="load"
      className="section-spacing-bottom"
      data-qa-section="academy-outcomes"
    >
      <div className="container-medium">
        <div className="section-title">
          <div {...scrollItem} className="why-choose-caption">
            <div className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
              What you leave with
            </div>
            <h2 className="heading-h4 no-margin-bottom">
              Skills you can use on day one — plus a certificate to prove it.
            </h2>
          </div>
        </div>
        <div className="w-layout-grid grid-why-choose">
          {ACADEMY_OUTCOMES.map((outcome, index) => {
            const card = (
              <div {...scrollItem} className="why-choose-item">
                <div className="why-choose-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={outcome.icon} alt="" className="why-choose-icon" />
                </div>
                <div className="why-choose-content">
                  <div className="why-choose-title">{outcome.title}</div>
                  <p className="why-choose-description">{outcome.body}</p>
                </div>
              </div>
            );
            if (index === ACADEMY_OUTCOMES.length - 1) {
              return <div key={outcome.title}>{card}</div>;
            }
            return <Fragment key={outcome.title}>{card}</Fragment>;
          })}
        </div>
      </div>
    </section>
  );
}
