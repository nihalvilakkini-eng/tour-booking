
"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function SiteShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isOperatorPage = pathname.startsWith("/operator");

  if (isOperatorPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
