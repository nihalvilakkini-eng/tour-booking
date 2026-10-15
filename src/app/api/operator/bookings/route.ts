import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Booking, { type IBooking } from "@/models/Booking";
import Availability from "@/models/Availability";
import { createNotification } from "@/lib/notifications";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;

function getOperatorId(request: NextRequest) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, JWT_SECRET) as {
    userId: string;
    role: string;
  };

  if (decoded.role !== "operator") {
    return null;
  }

  return decoded.userId;
}

function isBookingStatus(status: string): status is IBooking["status"] {
  return (
    status === "pending" ||
    status === "confirmed" ||
    status === "rejected" ||
    status === "cancelled" ||
    status === "completed"
  );
}

// GET - Operator's bookings
export async function GET(request: NextRequest) {
  try {
    const operatorId = getOperatorId(request);

    if (!operatorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Operator authentication required",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    let validatedStatus: IBooking["status"] | undefined;

    if (status !== null) {
      if (!isBookingStatus(status)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Status must be pending, confirmed, rejected, cancelled or completed",
          },
          { status: 400 }
        );
      }

      validatedStatus = status;
    }

    const tours = await Tour.find({
      operator: operatorId,
    }).select("_id");

    const tourIds = tours.map((tour) => tour._id);

    const query: {
      tour: { $in: typeof tourIds };
      status?: IBooking["status"];
    } = {
      tour: { $in: tourIds },
    };

    if (validatedStatus) {
      query.status = validatedStatus;
    }

    const bookings = await Booking.find(query)
      .populate("user", "firstName lastName email phone")
      .populate("tour", "title destination price currency")
      .populate(
        "availability",
        "date startTime endTime totalSeats availableSeats"
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Operator bookings GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch operator bookings",
      },
      { status: 500 }
    );
  }
}

// PATCH - Confirm / Reject / Complete booking
export async function PATCH(request: NextRequest) {
  try {
    const operatorId = getOperatorId(request);

    if (!operatorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Operator authentication required",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const { bookingId, status } = body;

    const allowedStatuses = [
      "confirmed",
      "rejected",
      "completed",
    ];

    if (!bookingId || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID and status are required",
        },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Status must be confirmed, rejected or completed",
        },
        { status: 400 }
      );
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    const tour = await Tour.findOne({
      _id: booking.tour,
      operator: operatorId,
    });

    if (!tour) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to manage this booking",
        },
        { status: 403 }
      );
    }

    // Confirm only pending bookings
    if (status === "confirmed") {
      if (booking.status !== "pending") {
        return NextResponse.json(
          {
            success: false,
            message: "Only pending bookings can be confirmed",
          },
          { status: 400 }
        );
      }
    }

    // Reject only pending bookings
    if (status === "rejected") {
      if (booking.status !== "pending") {
        return NextResponse.json(
          {
            success: false,
            message: "Only pending bookings can be rejected",
          },
          { status: 400 }
        );
      }
    }

    // Complete only confirmed bookings
    if (status === "completed") {
      if (booking.status !== "confirmed") {
        return NextResponse.json(
          {
            success: false,
            message: "Only confirmed bookings can be completed",
          },
          { status: 400 }
        );
      }
    }

    // If rejected, return reserved seats
    if (status === "rejected") {
      await Availability.findByIdAndUpdate(
        booking.availability,
        {
          $inc: {
            availableSeats: booking.participants,
          },
          $set: {
            isAvailable: true,
          },
        }
      );
    }

    booking.status = status;
    await booking.save();

    if (status === "confirmed") {
      await createNotification({
        user: booking.user,
        type: "booking_confirmed",
        title: "Booking Confirmed",
        message: `Your booking for "${tour.title}" has been confirmed.`,
        booking: booking._id,
        tour: tour._id,
      });
    }

    if (status === "rejected") {
      await createNotification({
        user: booking.user,
        type: "booking_rejected",
        title: "Booking Rejected",
        message: `Your booking request for "${tour.title}" has been rejected.`,
        booking: booking._id,
        tour: tour._id,
      });
    }

    if (status === "completed") {
      await createNotification({
        user: booking.user,
        type: "booking_completed",
        title: "Booking Completed",
        message: `Your tour "${tour.title}" has been completed. You can now leave a review.`,
        booking: booking._id,
        tour: tour._id,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${status} successfully`,
      data: booking,
    });
  } catch (error) {
    console.error("Operator bookings PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update booking",
      },
      { status: 500 }
    );
  }
}