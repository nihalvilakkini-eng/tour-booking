import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Tour from "@/models/Tour";
import Booking from "@/models/Booking";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json(
        {
          success: false,
          message: "JWT_SECRET is not configured",
        },
        { status: 500 }
      );
    }

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };

    if (decoded.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only admins can access this dashboard",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const [
      totalUsers,
      totalOperators,
      totalTours,
      activeTours,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      recentBookings,
    ] = await Promise.all([
      User.countDocuments({
        role: "user",
      }),

      User.countDocuments({
        role: "operator",
      }),

      Tour.countDocuments(),

      Tour.countDocuments({
        isActive: true,
      }),

      Booking.countDocuments(),

      Booking.countDocuments({
        status: "pending",
      }),

      Booking.countDocuments({
        status: "confirmed",
      }),

      Booking.countDocuments({
        status: "completed",
      }),

      Booking.find()
        .populate("user", "firstName lastName email")
        .populate("tour", "title destination")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalOperators,
        totalTours,
        activeTours,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        recentBookings,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load admin dashboard",
      },
      { status: 500 }
    );
  }
}