
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Booking, { type IBooking } from "@/models/Booking";
import Availability from "@/models/Availability";
import { createNotification } from "@/lib/notifications";
import { getRequestUser } from "@/lib/request-user";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// Allow both operators and admins to manage all bookings
async function getManager(request: NextRequest) {
  const user = await getRequestUser(
    request.cookies.get("token")?.value
  );

  if (
    !user ||
    (user.role !== "operator" && user.role !== "admin")
  ) {
    return null;
  }

  return user;
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

// GET - Fetch bookings for ALL tours
export async function GET(request: NextRequest) {
  try {
    const manager = await getManager(request);

    if (!manager) {
      return NextResponse.json(
        {
          success: false,
          message: "Operator or admin authentication required",
        },
        { status: 403 }
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

    // Get IDs of every tour, regardless of creator
    const tourIds = await Tour.distinct("_id");

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
      .populate("user", "name lastName email phone")
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
    console.error("Bookings GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch bookings",
      },
      { status: 500 }
    );
  }
}

// PATCH - Confirm / Reject / Complete booking
export async function PATCH(request: NextRequest) {
  try {
    const manager = await getManager(request);

    if (!manager) {
      return NextResponse.json(
        {
          success: false,
          message: "Operator or admin authentication required",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { bookingId, status, rejectionReason } = body;

    const allowedStatuses = ["confirmed", "rejected", "completed"];

    if (!bookingId || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID and status are required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(bookingId)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking ID" },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking status" },
        { status: 400 }
      );
    }

    if (
      status === "rejected" &&
      (!rejectionReason || !rejectionReason.trim())
    ) {
      return NextResponse.json(
        { success: false, message: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    // Both operator and admin can manage bookings for every tour
    const tour = await Tour.findById(booking.tour);

    if (!tour) {
      return NextResponse.json(
        { success: false, message: "Tour not found" },
        { status: 404 }
      );
    }

    const requiredStatus =
      status === "completed" ? "confirmed" : "pending";

    if (booking.status !== requiredStatus) {
      return NextResponse.json(
        {
          success: false,
          message:
            status === "completed"
              ? "Only confirmed bookings can be completed"
              : "Only pending bookings can be processed",
        },
        { status: 400 }
      );
    }

    // Prevent duplicate processing
    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: requiredStatus,
      },
      {
        $set: {
          status,
          ...(status === "rejected"
            ? { rejectionReason: rejectionReason.trim() }
            : {}),
        },
      },
      { new: true }
    );

    if (!updatedBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking has already been processed",
        },
        { status: 409 }
      );
    }

    // Restore reserved seats when booking is rejected
    if (status === "rejected") {
      const availability = await Availability.findByIdAndUpdate(
        booking.availability,
        {
          $inc: {
            availableSeats: booking.participants,
          },
        },
        { new: true }
      );

      if (!availability) {
        console.error(
          "Availability not found while restoring rejected booking seats:",
          booking._id
        );
      }
    }

    if (status === "confirmed") {
      await createNotification({
        user: booking.user,
        type: "booking_confirmed",
        title: "Booking Confirmed",
        message: `Your booking for "${tour.title}" has been confirmed. You can now proceed with payment.`,
        booking: booking._id,
        tour: tour._id,
      });
    }

    if (status === "rejected") {
      await createNotification({
        user: booking.user,
        type: "booking_rejected",
        title: "Booking Rejected",
        message: `Your booking for "${tour.title}" has been rejected. Reason: ${rejectionReason.trim()}`,
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
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Bookings PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update booking",
      },
      { status: 500 }
    );
  }
}
