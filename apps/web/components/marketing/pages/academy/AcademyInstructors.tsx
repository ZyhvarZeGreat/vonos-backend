import { ACADEMY_INSTRUCTORS } from "@/lib/marketing/academy-courses";

export default function AcademyInstructors() {
  return (
    <section className="ac-section" data-qa-section="academy-instructors">
      <div className="ac-container">
        <div className="ac-section-head">
          <div>
            <span className="ac-eyebrow">Trainers</span>
            <h2 className="ac-title">Taught by people who still turn wrenches.</h2>
            <p className="ac-lead">
              Instructors are working Vonos technicians — not visiting lecturers. You learn on the
              same floor where customer cars get fixed.
            </p>
          </div>
        </div>

        <div className="ac-team__grid">
          {ACADEMY_INSTRUCTORS.map((person) => (
            <article key={person.name} className="ac-card ac-member">
              <div className="ac-member__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={person.image} alt={person.name} loading="lazy" />
              </div>
              <div className="ac-member__body">
                <h3 className="ac-member__name">{person.name}</h3>
                <p className="ac-member__role">{person.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
