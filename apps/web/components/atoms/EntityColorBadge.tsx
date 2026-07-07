import { accentForTenantCode } from "@/lib/registries/tenantAccents";
import { getTenantByCode } from "@/lib/registries/tenants";
import { cn } from "@/lib/utils/cn";

export interface EntityColorBadgeProps {
  code: string;
  showName?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function EntityColorBadge({
  code,
  showName = true,
  size = "md",
  className,
}: EntityColorBadgeProps) {
  const accent = accentForTenantCode(code);
  const name = getTenantByCode(code)?.name ?? code;
  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn("shrink-0 rounded-full", dotSize)}
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      {showName ? (
        <span className={cn("font-medium text-foreground", textSize)}>
          {code}
          <span className="font-normal text-muted"> · {name}</span>
        </span>
      ) : (
        <span className="sr-only">{name}</span>
      )}
    </span>
  );
}
