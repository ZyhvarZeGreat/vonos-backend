import type { Metadata } from "next";
import { helveticaNeue, plusJakartaSans } from "@/lib/fonts";
import { AppProviders } from "@/components/providers/AppProviders";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Vonos",
  description: "Operations platform for Vonos Autos Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${helveticaNeue.variable} ${plusJakartaSans.variable} ${helveticaNeue.className} antialiased`}
      >
        <QueryProvider>
          <AppProviders>{children}</AppProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
