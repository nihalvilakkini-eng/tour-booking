import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// =========================
// GET - Single Notification
// =========================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;

    const notification = await Notification.findOne({
      _id: id,
      user: user.userId,
    })
      .populate(
        "booking",
        "bookingDate startTime participants status"
      )
      .populate("tour", "title destination");

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: notification,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get notification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notification",
      },
      { status: 500 }
    );
  }
}

// =========================
// PATCH - Mark Read / Unread
// =========================

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;

    const body = await request.json();

    const { isRead } = body;

    if (typeof isRead !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "isRead must be true or false",
        },
        { status: 400 }
      );
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: user.userId,
      },
      {
        isRead,
      },
      {
        new: true,
      }
    );

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: isRead
          ? "Notification marked as read"
          : "Notification marked as unread",
        data: notification,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update notification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update notification",
      },
      { status: 500 }
    );
  }
}

// =========================
// DELETE - Delete Notification
// =========================

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
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

    const { id } = await context.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: user.userId,
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          message: "Notification not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Notification deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete notification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete notification",
      },
      { status: 500 }
    );
  }
}