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
  
  const isSpecialPage = 
    pathname.startsWith("/operator") || 
    pathname.startsWith("/admin") || 
    pathname.startsWith("/messages") || 
    pathname.startsWith("/notifications");

  if (isSpecialPage) {
    return (
      <div className="site-content flex min-h-screen flex-1 flex-col bg-slate-900 text-slate-100">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100">
      <Navbar />
      <div className="site-content flex flex-1 flex-col bg-slate-900 text-slate-100">{children}</div>
      <Footer />
    </div>
  );
}
