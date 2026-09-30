import { ACADEMY_CONTACT, ACADEMY_FAQS } from "@/lib/marketing/academy-courses";

const scrollItem = { "scroll-item": "show" } as const;

export default function AcademyFaq() {
  return (
    <section
      data-scroll="load"
      className="section-spacing-bottom"
      data-qa-section="academy-faq"
    >
      <div className="container">
        <div className="w-layout-grid grid-faqs-content">
          <div className="faqs-left">
            <div {...scrollItem} className="faqs-caption">
              <div className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
                Frequently Asked Questions
              </div>
              <h2 className="no-margin-bottom">Questions about Academy?</h2>
            </div>
            <div {...scrollItem} className="faqs-cta">
              <div className="faqs-cta-info">
                <h3 className="faqs-cta-title">Still unsure?</h3>
                <p className="no-margin-bottom">
                  Call or WhatsApp before you enrol — we’ll help you pick the right programme.
                </p>
              </div>
              <div className="faqs-cta-button">
                <a
                  href={`tel:${ACADEMY_CONTACT.phoneTel}`}
                  className="button-primary w-variant-66141dc8-12be-af3f-9039-776e66b77489 w-inline-block"
                >
                  <div className="button-title">
                    Talk to us&nbsp;&nbsp;{ACADEMY_CONTACT.phoneDisplay}
                  </div>
                  <div className="button-hover-bg" />
                </a>
              </div>
            </div>
          </div>
          <div {...scrollItem} className="faqs-right">
            {ACADEMY_FAQS.map((faq, index) => (
              <div
                key={faq.q}
                className={index === 0 ? "accordion-active-item" : "accordion-item"}
              >
                <div className="accordion-heading">
                  <h3 className="accordion-title">{faq.q}</h3>
                  <div className="accordion-icon-wrap">
                    <div className="accordion-divider-hr" />
                    <div className="accordion-divider-vr" />
                  </div>
                </div>
                <div className="accordion-content">
                  <p className="accordion-description">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
