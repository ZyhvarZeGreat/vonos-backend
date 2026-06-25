import { redirect } from "next/navigation";

export default function HomePage() {
  const skipAuth =
    process.env.NEXT_PUBLIC_SKIP_AUTH === "true" ||
    (process.env.NEXT_PUBLIC_SKIP_AUTH !== "false" &&
      process.env.NODE_ENV === "development");

  redirect(skipAuth ? "/VW/overview" : "/login");
}
