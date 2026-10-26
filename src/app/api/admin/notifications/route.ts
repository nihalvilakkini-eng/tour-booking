import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { getRequestUser } from "@/lib/request-user";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const admin = await getRequestUser(request.cookies.get("token")?.value);

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const read = searchParams.get("read");

    const query: Record<string, unknown> = {};

    if (read === "true") query.isRead = true;
    if (read === "false") query.isRead = false;

    const notifications = await Notification.find(query)
      .populate("user", "name lastName email")
      .populate("booking", "bookingDate status totalAmount")
      .populate("tour", "title destination")
      .sort({ createdAt: -1 })
      .lean();

    const unreadCount = await Notification.countDocuments({ isRead: false });

    return NextResponse.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
      data: notifications,
    });
  } catch (error) {
    console.error("Admin notifications GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notifications",
      },
      { status: 500 }
    );
  }
}
