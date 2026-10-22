
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Tour from "@/models/Tour";
import Booking from "@/models/Booking";
import Review from "@/models/Review";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // 1. Check login cookie
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    // 2. Verify JWT
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is missing from .env.local");

      return NextResponse.json(
        { success: false, message: "Server authentication is not configured." },
        { status: 500 }
      );
    }

    let decoded: jwt.JwtPayload;

    try {
      const verified = jwt.verify(token, secret);

      if (typeof verified === "string") {
        return NextResponse.json(
          { success: false, message: "Invalid authentication token." },
          { status: 401 }
        );
      }

      decoded = verified;
    } catch {
      return NextResponse.json(
        { success: false, message: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    // 3. Only admins can access dashboard statistics
    if (decoded.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required." },
        { status: 403 }
      );
    }

    // 4. Connect to MongoDB
    await connectDB();

    // 5. Fetch statistics
    const [users, operators, tours, bookings, reviews] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        User.countDocuments({ role: "operator" }),
        Tour.countDocuments({}),
        Booking.countDocuments({}),
        Review.countDocuments({}),
      ]);

    // 6. Return JSON
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
