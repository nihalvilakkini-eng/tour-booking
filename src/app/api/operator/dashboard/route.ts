import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Booking from "@/models/Booking";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request.cookies.get("token")?.value);
    if (!user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "operator") {
      return NextResponse.json(
        { message: "Only operators can access this dashboard" },
        { status: 403 }
      );
    }

    await connectDB();

    const operatorId = user.userId;

    const [
      totalTours,
      activeTours,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      recentBookings,
    ] = await Promise.all([
      Tour.countDocuments({
        operator: operatorId,
      }),

      Tour.countDocuments({
        operator: operatorId,
        isActive: true,
      }),

      Booking.countDocuments({
        tour: {
          $in: await Tour.find({
            operator: operatorId,
          }).distinct("_id"),
        },
      }),

      Booking.countDocuments({
        tour: {
          $in: await Tour.find({
            operator: operatorId,
          }).distinct("_id"),
        },
        status: "pending",
      }),

      Booking.countDocuments({
        tour: {
          $in: await Tour.find({
            operator: operatorId,
          }).distinct("_id"),
        },
        status: "confirmed",
      }),

      Booking.countDocuments({
        tour: {
          $in: await Tour.find({
            operator: operatorId,
          }).distinct("_id"),
        },
        status: "completed",
      }),

      Booking.find({
        tour: {
          $in: await Tour.find({
            operator: operatorId,
          }).distinct("_id"),
        },
      })
        .populate("user", "firstName lastName email")
        .populate("tour", "title destination")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalTours,
          activeTours,
          totalBookings,
          pendingBookings,
          confirmedBookings,
          completedBookings,
          recentBookings,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Operator dashboard error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load operator dashboard",
      },
      { status: 500 }
    );
  }
}