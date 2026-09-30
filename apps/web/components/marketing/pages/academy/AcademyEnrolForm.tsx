"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  ACADEMY_CONTACT,
  ACADEMY_COURSES,
} from "@/lib/marketing/academy-courses";

function buildMessage(args: {
  name: string;
  phone: string;
  email: string;
  courseLabel: string;
  message: string;
}): string {
  return [
    "Vonos Academy enrolment enquiry",
    "",
    `Name: ${args.name}`,
    `Phone: ${args.phone}`,
    `Email: ${args.email || "—"}`,
    `Course: ${args.courseLabel}`,
    "",
    args.message.trim() || "(No extra message)",
  ].join("\n");
}

function initialCourseId(fromUrl: string | null): string {
  if (fromUrl && ACADEMY_COURSES.some((course) => course.id === fromUrl)) {
    return fromUrl;
  }
  return ACADEMY_COURSES[0]?.id ?? "";
}

export default function AcademyEnrolForm() {
  const searchParams = useSearchParams();
  const courseFromUrl = searchParams.get("course");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [courseId, setCourseId] = useState(() => initialCourseId(courseFromUrl));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCourseId(initialCourseId(courseFromUrl));
  }, [courseFromUrl]);

  const courseLabel = useMemo(() => {
    const match = ACADEMY_COURSES.find((course) => course.id === courseId);
    return match?.title ?? "General enquiry";
  }, [courseId]);

  function handleWhatsApp(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const body = buildMessage({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      courseLabel,
      message,
    });
    const url = `https://wa.me/${ACADEMY_CONTACT.whatsappE164}?text=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleEmail() {
    if (!name.trim() || !phone.trim()) return;
    const body = buildMessage({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      courseLabel,
      message,
    });
    window.location.href = `mailto:${ACADEMY_CONTACT.email}?subject=${encodeURIComponent(
      `Academy enrolment — ${courseLabel}`,
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <section className="hero-section" id="enrol" data-qa-section="academy-enrol">
      <div className="container">
        <div className="hero-contact-detail">
          <div className="hero-contact-caption">
            <div data-show="show" className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
              Enrolment
            </div>
            <h2 data-show="show" className="no-margin-bottom">
              Enquire to enrol
            </h2>
            <p data-show="show" className="hero-contact-description">
              Send your details by WhatsApp or email. We’ll confirm availability and next steps —
              no online payment on this page.
            </p>
          </div>

          <div className="w-layout-grid grid-hero-contact">
            <div data-show="show" className="hero-contact-left">
              <div className="text-sm-uppercase text-gray-3">Request a place</div>
              <h3 className="heading-h4 no-margin-bottom">A few quick details</h3>
              <div className="no-margin-bottom w-form">
                <form
                  id="Academy-Enrol-Form"
                  name="wf-form-Academy-Enrol"
                  className="contact-form"
                  aria-label="Academy enrolment enquiry"
                  onSubmit={handleWhatsApp}
                >
                  <div className="w-layout-grid grid-contact-input">
                    <div className="contact-label">
                      <label htmlFor="academy-name" className="field-title">
                        Full name*
                      </label>
                      <input
                        id="academy-name"
                        className="form-input contact-input w-input"
                        maxLength={256}
                        name="name"
                        placeholder="Enter your full name"
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                    <div className="contact-label">
                      <label htmlFor="academy-phone" className="field-title">
                        Phone number*
                      </label>
                      <input
                        id="academy-phone"
                        className="form-input contact-input w-input"
                        maxLength={256}
                        name="phone"
                        placeholder="Your phone number"
                        type="tel"
                        required
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </div>
                    <div className="contact-label">
                      <label htmlFor="academy-email" className="field-title">
                        Email address
                      </label>
                      <input
                        id="academy-email"
                        className="form-input contact-input w-input"
                        maxLength={256}
                        name="email"
                        placeholder="info@vonos.com"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                    <div className="contact-label">
                      <label htmlFor="academy-course" className="field-title">
                        Programme*
                      </label>
                      <select
                        id="academy-course"
                        className="form-input contact-input w-select"
                        name="course"
                        required
                        value={courseId}
                        onChange={(event) => setCourseId(event.target.value)}
                      >
                        {ACADEMY_COURSES.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="contact-label">
                    <label htmlFor="academy-message" className="field-title">
                      Message
                    </label>
                    <textarea
                      id="academy-message"
                      name="message"
                      placeholder="Dates you’re free, experience level, or questions…"
                      maxLength={5000}
                      className="form-input form-textarea contact-textarea w-input"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                  </div>
                  <div className="contact-cta">
                    <input
                      type="submit"
                      className="button-primary contact-button w-button"
                      value="Send on WhatsApp"
                    />
                    <div className="contact-cta-text">
                      Or{" "}
                      <button
                        type="button"
                        className="breadcrumb-link text-black"
                        style={{
                          background: "none",
                          border: 0,
                          padding: 0,
                          cursor: "pointer",
                          font: "inherit",
                        }}
                        onClick={handleEmail}
                      >
                        send by email
                      </button>
                      {" · "}
                      no deposit to enquire
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div data-show="show" className="hero-contact-right">
              <div className="contact-support-info">
                <div className="contact-support-item">
                  <div className="text-sm-uppercase">Prefer to talk?</div>
                  <a href={`tel:${ACADEMY_CONTACT.phoneTel}`} className="contact-support-link">
                    {ACADEMY_CONTACT.phoneDisplay}
                  </a>
                </div>
                <p className="contact-support-description">
                  A real person picks up — call or WhatsApp during opening hours.
                </p>
              </div>
              <div data-show="show" className="contact-details">
                <div className="text-sm-uppercase text-gray-3">Where to find us</div>
                <div className="contact-item">
                  <div className="contact-icon-wrap bg-primary-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/pages/contact/6a76c48c2d3a718a753f6740_location.svg"
                      loading="lazy"
                      alt=""
                      className="contact-icon"
                    />
                  </div>
                  <div className="contact-info">
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Vonos+Plaza+Military+Roundabout+Kubwa+Abuja"
                      target="_blank"
                      rel="noreferrer"
                      className="contact-link"
                    >
                      Vonos Plaza, Military Roundabout
                    </a>
                    <div>Kubwa (F01), FCT</div>
                  </div>
                </div>
                <div className="contact-item top">
                  <div className="contact-icon-wrap bg-gray-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/pages/contact/6a76c640aa969a5ffe2e225e_email.svg"
                      loading="lazy"
                      alt=""
                      className="contact-icon"
                    />
                  </div>
                  <div className="contact-info">
                    <a href={`mailto:${ACADEMY_CONTACT.email}`} className="contact-link">
                      {ACADEMY_CONTACT.email}
                    </a>
                    <div>We reply within the hour</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
