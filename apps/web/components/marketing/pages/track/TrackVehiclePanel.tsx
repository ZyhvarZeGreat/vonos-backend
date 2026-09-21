"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  lookupVehicleTrack,
  subscribeTrackWhatsApp,
  type PublicTrackResult,
} from "@/lib/marketing/track-api";
import TrackResultView from "@/components/marketing/pages/track/TrackResultView";

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
            `WhatsApp updates will go to ${saved.phone}. We’ll message this number when your status changes.`,
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
        <div className="track-shell">
          <div className="breadcrumb-item" style={{ marginBottom: "1rem" }}>
            <Link href="/" className="breadcrumb-link text-black">
              Home
            </Link>
            <div className="breadcrumb-text text-black">/</div>
            <div className="breadcrumb-text text-gray-3">Track my vehicle</div>
          </div>

          {!result ? (
            <>
              <h1 className="no-margin-bottom" style={{ marginBottom: "0.5rem" }}>
                Track my vehicle
              </h1>
              <p
                className="hero-contact-description"
                style={{ marginBottom: "1.5rem" }}
              >
                Enter your name and plate for live repair status. We never show
                parts, costs, or which workshop branch has the car.
              </p>

              <form
                className="contact-form track-form track-result"
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
                      onChange={(event) => setRegistration(event.target.value)}
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

                <div className="contact-cta" style={{ marginTop: "1rem" }}>
                  <button
                    type="submit"
                    className="button-primary contact-button w-button"
                    disabled={loading}
                  >
                    {loading ? "Looking up…" : "Track my car"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <TrackResultView
              result={result}
              notice={
                notice ? (
                  <p className="no-margin-bottom" role="status">
                    {notice}
                  </p>
                ) : null
              }
              headerAction={
                <button
                  type="button"
                  className="track-reset-link"
                  onClick={handleReset}
                >
                  Look up another
                </button>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}
