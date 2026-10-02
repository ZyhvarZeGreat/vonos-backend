export default function AcademyCta() {
  return (
    <section className="ac-section" data-qa-section="academy-cta">
      <div className="ac-container">
        <div className="ac-cta__grid">
          <div className="ac-cta-card ac-cta-card--ink">
            <span className="ac-cta-card__eyebrow">Programmes</span>
            <h2 className="ac-cta-card__title">
              Explore our
              <br />
              training courses
            </h2>
            <a href="#programmes" className="ac-btn">
              Browse courses
              <span className="ac-btn__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>

          <div className="ac-cta-card ac-cta-card--blue">
            <span className="ac-cta-card__eyebrow">Enquiries</span>
            <h2 className="ac-cta-card__title">
              We&rsquo;d love to
              <br />
              hear from you
            </h2>
            <a href="#enrol" className="ac-btn">
              Send an enquiry
              <span className="ac-btn__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
