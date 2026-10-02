import { ACADEMY_SHOWCASE_PHOTO } from "@/lib/marketing/vonos-photos";

export default function AcademyShowcase() {
  return (
    <section className="ac-section" data-qa-section="academy-showcase">
      <div className="ac-container">
        <div className="ac-showcase">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ACADEMY_SHOWCASE_PHOTO} alt="Training bay at the Vonos workshop" />
          <p className="ac-showcase__caption">
            Training happens on live vehicles in Kubwa — the same bays, tools, and standards the
            Vonos workshop runs on every day.
          </p>
        </div>
      </div>
    </section>
  );
}
