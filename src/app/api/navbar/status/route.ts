
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Booking from "@/models/Booking";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is missing");
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.userId).select(
      "_id role isActive"
    );

    if (!user || user.isActive === false) {
      return NextResponse.json(
        { success: false, message: "User not found or inactive" },
        { status: 401 }
      );
    }

    if (user.role !== "user") {
      return NextResponse.json({
        success: true,
        data: {
          hasBooking: false,
          unreadNotifications: 0,
        },
      });
    }

    const hasBooking = await Booking.exists({
      user: user._id,
      status: {
        $nin: ["rejected", "cancelled"],
      },
    });

    const unreadNotifications = hasBooking
      ? await Notification.countDocuments({
          user: user._id,
          isRead: false,
        })
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        hasBooking: Boolean(hasBooking),
        unreadNotifications,
      },
    });
  } catch (error) {
    console.error("Navbar status error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch navbar status" },
      { status: 500 }
    );
  }
}
