import { ACADEMY_COURSES } from "@/lib/marketing/academy-courses";

export default function AcademyCourses() {
  return (
    <section className="ac-section" id="programmes" data-qa-section="academy-courses">
      <div className="ac-container">
        <div className="ac-section-head">
          <div>
            <span className="ac-eyebrow">Programmes</span>
            <h2 className="ac-title">
              Most popular
              <br />
              training courses
            </h2>
          </div>
          <a href="#enrol" className="ac-btn ac-btn--ghost">
            Enquire about a course →
          </a>
        </div>

        <div className="ac-courses__grid">
          {ACADEMY_COURSES.map((course) => (
            <article key={course.id} className="ac-card ac-course">
              <div className="ac-course__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={course.image} alt={course.title} loading="lazy" />
                <span className="ac-course__level">{course.level}</span>
              </div>
              <div className="ac-course__body">
                <div className="ac-course__meta">
                  <span>{course.duration}</span>
                  <span>·</span>
                  <span>{course.level}</span>
                </div>
                <h3 className="ac-course__title">{course.title}</h3>
                <p className="ac-course__text">{course.summary}</p>
                <div className="ac-course__actions">
                  <a
                    href={`/academy?course=${course.id}#enrol`}
                    className="ac-btn ac-btn--primary"
                  >
                    Enquire now
                  </a>
                  <a href="#faqs" className="ac-btn ac-btn--ghost">
                    Details
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
