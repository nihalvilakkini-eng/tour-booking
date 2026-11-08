import type { ReactNode } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { requireRole } from "@/lib/page-auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("admin");

  return (
    <div className="admin-shell min-h-screen bg-slate-50 text-slate-800 md:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
