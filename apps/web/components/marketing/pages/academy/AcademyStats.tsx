import { ACADEMY_STATS } from "@/lib/marketing/academy-courses";

const scrollItem = { "scroll-item": "show" } as const;

export default function AcademyStats() {
  return (
    <section
      data-scroll="load"
      className="section-spacing-top"
      data-qa-section="academy-stats"
    >
      <div className="container">
        <div className="w-layout-grid grid-statistic-list">
          {ACADEMY_STATS.map((stat) => (
            <div
              key={stat.label}
              {...scrollItem}
              className="statistic-item w-variant-0dd1596a-333c-e3b0-a6fb-a3775f1298c2"
            >
              <h2 className="statistic-number w-variant-0dd1596a-333c-e3b0-a6fb-a3775f1298c2">
                {stat.value}
              </h2>
              <div className="statistic-divider w-variant-0dd1596a-333c-e3b0-a6fb-a3775f1298c2" />
              <div className="statistic-text w-variant-0dd1596a-333c-e3b0-a6fb-a3775f1298c2">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
