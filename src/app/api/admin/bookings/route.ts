import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import Booking from "@/models/Booking";
export const dynamic = "force-dynamic";

type JwtPayload = {
  userId: string;
  role: "user" | "operator" | "admin";
};

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    if (decoded.role !== "admin") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate(
        "user",
        "firstName lastName email phone"
      )
      .populate(
        "tour",
        "title destination price currency"
      )
      .populate(
        "availability",
        "date startTime endTime totalSeats availableSeats"
      )
      .sort({ createdAt: -1 })
      .lean();

    let filteredBookings = bookings;

    type BookingSummary = {
      user?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
      } | null;
      tour?: {
        title?: string | null;
        destination?: string | null;
      } | null;
    };

    if (search) {
      const searchLower = search.toLowerCase();

      filteredBookings = bookings.filter((booking) => {
        const bookingSummary = booking as unknown as BookingSummary;
        const userName = `${bookingSummary.user?.firstName || ""} ${
          bookingSummary.user?.lastName || ""
        }`.toLowerCase();

        const userEmail =
          bookingSummary.user?.email?.toLowerCase() || "";

        const tourTitle =
          bookingSummary.tour?.title?.toLowerCase() || "";

        const destination =
          bookingSummary.tour?.destination?.toLowerCase() || "";

        return (
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          tourTitle.includes(searchLower) ||
          destination.includes(searchLower)
        );
      });
    }

    return NextResponse.json({
      success: true,
      count: filteredBookings.length,
      data: filteredBookings,
    });
  } catch (error) {
    console.error("ADMIN BOOKINGS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch bookings",
      },
      { status: 500 }
    );
  }
}