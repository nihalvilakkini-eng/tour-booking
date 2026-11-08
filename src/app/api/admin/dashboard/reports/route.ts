import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Tour from "@/models/Tour";
import Booking from "@/models/Booking";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(
      request.cookies.get("token")?.value
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const range = request.nextUrl.searchParams.get("range") || "30d";
    const now = new Date();
    const startDate = new Date(now);

    if (range === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    } else if (range === "year") {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid date range" },
        { status: 400 }
      );
    }

    const dateFilter = {
      createdAt: { $gte: startDate, $lte: now },
    };

    const [
      totalUsers,
      totalTours,
      totalBookings,
      completedBookings,
      pendingBookings,
      confirmedBookings,
      rejectedBookings,
      cancelledBookings,
      revenueResult,
      monthlyResult,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),

      Tour.countDocuments(),

      Booking.countDocuments(dateFilter),

      Booking.countDocuments({
        ...dateFilter,
        status: "completed",
      }),

      Booking.countDocuments({
        ...dateFilter,
        status: "pending",
      }),

      Booking.countDocuments({
        ...dateFilter,
        status: { $in: ["accepted", "confirmed"] },
      }),

      Booking.countDocuments({
        ...dateFilter,
        status: "rejected",
      }),

      Booking.countDocuments({
        ...dateFilter,
        status: "cancelled",
      }),

      Booking.aggregate([
        {
          $match: {
            ...dateFilter,
            paymentStatus: "paid",
            status: { $nin: ["cancelled", "rejected"] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
          },
        },
      ]),

      Booking.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(
                now.getFullYear(),
                now.getMonth() - 5,
                1
              ),
              $lte: now,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m",
                date: "$createdAt",
              },
            },
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const monthlyBookings = Array.from(
      { length: 6 },
      (_, index) => {
        const date = new Date(
          now.getFullYear(),
          now.getMonth() - 5 + index,
          1
        );

        const key = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`;

        const found = monthlyResult.find(
          (item) => item._id === key
        );

        return {
          month: date.toLocaleString("en-US", {
            month: "short",
          }),
          total: found?.total ?? 0,
        };
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalTours,
        totalBookings,
        completedBookings,
        pendingBookings,
        confirmedBookings,
        rejectedBookings,
        cancelledBookings,
        totalRevenue: revenueResult[0]?.total ?? 0,
        monthlyBookings,
        dateRange: range,
      },
    });
  } catch (error) {
    console.error("Admin reports API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load reports",
      },
      { status: 500 }
    );
  }
}