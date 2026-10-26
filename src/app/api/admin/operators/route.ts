import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

async function checkAdmin(request: NextRequest) {
  const user = await getRequestUser(request.cookies.get("token")?.value);
  return user?.role === "admin" ? user : null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin(request);

    if (!admin) {
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
    };

    if (search) {
      query.$or = [
        {
          firstName: {
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