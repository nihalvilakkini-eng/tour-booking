import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Booking from "@/models/Booking";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json(
        { message: "JWT_SECRET is not configured" },
        { status: 500 }
      );
    }

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };

    if (decoded.role !== "operator") {
      return NextResponse.json(
        { message: "Only operators can access this dashboard" },
        { status: 403 }
      );
    }

    await connectDB();

    const operatorId = decoded.userId;

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