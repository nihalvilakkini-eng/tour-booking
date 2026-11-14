import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "WAYORA",
  description: "Discover and book unforgettable experiences.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="dark">
      <body className="min-h-screen flex flex-col bg-slate-900 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
