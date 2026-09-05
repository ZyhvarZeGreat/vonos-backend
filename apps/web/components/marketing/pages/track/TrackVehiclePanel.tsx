"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  lookupVehicleTrack,
  type PublicTrackResult,
} from "@/lib/marketing/track-api";

export default function TrackVehiclePanel() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [result, setResult] = useState<PublicTrackResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reg = searchParams.get("reg");
    const customer = searchParams.get("name");
    if (reg) setRegistration(reg);
    if (customer) setName(customer);
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    const customerName = name.trim();
    const plate = registration.trim();

    if (!customerName || !plate) {
      setError("Enter your name and registration plate.");
      return;
    }

    if (plate.replace(/\s+/g, "").length < 3) {
      setError("Enter a valid registration plate.");
      return;
    }

    setLoading(true);
    try {
      const track = await lookupVehicleTrack({
        name: customerName,
        registration: plate,
      });
      setResult(track);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setName("");
    setRegistration("");
    setResult(null);
    setError("");
  }

  return (
    <section className="hero-section track-section" data-qa-section="track-hero">
      <div className="container">
        <div className="hero-contact-detail">
          <div className="hero-contact-caption">
            <div className="breadcrumb-item">
              <Link href="/" className="breadcrumb-link text-black">
                Home
              </Link>
              <div className="breadcrumb-text text-black">/</div>
              <div className="breadcrumb-text text-gray-3">Track my vehicle</div>
            </div>
            <h1 className="no-margin-bottom">Track my vehicle</h1>
            <p className="hero-contact-description">
              Enter your name and registration plate to see live repair status across
              Vonos Mechanic and Vonos Painting — no costs or quotes shown here.
            </p>
          </div>

          <div className="w-layout-grid grid-hero-contact">
            <div className="hero-contact-left track-panel">
              {!result ? (
                <>
                  <div className="text-sm-uppercase text-gray-3">Look up a job</div>
                  <h2 className="heading-h4 no-margin-bottom">Find your repair status</h2>

                  <form className="contact-form track-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
                    <div className="w-layout-grid grid-contact-input">
                      <div className="contact-label">
                        <label htmlFor="track-name" className="field-title">
                          Full name*
                        </label>
                        <input
                          id="track-name"
                          className="form-input contact-input w-input"
                          name="name"
                          placeholder="e.g. Ada Okafor"
                          type="text"
                          autoComplete="name"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                        />
                      </div>
                      <div className="contact-label">
                        <label htmlFor="track-registration" className="field-title">
                          Registration plate*
                        </label>
                        <input
                          id="track-registration"
                          className="form-input contact-input w-input"
                          name="registration"
                          placeholder="e.g. ABC-123-XY"
                          type="text"
                          autoComplete="off"
                          value={registration}
                          onChange={(event) => setRegistration(event.target.value)}
                        />
                      </div>
                    </div>

                    {error ? <p className="track-form-error">{error}</p> : null}

                    <div className="contact-cta">
                      <button
                        type="submit"
                        className="button-primary contact-button w-button"
                        disabled={loading}
                      >
                        {loading ? "Looking up…" : "Track my car"}
                      </button>
                      <div className="contact-cta-text">
                        Use the name on the booking and the plate on your vehicle — no booking
                        reference needed.
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                <div className="track-result">
                  <div className="track-result-header">
                    <div>
                      <div className="text-sm-uppercase text-gray-3">Live status</div>
                      <h2 className="heading-h4 no-margin-bottom">{result.registration}</h2>
                      <p className="track-result-meta no-margin-bottom">
                        {result.name} · {result.vehicle}
                      </p>
                    </div>
                    <button type="button" className="track-reset-link" onClick={handleReset}>
                      Look up another
                    </button>
                  </div>

                  <div className="track-summary-grid">
                    <div className="track-summary-card">
                      <div className="track-summary-label">Service</div>
                      <div className="track-summary-value">{result.service}</div>
                    </div>
                    <div className="track-summary-card">
                      <div className="track-summary-label">Where your car is</div>
                      <div className="track-summary-value">{result.location}</div>
                    </div>
                    <div className="track-summary-card">
                      <div className="track-summary-label">Current stage</div>
                      <div className="track-summary-value">{result.statusLabel}</div>
                    </div>
                    <div className="track-summary-card">
                      <div className="track-summary-label">
                        {result.eta ? "Estimated ready" : "Job ref"}
                      </div>
                      <div className="track-summary-value">
                        {result.eta ?? result.reference}
                      </div>
                    </div>
                  </div>

                  <div className="track-progress-label">Repair progress</div>
                  <ol className="track-timeline">
                    {result.steps.map((step, index) => (
                      <li
                        key={step.id}
                        className={`track-timeline-item track-timeline-item--${step.status}${index === result.steps.length - 1 ? " track-timeline-item--last" : ""}`}
                      >
                        <div className="track-timeline-marker" aria-hidden="true" />
                        <div className="track-timeline-body">
                          <div className="track-timeline-top">
                            <h3 className="track-timeline-title">{step.label}</h3>
                            {step.timestamp ? (
                              <span className="track-timeline-time">{step.timestamp}</span>
                            ) : null}
                          </div>
                          <p className="track-timeline-detail">{step.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div className="hero-contact-right">
              <div className="contact-support-info">
                <div className="contact-support-item">
                  <div className="text-sm-uppercase">Need an update?</div>
                  <a href="tel:+2340000000000" className="contact-support-link">
                    Call the workshop
                  </a>
                </div>
                <p className="contact-support-description">
                  Quote your name and plate and we will pull up the job card. Costs and
                  quotes stay in the workshop — this page only shows progress.
                </p>
              </div>

              <div className="contact-details track-help-card">
                <div className="text-sm-uppercase text-gray-3">What you will see</div>
                <ul className="track-help-list">
                  <li>Whether the car is at Mechanic (VA) or Painting (VP)</li>
                  <li>Current workshop stage</li>
                  <li>Estimated collection time when set</li>
                  <li>No prices, parts costs, or payment details</li>
                </ul>
              </div>

              <div className="contact-schedule">
                <div className="contact-schedule-text">Workshop hours</div>
                <div className="contact-schedule-item">
                  <div className="text-black">Mon – Fri</div>
                  <div className="contact-schedule-time">08:00 – 18:00</div>
                </div>
                <div className="contact-schedule-item">
                  <div className="text-black">Saturday</div>
                  <div className="contact-schedule-time">09:00 – 13:00</div>
                </div>
                <div className="contact-schedule-item bottom">
                  <div className="text-black">Sunday</div>
                  <div className="contact-schedule-time">Closed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
