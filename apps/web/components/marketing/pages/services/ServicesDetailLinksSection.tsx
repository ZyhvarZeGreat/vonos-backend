import Link from "next/link";

import { SERVICES, servicePath } from "@/lib/marketing/services";

/**
 * Hand-written cross-link strip mounted below the (auto-generated) service
 * list. Links each hub card to its per-service detail page so crawlers and
 * users can reach /services/[slug] within one click of the hub.
 */
export default function ServicesDetailLinksSection() {
  return (
    <section className="vg-sec" data-qa-section="services-detail-links">
      <div className="vg-container">
        <h2 className="vg-article__h2">Explore each service in detail</h2>
        <ul className="vg-article__points">
          {SERVICES.map((service) => (
            <li key={service.slug} className="vg-article__point">
              <Link href={servicePath(service.slug)}>{service.title} in Abuja</Link>
              {" — "}
              {service.excerpt}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
