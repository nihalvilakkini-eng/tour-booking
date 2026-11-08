import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestUser = await getRequestUser(
      request.cookies.get("token")?.value
    );

    if (!requestUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    if (requestUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const query: Record<string, unknown> = {
      role: "operator",
      isActive: { $ne: false },
    };

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

    const operators = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: operators.length,
      data: operators,
    });
  } catch (error) {
    console.error("ADMIN OPERATORS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch operators",
      },
      { status: 500 }
    );
  }
}