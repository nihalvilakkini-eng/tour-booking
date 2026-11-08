import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

// =========================
// GET - Notification Listing
// =========================

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    const user = await getRequestUser(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const read = searchParams.get("read");

    const filter: Record<string, unknown> = {
      user: user.userId,
    };

    if (user.role === "operator") {
      filter.type = "booking_created";
    }

    // Example:
    // /api/notifications?read=false
    if (read === "true") {
      filter.isRead = true;
    }

    if (read === "false") {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate(
        "booking",
        "customerName customerEmail customerPhone bookingDate startTime participants status"
      )
      .populate("tour", "title destination images")
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      user: user.userId,
      ...(user.role === "operator" ? { type: "booking_created" } : {}),
      isRead: false,
    });

    return NextResponse.json(
      {
        success: true,
        count: notifications.length,
        unreadCount,
        data: notifications,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get notifications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notifications",
      },
      { status: 500 }
    );
  }
}

// =========================
// PATCH - Mark All Notifications As Read
// =========================
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please login" },
        { status: 401 }
      );
    }

    const user = await getRequestUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const filter: Record<string, unknown> = {
      user: user.userId,
      isRead: false,
    };

    if (user.role === "operator") {
      filter.type = "booking_created";
    }

    const result = await Notification.updateMany(filter, {
      $set: { isRead: true },
    });

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark all notifications error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}