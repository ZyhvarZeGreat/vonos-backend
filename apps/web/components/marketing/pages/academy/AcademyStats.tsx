import { ACADEMY_STATS } from "@/lib/marketing/academy-courses";

export default function AcademyStats() {
  return (
    <section className="ac-section ac-stats" data-qa-section="academy-stats">
      <div className="ac-container">
        <div className="ac-section-head ac-section-head--center">
          <div>
            <span className="ac-eyebrow">Why Vonos Academy</span>
            <h2 className="ac-title">What makes the academy different</h2>
          </div>
        </div>

        <div className="ac-stats__grid">
          {ACADEMY_STATS.map((stat) => (
            <div key={stat.label} className="ac-stat">
              <span className="ac-stat__value">{stat.value}</span>
              <span className="ac-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
