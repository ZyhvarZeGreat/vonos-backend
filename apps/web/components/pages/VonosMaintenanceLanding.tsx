import { plusJakartaSans } from "@/lib/fonts";

/** Customer-facing apex maintenance notice (not used on /operations). */
export function VonosMaintenanceLanding() {
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

        <div className="max-w-lg space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200/90">
            Under maintenance
          </p>
          <p className="text-base font-normal text-sky-100/95 sm:text-lg sm:leading-relaxed">
            We are working on a new and improved experience for our customers.
            Thank you for your patience.
          </p>
        </div>
      </div>
    </main>
  );
}
