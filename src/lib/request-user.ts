import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export type UserRole = "user" | "operator" | "admin";

export type RequestUser = {
  userId: string;
  role: UserRole;
};

function isUserRole(role: unknown): role is UserRole {
  return role === "user" || role === "operator" || role === "admin";
}

export async function getRequestUser(token?: string): Promise<RequestUser | null> {
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return null;
  }

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    !mongoose.isValidObjectId(decoded.userId)
  ) {
    return null;
  }

  await connectDB();

  const user = await User.findById(decoded.userId).select("role").lean();
  if (!user || !isUserRole(user.role)) return null;

  return {
    userId: String(user._id),
    role: user.role,
  };
}
