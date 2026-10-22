
import type { ReactNode } from "react";
import OperatorDashboardLayout from "@/components/operator/OperatorDashboardLayout";
import { requireRole } from "@/lib/page-auth";

export default async function OperatorLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("operator");
  return <OperatorDashboardLayout>{children}</OperatorDashboardLayout>;
}
