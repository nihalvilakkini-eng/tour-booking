import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/request-user";

export async function requireRole(requiredRole: "admin" | "operator") {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await getRequestUser(token, { includeDeactivated: true });
  if (!user) {
    redirect("/login");
  }
  if (!user.isActive) {
    redirect("/login?reason=account-deactivated");
  }

  if (user.role !== requiredRole) {
    if (user.role === "admin") {
      redirect("/admin/dashboard");
    }
    if (user.role === "operator") {
      redirect("/operator/dashboard");
    }
    redirect("/");
  }
}
