import type { Metadata } from "next";
import Link from "next/link";
import { plusJakartaSans } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Vonos Group",
  description: "Vonos Group — enter Vonos Operations",
};

/**
 * Apex landing for vonosgroup.com — brand first, then enter operations.
 */
export default function VonosGroupLandingPage() {
  return (
    <main
      className={`${plusJakartaSans.className} relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center`}
      style={{
        background:
          "radial-gradient(120% 80% at 50% -10%, #3b82f6 0%, #1e40af 42%, #0f172a 100%)",
        color: "#f8fafc",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, rgba(147,197,253,0.25), transparent 40%), radial-gradient(circle at 85% 25%, rgba(96,165,250,0.2), transparent 35%)",
        }}
      />

      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-10">
        <p
          className="text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[0.95] tracking-tight"
          style={{ textShadow: "0 2px 24px rgba(15,23,42,0.35)" }}
        >
          Vonos Group
        </p>

        <p className="max-w-md text-base font-normal text-sky-100/90 sm:text-lg">
          Multi-entity operations for the Vonos Autos Group.
        </p>

        <Link
          href="/operations"
          className="inline-flex items-center justify-center rounded-md bg-white px-8 py-3.5 text-base font-semibold text-[#1e3a8a] shadow-lg transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Click to enter Vonos Operations
        </Link>
      </div>
    </main>
  );
}
