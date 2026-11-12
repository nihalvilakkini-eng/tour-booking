import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getRequestUser } from "@/lib/request-user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: "Please login" }, { status: 401 });
    }

    const admin = await getRequestUser(token);
    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const { isActive } = await request.json();

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    // Admin സ്വന്തം അക്കൗണ്ട് deactivate ചെയ്യുന്നത് തടയാൻ
    if (admin.userId === id) {
      return NextResponse.json(
        { success: false, message: "You cannot deactivate your own admin account" },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Account ${isActive ? "activated" : "deactivated"} successfully`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    return NextResponse.json({ success: false, message: "Failed to update status" }, { status: 500 });
  }
}