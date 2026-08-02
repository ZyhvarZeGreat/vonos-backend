import { redirect } from "next/navigation";

/**
 * Entry URL for vonosgroup.com/operations — opens the ops app (login / overview).
 */
export default function OperationsEntryPage() {
  const skipAuth =
    process.env.NEXT_PUBLIC_SKIP_AUTH === "true" ||
    (process.env.NEXT_PUBLIC_SKIP_AUTH !== "false" &&
      process.env.NODE_ENV === "development");

  redirect(skipAuth ? "/VW/overview" : "/login");
}
