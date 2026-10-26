
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
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    await connectDB();

    const [users, operators, tours, bookings, reviews] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "operator" }),
        Tour.countDocuments({}),
        Booking.countDocuments({}),
        Review.countDocuments({}),
      ]);

    return NextResponse.json({
      success: true,
      stats: {
        users,
        operators,
        tours,
        bookings,
        reviews,
      },
    });
  } catch (error) {
    console.error("Admin stats API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load admin dashboard statistics.",
      },
      { status: 500 }
    );
  }
}
