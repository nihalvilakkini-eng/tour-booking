import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Booking, { type IBooking } from "@/models/Booking";
import Availability from "@/models/Availability";
import { createNotification } from "@/lib/notifications";
import { getRequestUser, type RequestUser } from "@/lib/request-user";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

type Manager = RequestUser;

function isBookingStatus(status: string): status is IBooking["status"] {
  return (
    status === "pending" ||
    status === "accepted" ||
    status === "confirmed" ||
    status === "rejected" ||
    status === "cancelled" ||
    status === "completed"
  );
}

async function getManagedTourIds(manager: Manager) {
  if (manager.role === "admin") {
    return Tour.distinct("_id");
  }

  return Tour.find({ operator: manager.userId }).distinct("_id");
}

// GET - Bookings for the authenticated operator's tours.
// Admins retain access to all bookings through this management endpoint.
export async function GET(request: NextRequest) {
  try {
    const requestUser = await getRequestUser(
      request.cookies.get("token")?.value
    );

    if (!requestUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    if (requestUser.role !== "operator" && requestUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Operator or admin access required",
        },
        { status: 403 }
      );
    }

    const manager = requestUser;

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
              "Status must be pending, accepted, confirmed, rejected, cancelled or completed",
          },
          { status: 400 }
        );
      }

      validatedStatus = status;
    }

    const tourIds = await getManagedTourIds(manager);

    const query: {
      tour: { $in: mongoose.Types.ObjectId[] };
      status?: IBooking["status"];
    } = {
      tour: { $in: tourIds },
    };

    if (validatedStatus) {
      query.status = validatedStatus;
    }

    const bookings = await Booking.find(query)
      .populate("user", "name lastName email phone")
      .populate(
        "tour",
        "title destination images price currency operator createdBy"
      )
      .populate(
        "availability",
        "date startTime endTime totalSeats availableSeats isAvailable"
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
        message: "Failed to fetch bookings",
      },
      { status: 500 }
    );
  }
}

// PATCH - Accept / reject / complete a booking owned by the operator.
export async function PATCH(request: NextRequest) {
  try {
    const requestUser = await getRequestUser(
      request.cookies.get("token")?.value
    );

    if (!requestUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    if (requestUser.role !== "operator" && requestUser.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Operator or admin access required",
        },
        { status: 403 }
      );
    }

    const manager = requestUser;

    await connectDB();

    const body = await request.json();
    const { bookingId, status, rejectionReason } = body;

    const allowedStatuses = ["accepted", "confirmed", "rejected", "completed"];

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

    const tour =
      manager.role === "operator"
        ? await Tour.findOne({
            _id: booking.tour,
            operator: manager.userId,
          })
        : await Tour.findById(booking.tour);

    if (!tour) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found or access denied",
        },
        { status: 404 }
      );
    }

    const isAcceptedStatus = status === "accepted" || status === "confirmed";
    const currentStatuses =
      status === "completed" ? ["accepted", "confirmed"] : ["pending"];

    if (!currentStatuses.includes(booking.status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            status === "completed"
              ? "Only accepted bookings can be completed"
              : "Only pending bookings can be processed",
        },
        { status: 400 }
      );
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: booking.status,
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

    if (status === "rejected") {
      const availability = await Availability.findByIdAndUpdate(
        booking.availability,
        {
          $inc: {
            availableSeats: booking.participants,
          },
          $set: {
            isAvailable: true,
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

    if (isAcceptedStatus) {
      await createNotification({
        user: booking.user,
        type: "booking_confirmed",
        title: "Booking Accepted",
        message: `Your booking for "${tour.title}" has been accepted. You can now proceed with payment.`,
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
      message: isAcceptedStatus
        ? "Booking accepted successfully"
        : `Booking ${status} successfully`,
      data: updatedBooking,
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
