import { cdn } from "@/lib/cdn";
import { BUSINESS } from "@/lib/seo/business";
import { absoluteUrl, siteUrl } from "@/lib/seo/site";

/** Render a JSON-LD object as a <script> payload. */
export function jsonLdScript(json: Record<string, unknown>): string {
  return JSON.stringify(json).replace(/</g, "\\u003c");
}

/** Site-wide AutoRepair entity. Mount once (homepage is the canonical host). */
export function autoRepairJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: BUSINESS.name,
    url: BUSINESS.url,
    telephone: BUSINESS.telephone,
    priceRange: BUSINESS.priceRange,
    image: absoluteUrl(cdn("/images/vonos-photos/IMG_0437.jpg")),
    address: { "@type": "PostalAddress", ...BUSINESS.address },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [...BUSINESS.openingHours.dayOfWeek],
      opens: BUSINESS.openingHours.opens,
      closes: BUSINESS.openingHours.closes,
    },
    areaServed: [...BUSINESS.areaServed],
  };
}

export type FaqItem = { question: string; answer: string };

/**
 * FAQPage schema. Only call with FAQs that are visibly rendered on the same
 * page — Google ignores (and may penalise) hidden-question markup.
 */
export function faqPageJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export type Crumb = { name: string; path: string };

/** BreadcrumbList schema. Paths are resolved against the site URL. */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** Service schema for per-service detail pages. */
export function serviceJsonLd(opts: {
  serviceType: string;
  path: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: opts.serviceType,
    url: absoluteUrl(opts.path),
    description: opts.description,
    provider: {
      "@type": "AutoRepair",
      name: BUSINESS.name,
      url: siteUrl(),
      telephone: BUSINESS.telephone,
      address: { "@type": "PostalAddress", ...BUSINESS.address },
    },
    areaServed: [...BUSINESS.areaServed],
  };
}

/** Article schema for blog posts. */
export function articleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  image: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    image: absoluteUrl(opts.image),
    mainEntityOfPage: absoluteUrl(opts.path),
    author: { "@type": "Organization", name: opts.authorName, url: siteUrl() },
    publisher: { "@type": "Organization", name: BUSINESS.name, url: siteUrl() },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified,
  };
}
