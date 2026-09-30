import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { AppProviders } from "@/components/providers/AppProviders";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { helveticaNeue, hostGrotesk } from "@/lib/fonts";
import { DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE, SITE_NAME, absoluteUrl, siteUrl } from "@/lib/seo/site";
import "@/styles/globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — Honest Repairs. Every Make.`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Manufacturer schedule servicing, diagnostics, parts shop, and workshop tracking — fixed-price quotes and warranty on every repair.",
  keywords: DEFAULT_KEYWORDS,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_NG",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Honest Repairs. Every Make.`,
    description:
      "Honest auto repairs and genuine parts. Order online for delivery or book fitment at Vonos.",
    url: absoluteUrl("/"),
    images: [{ url: DEFAULT_OG_IMAGE, alt: `${SITE_NAME} workshop` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Honest Repairs. Every Make.`,
    description:
      "Honest auto repairs and genuine parts. Order online for delivery or book fitment at Vonos.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${hostGrotesk.variable} ${helveticaNeue.variable} ${dmSans.className} antialiased`}
      >
        <QueryProvider>
          <AppProviders>{children}</AppProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
