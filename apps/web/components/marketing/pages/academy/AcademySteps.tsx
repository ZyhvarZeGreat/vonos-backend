import { ACADEMY_STEPS } from "@/lib/marketing/academy-courses";

export default function AcademySteps() {
  return (
    <section className="ac-section" data-qa-section="academy-steps">
      <div className="ac-container">
        <div className="ac-steps__panel">
          <div className="ac-section-head ac-section-head--center">
            <div>
              <span className="ac-eyebrow">How it works</span>
              <h2 className="ac-title">
                Step-by-step
                <br />
                to certification
              </h2>
              <p className="ac-lead">
                From first enquiry to certificate — here is exactly how a programme runs.
              </p>
            </div>
          </div>

          <div className="ac-steps__grid">
            {ACADEMY_STEPS.map((step, index) => (
              <div key={step.title} className="ac-step">
                <div className="ac-step__num">{String(index + 1).padStart(2, "0")}</div>
                <h3 className="ac-step__title">{step.title}</h3>
                <p className="ac-step__body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
