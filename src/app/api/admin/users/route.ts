import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User, { type IUser } from "@/models/User";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;

async function getAdminId(request: NextRequest) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, JWT_SECRET) as {
    userId: string;
    role: string;
  };

  if (decoded.role !== "admin") {
    return null;
  }

  return decoded.userId;
}

function isUserRole(role: string): role is IUser["role"] {
  return role === "user" || role === "operator" || role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const adminId = await getAdminId(request);

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins can access users",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const role = searchParams.get("role");
    const search = searchParams.get("search");

    const query: {
      role?: IUser["role"];
      $or?: Array<{
        name?: { $regex: string; $options: string };
        lastName?: { $regex: string; $options: string };
        email?: { $regex: string; $options: string };
      }>;
    } = {};

    if (role && isUserRole(role)) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          lastName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Admin users GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}