import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface AuthTemplateProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Top-right slot on the form panel (e.g. invite hint). */
  topRight?: React.ReactNode;
}

const AUTH_STYLE = {
  "--auth-blue": "#0b5ed7",
  "--auth-blue-deep": "#084298",
  "--auth-blue-mid": "#1a6fe0",
  "--auth-blue-soft": "#e8f1fb",
  "--auth-blue-title": "#5b9cf5",
  "--color-brand-primary": "#0b5ed7",
  "--color-brand-primary-hover": "#084298",
} as React.CSSProperties;

function AuthBrandMark({ className, inverse }: { className?: string; inverse?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5">
        <Image
          src="/brand/vonos-autos-mark.png"
          alt=""
          width={48}
          height={48}
          priority
          className="h-10 w-10 object-contain"
        />
      </div>
      <div>
        <p
          className={cn(
            "text-xl font-bold tracking-tight",
            inverse ? "text-white" : "text-[var(--auth-blue,#0b5ed7)]",
          )}
        >
          Vonos
        </p>
        <p className={cn("text-xs", inverse ? "text-white/70" : "text-muted")}>Autos Group</p>
      </div>
    </div>
  );
}

export function AuthTemplate({
  title,
  subtitle,
  children,
  footer,
  className,
  topRight,
}: AuthTemplateProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[var(--auth-blue)] p-4 sm:p-6 lg:p-10"
      style={AUTH_STYLE}
    >
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/25">
        {/* Left promotional panel */}
        <div className="relative hidden w-[48%] flex-col justify-between overflow-hidden bg-[var(--auth-blue-deep)] p-10 text-white lg:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(255,255,255,0.18), transparent 55%), linear-gradient(160deg, transparent 40%, rgba(0,0,0,0.25))",
            }}
          />
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-10 h-72 w-72 rounded-full bg-[var(--auth-blue-mid)]/50 blur-3xl"
            aria-hidden
          />

          <div className="relative z-10">
            <AuthBrandMark inverse />
          </div>

          <div className="relative z-10 max-w-md space-y-4">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/80 uppercase">
              One platform for every Vonos entity
            </p>
            <h2 className="font-serif text-4xl leading-tight font-semibold tracking-tight text-white">
              Visibility, efficiency, control
            </h2>
            <p className="text-base leading-relaxed text-white/85">
              Warehouse, retail, workshop, cafe, and group admin — each team sees only their
              tools and data.
            </p>
          </div>

          <p className="relative z-10 text-sm text-white/70">Staff access by invitation only</p>
        </div>

        {/* Right form panel */}
        <div className="relative flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-12">
          {topRight ? (
            <div className="absolute top-6 right-6 text-sm text-muted sm:top-8 sm:right-8">
              {topRight}
            </div>
          ) : null}

          <div className={cn("mx-auto w-full max-w-sm space-y-8", className)}>
            <div className="space-y-3 text-center lg:text-left">
              <div className="mb-2 flex justify-center lg:justify-start">
                <AuthBrandMark />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--auth-blue-title)]">
                {title}
              </h1>
              {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
            </div>

            {children}

            {footer ? (
              <div className="text-center text-sm text-muted lg:text-left">{footer}</div>
            ) : null}
          </div>

          <p className="mt-10 text-center text-xs text-muted lg:text-right">
            © {new Date().getFullYear()} Vonos Autos Group — All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthFooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-[var(--auth-blue,#0b5ed7)] underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
