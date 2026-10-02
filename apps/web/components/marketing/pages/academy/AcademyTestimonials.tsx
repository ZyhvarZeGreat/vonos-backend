import { ACADEMY_TESTIMONIALS } from "@/lib/marketing/academy-courses";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AcademyTestimonials() {
  return (
    <section className="ac-section" data-qa-section="academy-testimonials">
      <div className="ac-container">
        <div className="ac-section-head ac-section-head--center">
          <div>
            <span className="ac-eyebrow">Student feedback</span>
            <h2 className="ac-title">What our students say</h2>
            <p className="ac-lead">
              Real outcomes from people who trained in the bay — programme by programme.
            </p>
          </div>
        </div>

        <div className="ac-quotes__grid">
          {ACADEMY_TESTIMONIALS.map((item) => (
            <figure key={item.name} className="ac-quote">
              <div className="ac-quote__mark" aria-hidden="true">
                &ldquo;
              </div>
              <blockquote className="ac-quote__text">{item.quote}</blockquote>
              <figcaption className="ac-quote__who">
                <span className="ac-quote__avatar" aria-hidden="true">
                  {initials(item.name)}
                </span>
                <span>
                  <span className="ac-quote__name">{item.name}</span>
                  <span className="ac-quote__detail">{item.detail}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
