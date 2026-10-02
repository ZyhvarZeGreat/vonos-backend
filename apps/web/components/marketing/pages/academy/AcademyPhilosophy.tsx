import {
  ACADEMY_OUTCOMES,
  ACADEMY_WHO_FOR,
} from "@/lib/marketing/academy-courses";

export default function AcademyPhilosophy() {
  return (
    <section className="ac-section ac-philosophy" data-qa-section="academy-philosophy">
      <div className="ac-container">
        <span className="ac-eyebrow">Philosophy</span>
        <h2 className="ac-philosophy__statement">
          Built for people who want to work on cars properly.
        </h2>
        <p className="ac-philosophy__text">
          Vonos Academy sits on the same floor as the Vonos workshop. Theory is short, bay time is
          long, and every session is supervised by technicians who still turn wrenches — so what you
          learn on Tuesday works on a customer car on Wednesday.
        </p>

        <div className="ac-whofor">
          {ACADEMY_WHO_FOR.map((item) => (
            <span key={item} className="ac-whofor__chip">
              {item}
            </span>
          ))}
        </div>

        <div className="ac-features">
          {ACADEMY_OUTCOMES.map((outcome) => (
            <div key={outcome.title} className="ac-feature">
              <div className="ac-feature__icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={outcome.icon} alt="" />
              </div>
              <h3 className="ac-feature__title">{outcome.title}</h3>
              <p className="ac-feature__body">{outcome.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
