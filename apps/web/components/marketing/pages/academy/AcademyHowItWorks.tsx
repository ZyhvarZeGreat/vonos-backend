import { ACADEMY_STEPS } from "@/lib/marketing/academy-courses";

const scrollItem = { "scroll-item": "show" } as const;

export default function AcademyHowItWorks() {
  return (
    <section data-scroll="load" className="section-spacing-bottom" data-qa-section="academy-how">
      <div className="step-info">
        <div className="container">
          <div className="step-detail">
            <div className="step-caption">
              <div {...scrollItem}>
                <div className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
                  How it works
                </div>
              </div>
              <h2 {...scrollItem} className="step-title">
                From enquiry to certificate.
              </h2>
            </div>
            <div className="w-layout-grid grid-step-list">
              {ACADEMY_STEPS.map((step, index) => (
                <div key={step.title} {...scrollItem}>
                  <div className="step-item w-variant-5b6942ad-bdd1-213a-7e52-ab3f0f9d119c">
                    <div className="step-number-badge">
                      <div className="step-number-round w-variant-5b6942ad-bdd1-213a-7e52-ab3f0f9d119c">
                        <div className="step-number">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                      </div>
                    </div>
                    <div className="step-content w-variant-5b6942ad-bdd1-213a-7e52-ab3f0f9d119c">
                      <h3 className="heading-h5 no-margin-bottom">{step.title}</h3>
                      <div>{step.body}</div>
                    </div>
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
