import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { getRequestUser } from "@/lib/request-user";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "A valid notification ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const notification = await Notification.findById(id)
      .populate("user", "name lastName email")
      .populate("booking", "bookingDate status totalAmount")
      .populate("tour", "title destination")
      .lean();

    if (!notification) {
      return NextResponse.json(
        { success: false, message: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("Admin notification GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notification",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "A valid notification ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "A valid JSON body is required" },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("isRead" in body) ||
      typeof (body as { isRead?: unknown }).isRead !== "boolean"
    ) {
      return NextResponse.json(
        { success: false, message: "isRead must be a boolean value" },
        { status: 400 }
      );
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: (body as { isRead: boolean }).isRead },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { success: false, message: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: (body as { isRead: boolean }).isRead
        ? "Notification marked as read"
        : "Notification marked as unread",
      data: notification,
    });
  } catch (error) {
    console.error("Admin notification PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update notification",
      },
      { status: 500 }
    );
  }
}
