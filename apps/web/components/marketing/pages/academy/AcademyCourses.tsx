import { Fragment } from "react";

import { ACADEMY_COURSES } from "@/lib/marketing/academy-courses";

const scrollItem = { "scroll-item": "show" } as const;

export default function AcademyCourses() {
  return (
    <section
      data-scroll="load"
      className="section-spacing-bottom"
      data-qa-section="academy-courses"
    >
      <div className="container-medium">
        <div className="section-title">
          <div {...scrollItem} className="why-choose-caption">
            <div className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
              Programmes
            </div>
            <h2 className="heading-h4 no-margin-bottom">
              Structured courses with real workshop hours — not videos alone.
            </h2>
          </div>
        </div>
        <div className="w-layout-grid grid-why-choose">
          {ACADEMY_COURSES.map((course, index) => {
            const card = (
              <div {...scrollItem} className="why-choose-item">
                <div className="why-choose-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img loading="lazy" src={course.icon} alt="" className="why-choose-icon" />
                </div>
                <div className="why-choose-content">
                  <div className="text-sm-uppercase text-gray-3">
                    {course.level} · {course.duration}
                  </div>
                  <div className="why-choose-title">{course.title}</div>
                  <p className="why-choose-description">{course.summary}</p>
                  <a
                    href={`/academy?course=${course.id}#enrol`}
                    className="breadcrumb-link text-black"
                  >
                    Enquire about this course →
                  </a>
                </div>
              </div>
            );

            // Motocare wraps only the last column in an extra div.
            if (index === ACADEMY_COURSES.length - 1) {
              return <div key={course.id}>{card}</div>;
            }
            return <Fragment key={course.id}>{card}</Fragment>;
          })}
        </div>
      </div>
    </section>
  );
}
