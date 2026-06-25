import Link from "next/link";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface AuthTemplateProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthTemplate({
  title,
  subtitle,
  children,
  footer,
  className,
}: AuthTemplateProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden flex-1 flex-col justify-between border-r border-border bg-[var(--color-surface-sidebar)] p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] text-white">
            <Flame className="h-5 w-5 fill-current" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Vonos Group</p>
            <p className="text-sm text-muted">Operations platform</p>
          </div>
        </div>
        <div className="max-w-md space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            One platform for every entity.
          </h2>
          <p className="text-base leading-relaxed text-muted">
            Warehouse, shops, workshops, and group admin — config-driven per tenant,
            shared design system, single codebase.
          </p>
        </div>
        <p className="text-sm text-muted">Internal use only · Invite-based access</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className={cn("w-full max-w-md space-y-8", className)}>
          <div className="space-y-2 text-center lg:text-left">
            <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] text-white">
                <Flame className="h-5 w-5 fill-current" />
              </div>
              <span className="text-lg font-semibold">Vonos</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>
          {children}
          {footer ? <div className="text-center text-sm text-muted lg:text-left">{footer}</div> : null}
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
    <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
