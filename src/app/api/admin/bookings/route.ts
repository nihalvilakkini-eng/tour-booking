import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

async function checkAdmin(request: NextRequest) {
  const user = await getRequestUser(request.cookies.get("token")?.value);
  return user?.role === "admin" ? user : null;
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