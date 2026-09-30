import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";
import { SERVICES, getService, servicePath } from "@/lib/marketing/services";
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  jsonLdScript,
  serviceJsonLd,
} from "@/lib/seo/schema";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service not found | Vonos" };

  return {
    title: `${service.title} in Abuja | Vonos`,
    description: service.excerpt,
    keywords: service.keywords,
    alternates: { canonical: servicePath(service.slug) },
    openGraph: {
      title: `${service.title} in Abuja | Vonos`,
      description: service.excerpt,
      url: servicePath(service.slug),
    },
  };
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const path = servicePath(service.slug);
  const related = SERVICES.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            serviceJsonLd({
              serviceType: service.title,
              path,
              description: service.excerpt,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            faqPageJsonLd(
              service.faqs.map((faq) => ({
                question: faq.question,
                answer: faq.answer,
              })),
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
              { name: service.title, path },
            ]),
          ),
        }}
      />
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage vg-page">
        <SiteNav />
        <article className="vg-article" data-qa-section="service-detail">
          <div className="vg-container">
            <nav className="vg-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden>/</span>
              <Link href="/services">Services</Link>
              <span aria-hidden>/</span>
              <span className="vg-crumbs__current">{service.title}</span>
            </nav>

            <header className="vg-article__head">
              <h1 className="vg-article__title">
                {service.title} in Abuja
              </h1>
              <p className="vg-article__lead">{service.excerpt}</p>
              <p>
                <Link href="/contact" className="vg-btn">
                  Book this service
                </Link>
              </p>
            </header>

            <div className="vg-article__body">
              {service.description.map((paragraph, index) => (
                <p key={index} className="vg-article__p">
                  {paragraph}
                </p>
              ))}

              <section className="vg-article__section">
                <h2 className="vg-article__h2">What&apos;s included</h2>
                <ul className="vg-article__points">
                  {service.includes.map((item) => (
                    <li key={item} className="vg-article__point">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="vg-article__section">
                <h2 className="vg-article__h2">Warning signs you need this</h2>
                <ul className="vg-article__points">
                  {service.signs.map((item) => (
                    <li key={item} className="vg-article__point">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="vg-article__section">
                <h2 className="vg-article__h2">Frequently asked questions</h2>
                {service.faqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="vg-article__h2">{faq.question}</h3>
                    <p className="vg-article__p">{faq.answer}</p>
                  </div>
                ))}
              </section>

              <section className="vg-article__section">
                <h2 className="vg-article__h2">Related services</h2>
                <ul className="vg-article__points">
                  {related.map((item) => (
                    <li key={item.slug} className="vg-article__point">
                      <Link href={servicePath(item.slug)}>{item.title}</Link>
                      {" — "}
                      {item.excerpt}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </article>
        <SiteFooter />
      </main>
    </>
  );
}
