import { ACADEMY_INSTRUCTORS } from "@/lib/marketing/academy-courses";

const scrollItem = { "scroll-item": "show" } as const;

export default function AcademyInstructors() {
  return (
    <section
      data-scroll="load"
      className="section-spacing-bottom"
      data-qa-section="academy-instructors"
    >
      <div className="container">
        <div className="section-title">
          <div className="team-caption">
            <div {...scrollItem}>
              <div className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
                Meet the trainers
              </div>
            </div>
            <h2 {...scrollItem} className="no-margin-bottom">
              Taught by people who still turn wrenches.
            </h2>
            <p {...scrollItem} className="team-description">
              Instructors are working Vonos technicians — not visiting lecturers. You learn on the
              same floor where cars get fixed.
            </p>
          </div>
        </div>
        <div className="w-layout-grid grid-team">
          {ACADEMY_INSTRUCTORS.map((person) => (
            <div key={person.name} {...scrollItem} className="team-card">
              <div className="team-image-holder">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  loading="lazy"
                  src={person.image}
                  alt=""
                  sizes="100vw"
                  className="team-image"
                />
              </div>
              <div className="team-content">
                <h3 className="heading-h5 no-margin-bottom">{person.name}</h3>
                <div>{person.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
