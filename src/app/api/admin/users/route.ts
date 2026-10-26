import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User, { type IUser } from "@/models/User";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

function isUserRole(role: string): role is IUser["role"] {
  return role === "user" || role === "operator" || role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getRequestUser(request.cookies.get("token")?.value);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    if (admin.role !== "admin") {
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
      .select("name lastName email role createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
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