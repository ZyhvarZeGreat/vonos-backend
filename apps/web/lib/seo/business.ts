/**
 * Canonical business identity for Vonos Automotive (customer site).
 *
 * Used by JSON-LD schema builders in `lib/seo/schema.ts`.
 *
 * TODO (blocker for local SEO): replace the placeholder phone/address with
 * the real workshop details before submitting to Google Business Profile.
 * Every value here must match the GBP listing and site footer exactly (NAP).
 */
export const BUSINESS = {
  name: "Vonos Automotive",
  url: "https://vonosautos.com",
  // TODO: replace with the real workshop line, e.g. "+234 803 123 4567".
  telephone: "+234-XXX-XXX-XXXX",
  priceRange: "₦₦",
  address: {
    // TODO: replace with the real street address.
    streetAddress: "Vonos Plaza, Military Roundabout, Kubwa",
    addressLocality: "Abuja",
    addressRegion: "FCT",
    postalCode: "901101",
    addressCountry: "NG",
  },
  geo: {
    // TODO: replace with real coordinates from Google Maps pin.
    latitude: 9.1534,
    longitude: 7.3362,
  },
  openingHours: {
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "08:00",
    closes: "18:00",
  },
  areaServed: [
    "Kubwa",
    "Gwarinimpa",
    "Maitama",
    "Wuse",
    "Utako",
    "Jabi",
    "Lugbe",
    "Garki",
    "Abuja",
  ],
} as const;
