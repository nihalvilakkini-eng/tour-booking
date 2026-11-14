import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { getJwtSecret } from "@/lib/auth";
import User from "@/models/User";

export type UserRole = "user" | "operator" | "admin";

export type RequestUser = {
  userId: string;
  role: UserRole;
  isActive: boolean;
};

export function isUserRole(role: unknown): role is UserRole {
  return role === "user" || role === "operator" || role === "admin";
}

/**
 * Extracts JWT token from NextRequest cookies or Authorization Bearer header.
 */
export function getTokenFromRequest(
  request?: NextRequest | Request | null
): string | undefined {
  if (!request) return undefined;

  // Check cookies first (standard in NextRequest)
  if ("cookies" in request && typeof request.cookies?.get === "function") {
    const cookieToken = request.cookies.get("token")?.value;
    if (cookieToken) return cookieToken;
  }

  // Fallback to headers (Authorization: Bearer <token>)
  const authHeader = request.headers?.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.substring(7).trim();
  }

  // Check Cookie header string directly if present
  const cookieHeader = request.headers?.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return undefined;
}

export async function getRequestUser(
  tokenOrRequest?: string | NextRequest | Request | null,
  options: { includeDeactivated?: boolean } = {}
): Promise<RequestUser | null> {
  if (!tokenOrRequest) return null;

  let token: string | undefined;

  if (typeof tokenOrRequest === "string") {
    token = tokenOrRequest.trim();
  } else {
    token = getTokenFromRequest(tokenOrRequest);
  }

  if (!token) return null;

  const secret = getJwtSecret();

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return null;
  }

  if (typeof decoded === "string" || !decoded) {
    return null;
  }

  // Support token payloads using userId, id, _id, or sub
  const payload = decoded as Record<string, unknown>;
  const rawUserId = payload.userId || payload.id || payload._id || payload.sub;

  const userId =
    typeof rawUserId === "string" ? rawUserId : String(rawUserId || "");

  if (!userId || !mongoose.isValidObjectId(userId)) {
    return null;
  }

  await connectDB();

  const user = await User.findById(userId)
    .select("role isActive")
    .lean();

  if (!user) return null;

  const role: UserRole = isUserRole(user.role) ? user.role : "user";
  const isActive = user.isActive !== false;
  if (!isActive && !options.includeDeactivated) return null;

  return {
    userId: String(user._id),
    role,
    isActive,
  };
}
