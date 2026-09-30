import HeroBgCarousel from "@/components/marketing/HeroBgCarousel";
import { HOME_HERO_SLIDES } from "@/lib/marketing/vonos-photos";

export default function HeroSection() {
  return (
    <section id="home" className="none" data-qa-section="01-hero">
      <div className="container-full">
        <div className="hero-detail">
          <div className="hero-content">
            <div className="hero-left">
              <div data-show="show">
                <div className="pre-title">Independent auto workshop — Est. 2009</div>
              </div>
              <h1 data-show="show" className="text-white no-margin-bottom">
                Honest repairs. Every make
              </h1>
            </div>
            <div data-show="show" className="hero-right">
              <div className="hero-contact-info w-form">
                <h2 className="heading-h5 no-margin-bottom">Reserve your service appointment</h2>
                <form
                  id="Contact-Form"
                  name="wf-form-Contact-Form"
                  method="get"
                  action="/contact"
                  className="hero-contact-form"
                  aria-label="Contact Form"
                >
                  <div className="label">
                    <label htmlFor="name" className="field-title">
                      Full name*
                    </label>
                    <input
                      className="form-input no-margin-bottom w-input"
                      maxLength={256}
                      name="name"
                      placeholder="Enter your full name"
                      type="text"
                      id="name"
                      required
                    />
                  </div>
                  <div className="label">
                    <label htmlFor="email" className="field-title">
                      Email address*
                    </label>
                    <input
                      className="form-input no-margin-bottom w-input"
                      maxLength={256}
                      name="email"
                      placeholder="info@vonos.com"
                      type="email"
                      id="email"
                      required
                    />
                  </div>
                  <div className="label">
                    <label htmlFor="Phone-Number" className="field-title">
                      Phone number*
                    </label>
                    <input
                      className="form-input no-margin-bottom w-input"
                      maxLength={256}
                      name="Phone-Number"
                      placeholder="Your phone number"
                      type="tel"
                      id="Phone-Number"
                      required
                    />
                  </div>
                  <div className="label">
                    <label htmlFor="Location" className="field-title">
                      Location
                    </label>
                    <select id="Location" name="Location" className="form-select contact-select w-select">
                      <option value="Select…">Select…</option>
                      <option value="Servicing & MOT">Servicing &amp; MOT</option>
                      <option value="Brakes & Suspension">Brakes &amp; Suspension</option>
                      <option value="Tires & Alignment">Tires &amp; Alignment</option>
                      <option value="Diagnostics & Electrical">Diagnostics &amp; Electrical</option>
                    </select>
                  </div>
                  <input
                    type="submit"
                    className="button-primary contact-button w-button"
                    value="Book appointment"
                  />
                </form>
              </div>
            </div>
          </div>
          <HeroBgCarousel images={HOME_HERO_SLIDES} />
        </div>
      </div>
    </section>
  );
}
