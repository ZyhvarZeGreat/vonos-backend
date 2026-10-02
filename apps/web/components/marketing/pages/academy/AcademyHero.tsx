import Link from "next/link";

import { ACADEMY_CONTACT } from "@/lib/marketing/academy-courses";
import { ACADEMY_HERO_SLIDES } from "@/lib/marketing/vonos-photos";

const FACTS = [
  { value: "3", label: "core programmes" },
  { value: "80%", label: "of time in the bay" },
  { value: "1:6", label: "trainer to trainee" },
] as const;

export default function AcademyHero() {
  const [wide, tall, detail] = ACADEMY_HERO_SLIDES;

  return (
    <section className="ac-hero" id="academy" data-qa-section="academy-hero">
      <div className="ac-container">
        <div className="ac-hero__grid">
          <div>
            <span className="ac-hero__kicker">Vonos Academy · Kubwa, Abuja</span>
            <h1 className="ac-hero__title">
              Train where the cars <em>actually get fixed.</em>
            </h1>
            <p className="ac-hero__text">
              Practical automotive programmes for apprentices, career-changers, and technicians.
              Manufacturer-minded skills, supervised bay time, and a clear path from apprentice to
              technician — right beside the working Vonos workshop.
            </p>
            <div className="ac-hero__actions">
              <a href="#enrol" className="ac-btn ac-btn--primary">
                Enquire to enrol
                <span className="ac-btn__arrow" aria-hidden="true">
                  →
                </span>
              </a>
              <a href="#programmes" className="ac-btn ac-btn--ghost">
                View programmes
              </a>
            </div>
            <div className="ac-hero__facts">
              {FACTS.map((fact) => (
                <div key={fact.label}>
                  <strong>{fact.value}</strong>
                  {fact.label}
                </div>
              ))}
              <div>
                <strong>{ACADEMY_CONTACT.phoneDisplay}</strong>
                call or WhatsApp
              </div>
            </div>
          </div>

          <div className="ac-hero__collage">
            <div className="ac-hero__frame ac-hero__frame--tall">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tall} alt="Trainee working under a vehicle on the ramp" />
              <span className="ac-hero__tag">Supervised bay time</span>
            </div>
            <div className="ac-hero__frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={wide} alt="Vonos workshop floor" />
              <span className="ac-hero__tag">Live workshop</span>
            </div>
            <div className="ac-hero__frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail} alt="Diagnostics training on a customer vehicle" />
              <span className="ac-hero__tag">Certificate on completion</span>
            </div>
          </div>
        </div>

        <p style={{ margin: "1.5rem 0 0" }}>
          <Link href="/contact" className="ac-btn ac-btn--ghost">
            Visit the training site →
          </Link>
        </p>
      </div>
    </section>
  );
}
