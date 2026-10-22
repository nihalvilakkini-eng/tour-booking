import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";

type Role = "admin" | "operator" | "user";

export async function requireRole(requiredRole: "admin" | "operator") {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    redirect("/login");
  }

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    !isRole(decoded.role)
  ) {
    redirect("/login");
  }

  if (decoded.role !== requiredRole) {
    if (decoded.role === "admin") {
      redirect("/admin/dashboard");
    }
    if (decoded.role === "operator") {
      redirect("/operator/dashboard");
    }
    redirect("/");
  }
}

function isRole(role: unknown): role is Role {
  return role === "admin" || role === "operator" || role === "user";
}
