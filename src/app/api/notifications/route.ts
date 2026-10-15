import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
export const dynamic = "force-dynamic";

type JwtPayload = {
  userId: string;
  role: "user" | "operator" | "admin";
  email: string;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }

  return secret;
}

function getUserFromToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

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

    let user: JwtPayload;

    try {
      user = getUserFromToken(token);
    } catch {
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

    // Example:
    // /api/notifications?read=false
    if (read === "true") {
      filter.isRead = true;
    }

    if (read === "false") {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate("booking", "bookingDate startTime participants status")
      .populate("tour", "title destination")
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      user: user.userId,
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