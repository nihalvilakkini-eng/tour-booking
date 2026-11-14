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
    <div className="admin-shell min-h-screen bg-slate-900 text-slate-100 md:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1 overflow-x-hidden bg-slate-900">
        {children}
      </div>
    </div>
  );
}