"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  lookupVehicleTrack,
  subscribeTrackWhatsApp,
  type PublicTrackResult,
} from "@/lib/marketing/track-api";

export default function TrackVehiclePanel() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [result, setResult] = useState<PublicTrackResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    setNotice("");
    setResult(null);

    const customerName = name.trim();
    const plate = registration.trim();
    const wa = whatsapp.trim();

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

      if (wa) {
        try {
          const saved = await subscribeTrackWhatsApp({
            name: customerName,
            registration: plate,
            whatsapp: wa,
          });
          setNotice(
            `WhatsApp updates will go to ${saved.phone}. We’ll message this number when your car’s status changes.`,
          );
        } catch (subErr) {
          setNotice(
            subErr instanceof Error
              ? subErr.message
              : "Status loaded, but WhatsApp number could not be saved.",
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setName("");
    setRegistration("");
    setWhatsapp("");
    setResult(null);
    setError("");
    setNotice("");
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
              Enter your name, registration plate, and WhatsApp number to see live
              repair status and get status updates on WhatsApp — no costs or quotes
              shown here.
            </p>
          </div>

          <div className="w-layout-grid grid-hero-contact">
            <div className="hero-contact-left track-panel">
              {!result ? (
                <>
                  <div className="text-sm-uppercase text-gray-3">Look up a job</div>
                  <h2 className="heading-h4 no-margin-bottom">Find your repair status</h2>

                  <form
                    className="contact-form track-form"
                    onSubmit={(e) => void handleSubmit(e)}
                    noValidate
                  >
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
                          onChange={(event) =>
                            setRegistration(event.target.value)
                          }
                        />
                      </div>
                      <div className="contact-label">
                        <label htmlFor="track-whatsapp" className="field-title">
                          WhatsApp number
                        </label>
                        <input
                          id="track-whatsapp"
                          className="form-input contact-input w-input"
                          name="whatsapp"
                          placeholder="e.g. 0803 123 4567"
                          type="tel"
                          autoComplete="tel"
                          value={whatsapp}
                          onChange={(event) => setWhatsapp(event.target.value)}
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
                        Use the name on the booking and the plate on your vehicle.
                        Add WhatsApp so we can message that number when your status
                        changes.
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                <div className="track-result">
                  <div className="track-result-header">
                    <div>
                      <div className="text-sm-uppercase text-gray-3">
                        {result.phase === "completed"
                          ? "Completed repair"
                          : "Live status"}
                      </div>
                      <h2 className="heading-h4 no-margin-bottom">
                        {result.registration}
                      </h2>
                      <p className="track-result-meta no-margin-bottom">
                        {result.name} · {result.vehicle}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="track-reset-link"
                      onClick={handleReset}
                    >
                      Look up another
                    </button>
                  </div>

                  {notice ? (
                    <p
                      className="track-form-error"
                      role="status"
                      style={{ color: "inherit" }}
                    >
                      {notice}
                    </p>
                  ) : null}

                  {result.phase === "completed" ? (
                    <p
                      className="track-form-error"
                      role="status"
                      style={{ color: "inherit" }}
                    >
                      This job is marked complete on the workshop board. Tracking
                      here does not show payment — contact the workshop if you still
                      need collection or a receipt.
                    </p>
                  ) : null}

                  <div className="track-summary-grid">
                    <div className="track-summary-card">
                      <div className="track-summary-label">Service</div>
                      <div className="track-summary-value">{result.service}</div>
                    </div>
                    <div className="track-summary-card">
                      <div className="track-summary-label">
                        {result.phase === "completed"
                          ? "Workshop"
                          : "Where your car is"}
                      </div>
                      <div className="track-summary-value">{result.location}</div>
                    </div>
                    <div className="track-summary-card">
                      <div className="track-summary-label">Status</div>
                      <div className="track-summary-value">
                        {result.statusLabel}
                      </div>
                    </div>
                    {result.eta ? (
                      <div className="track-summary-card">
                        <div className="track-summary-label">ETA</div>
                        <div className="track-summary-value">{result.eta}</div>
                      </div>
                    ) : null}
                  </div>

                  <ol className="track-steps">
                    {result.steps.map((step) => (
                      <li
                        key={step.id}
                        className={`track-step track-step-${step.status}`}
                        data-status={step.status}
                      >
                        <div className="track-step-marker" aria-hidden />
                        <div className="track-step-body">
                          <div className="track-step-title">
                            {step.label}
                            {step.timestamp ? (
                              <span className="track-step-time">
                                {step.timestamp}
                              </span>
                            ) : null}
                          </div>
                          <p className="track-step-detail no-margin-bottom">
                            {step.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {result.advisor ? (
                    <p className="track-advisor no-margin-bottom">
                      Advisor: {result.advisor}
                      {result.reference ? ` · Ref ${result.reference}` : null}
                    </p>
                  ) : result.reference ? (
                    <p className="track-advisor no-margin-bottom">
                      Ref {result.reference}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
