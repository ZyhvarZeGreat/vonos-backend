import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo } from "next/font/google";

import MarketingShell from "@/components/marketing/MarketingShell";
import { hostGrotesk } from "@/lib/fonts";
import { SITE_NAME, absoluteUrl } from "@/lib/seo/site";

import "@/styles/marketing.css";
import "@/styles/shop-ecommerce.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    siteName: SITE_NAME,
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/styles/motocare-scraped.css" />
      <link rel="stylesheet" href="/styles/vonos-theme.css" />
      <div className={`${archivo.variable} ${hostGrotesk.variable} marketing-root`}>
        <MarketingShell>{children}</MarketingShell>
      </div>
    </>
  );
}
