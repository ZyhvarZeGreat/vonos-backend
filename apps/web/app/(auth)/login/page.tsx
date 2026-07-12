import { Suspense } from "react";
import { LoginForm } from "@/components/pages/LoginForm";
import { AuthFormSkeleton } from "@/components/organisms/skeletons";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0b5ed7] p-6">
          <AuthFormSkeleton />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
