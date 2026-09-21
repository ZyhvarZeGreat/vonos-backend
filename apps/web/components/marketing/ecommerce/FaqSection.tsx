"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import SectionHead from "@/components/marketing/ecommerce/SectionHead";

const FAQS = [
  {
    q: "How do I place an order?",
    a: "Add parts to your cart from any product page, then continue to checkout. You will confirm delivery or workshop fitment before paying.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Card and bank transfer through Paystack at checkout, or pay on collection at the Abuja workshop.",
  },
  {
    q: "How long will it take for my order to arrive?",
    a: "Abuja deliveries go out same-day when ordered before 3pm. Other states arrive in two to four working days.",
  },
  {
    q: "Do you offer warranties on your products?",
    a: "Every genuine part carries its manufacturer warranty, and repairs fitted by our technicians carry a 12-month workmanship warranty.",
  },
  {
    q: "How can I contact customer support?",
    a: "Message the parts desk on WhatsApp or use the contact page — an advisor replies during working hours, seven days a week.",
  },
  {
    q: "What if I can't find a specific part on your website?",
    a: "Send the vehicle registration and the part you need. We source from the Vonos warehouse network and quote within the day.",
  },
] as const;

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="vg-sec" data-node-id="98:504" data-qa-section="blog-faq">
      <div className="vg-container">
        <SectionHead title="Have Any Questions?" />

        <div className="vg-faq__row">
          <div className="vg-faq__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/team/technician.webp" alt="" loading="lazy" />
          </div>

          <div>
            <div className="vg-faq__list">
              {FAQS.map((faq, index) => {
                const isOpen = open === index;
                return (
                  <div key={faq.q} className="vg-faq__item" data-open={isOpen}>
                    <button
                      type="button"
                      className="vg-faq__q"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : index)}
                    >
                      <ArrowRight size={18} strokeWidth={1.6} aria-hidden />
                      {faq.q}
                    </button>
                    {isOpen ? <p className="vg-faq__a">{faq.a}</p> : null}
                  </div>
                );
              })}
            </div>

            <Link href="/shop#shop-catalog" className="vg-faq__explore">
              Explore Collection →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
