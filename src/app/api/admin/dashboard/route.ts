import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Tour from "@/models/Tour";
import Booking from "@/models/Booking";
import Review from "@/models/Review";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request.cookies.get("token")?.value);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Only admins can access this dashboard" },
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
      totalReviews,
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

      Review.countDocuments(),

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
        totalReviews,
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