import { Suspense } from "react";
import { LoginForm } from "@/components/pages/LoginForm";
import { AuthTemplate } from "@/components/templates/AuthTemplate";

/** Static chrome while useSearchParams resolves — no spinner (nothing to load). */
function LoginFallback() {
  return (
    <AuthTemplate title="Welcome back" subtitle="Sign in to your Vonos account">
      <div className="space-y-5" aria-hidden>
        <div className="h-12 rounded-lg bg-[var(--auth-blue-soft,#eff6ff)]" />
        <div className="h-12 rounded-lg bg-[var(--auth-blue-soft,#eff6ff)]" />
        <div className="h-12 rounded-full bg-[var(--auth-red,#dc2626)]/90" />
      </div>
    </AuthTemplate>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
