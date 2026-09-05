import localFont from "next/font/local";

/**
 * Headings, page titles, TopBar / section headers.
 * Self-hosted Plus Jakarta Sans (replaces Host Grotesk).
 * Variable name stays `--font-host-grotesk` for existing theme CSS.
 * Turbopack's next/font/google loader fails to resolve
 * `@vercel/turbopack-next/internal/font/google/font` when gstatic fetch flakes.
 */
export const hostGrotesk = localFont({
  src: [
    {
      path: "../assets/fonts/plus-jakarta-sans/PlusJakartaSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/plus-jakarta-sans/PlusJakartaSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/plus-jakarta-sans/PlusJakartaSans-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/plus-jakarta-sans/PlusJakartaSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-host-grotesk",
  display: "swap",
});

/** Same face as hostGrotesk — kept for callers that import this name. */
export const plusJakartaSans = hostGrotesk;

/** Body copy, tables, forms, nav labels */
export const helveticaNeue = localFont({
  src: [
    {
      path: "../assets/fonts/helvetica-neue/HelveticaNeueUltraLight.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../assets/fonts/helvetica-neue/HelveticaNeueLight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../assets/fonts/helvetica-neue/HelveticaNeueRoman.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/helvetica-neue/HelveticaNeueMedium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/helvetica-neue/HelveticaNeueBold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-helvetica-neue",
  display: "swap",
});
