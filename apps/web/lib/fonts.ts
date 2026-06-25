import { Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";

/** Headings, page titles, TopBar / section headers */
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** Body copy, tables, forms, nav labels */
export const helveticaNeue = localFont({
  src: [
    {
      path: "../../../helvetica-neue-5/HelveticaNeueUltraLight.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../../helvetica-neue-5/HelveticaNeueLight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../../helvetica-neue-5/HelveticaNeueRoman.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../helvetica-neue-5/HelveticaNeueMedium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../helvetica-neue-5/HelveticaNeueBold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-helvetica-neue",
  display: "swap",
});
