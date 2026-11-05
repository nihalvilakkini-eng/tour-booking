import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User, { type IUser } from "@/models/User";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

function isUserRole(role: string): role is IUser["role"] {
  return role === "user" || role === "operator" || role === "admin";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const status = searchParams.get("status");
    const requestedPage = Number(searchParams.get("page") || 1);
    const requestedLimit = Number(searchParams.get("limit") || 10);

    if (role && role !== "all" && !isUserRole(role)) {
      return NextResponse.json(
        { success: false, message: "Role filter is invalid" },
        { status: 400 }
      );
    }

    if (status && status !== "all" && status !== "active" && status !== "deactivated") {
      return NextResponse.json(
        { success: false, message: "Account status filter is invalid" },
        { status: 400 }
      );
    }

    const page = Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 10;

    const query: Record<string, unknown> = {};

    if (role && role !== "all" && isUserRole(role)) {
      query.role = role;
    }

    if (status === "active") {
      query.isActive = { $ne: false };
    } else if (status === "deactivated") {
      query.isActive = false;
    }

    const searchTerm = search?.trim();
    if (searchTerm) {
      const searchRegex = new RegExp(escapeRegex(searchTerm), "i");
      query.$or = [
        { name: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { role: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("name lastName email phone role isActive createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const safeUsers = users.map((user) => ({
      ...user,
      isActive: user.isActive !== false,
    }));

    return NextResponse.json({
      success: true,
      count: total,
      users: safeUsers,
      data: safeUsers,
      currentUserId: admin.userId,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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