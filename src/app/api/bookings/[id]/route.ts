import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { createNotification } from "@/lib/notifications";
import Availability from "@/models/Availability";
import Tour from "@/models/Tour";
export const dynamic = "force-dynamic";

type JwtPayload = {
  userId: string;
  role: "user" | "operator" | "admin";
  email: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }

  return secret;
}

function getUserFromToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

// =========================
// GET - Get Single Booking
// =========================
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    let user: JwtPayload;

    try {
      user = getUserFromToken(token);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const booking = await Booking.findById(id)
      .populate("user", "name lastName email phone")
      .populate(
        "tour",
        "title description destination activityType price currency duration durationUnit"
      )
      .populate(
        "availability",
        "date startTime endTime totalSeats availableSeats isAvailable"
      );

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    // User can see only own booking
    if (
      user.role === "user" &&
      booking.user._id.toString() !== user.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to view this booking",
        },
        { status: 403 }
      );
    }

    // Operator can see booking only for their own tour
    if (user.role === "operator") {
      const tour = await Tour.findOne({
        _id: booking.tour._id,
        operator: user.userId,
      });

      if (!tour) {
        return NextResponse.json(
          {
            success: false,
            message: "You are not allowed to view this booking",
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: booking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get booking error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch booking",
      },
      { status: 500 }
    );
  }
}

// =========================
// PATCH - Update Booking
// =========================
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    let user: JwtPayload;

    try {
      user = getUserFromToken(token);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const body = await request.json();
    const { status } = body;

    const allowedStatuses = [
      "confirmed",
      "rejected",
      "cancelled",
      "completed",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid status. Use confirmed, rejected, cancelled or completed",
        },
        { status: 400 }
      );
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    // =========================
    // USER
    // =========================

    if (user.role === "user") {
      // User can modify only own booking
      if (booking.user.toString() !== user.userId) {
        return NextResponse.json(
          {
            success: false,
            message: "You are not allowed to modify this booking",
          },
          { status: 403 }
        );
      }

      // User can only cancel
      if (status !== "cancelled") {
        return NextResponse.json(
          {
            success: false,
            message: "User can only cancel a booking",
          },
          { status: 403 }
        );
      }

      // Cannot cancel already completed/rejected/cancelled booking
      if (
        booking.status === "completed" ||
        booking.status === "rejected" ||
        booking.status === "cancelled"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Booking cannot be cancelled because it is already ${booking.status}`,
          },
          { status: 400 }
        );
      }
    }

    // =========================
    // OPERATOR
    // =========================

    if (user.role === "operator") {
      const tour = await Tour.findOne({
        _id: booking.tour,
        operator: user.userId,
      });

      if (!tour) {
        return NextResponse.json(
          {
            success: false,
            message: "You are not allowed to modify this booking",
          },
          { status: 403 }
        );
      }

      // Operator can confirm/reject
      if (status === "cancelled") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Operator cannot cancel a booking. User can cancel the booking.",
          },
          { status: 403 }
        );
      }

      if (status === "confirmed" && booking.status !== "pending") {
        return NextResponse.json(
          {
            success: false,
            message: "Only pending bookings can be confirmed",
          },
          { status: 400 }
        );
      }

      if (status === "rejected" && booking.status !== "pending") {
        return NextResponse.json(
          {
            success: false,
            message: "Only pending bookings can be rejected",
          },
          { status: 400 }
        );
      }

      if (status === "completed" && booking.status !== "confirmed") {
        return NextResponse.json(
          {
            success: false,
            message: "Only confirmed bookings can be completed",
          },
          { status: 400 }
        );
      }
    }

    // =========================
    // ADMIN
    // =========================

    if (user.role === "admin") {
      // Admin can manage booking
    }

    const previousStatus = booking.status;

    // If booking is being rejected/cancelled,
    // return seats back to availability.
    const shouldRestoreSeats =
      (status === "rejected" || status === "cancelled") &&
      (previousStatus === "pending" ||
        previousStatus === "confirmed");

    if (shouldRestoreSeats) {
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

// =========================
// Create notification
// =========================

if (status === "confirmed") {
  await createNotification({
    user: booking.user,
    type: "booking_confirmed",
    title: "Booking Confirmed",
    message: `Your booking for "${booking.tour}" has been confirmed.`,
    booking: booking._id,
    tour: booking.tour,
  });
}

if (status === "rejected") {
  await createNotification({
    user: booking.user,
    type: "booking_rejected",
    title: "Booking Rejected",
    message: `Your booking request has been rejected.`,
    booking: booking._id,
    tour: booking.tour,
  });
}

if (status === "cancelled") {
  await createNotification({
    user: booking.user,
    type: "booking_cancelled",
    title: "Booking Cancelled",
    message: `Your booking has been cancelled.`,
    booking: booking._id,
    tour: booking.tour,
  });
}

if (status === "completed") {
  await createNotification({
    user: booking.user,
    type: "booking_completed",
    title: "Booking Completed",
    message: `Your tour booking has been completed. You can now leave a review.`,
    booking: booking._id,
    tour: booking.tour,
  });
}

    return NextResponse.json(
      {
        success: true,
        message: `Booking ${status} successfully`,
        data: booking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update booking error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update booking",
      },
      { status: 500 }
    );
  }
}

// =========================
// DELETE - Cancel Booking
// =========================
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login",
        },
        { status: 401 }
      );
    }

    let user: JwtPayload;

    try {
      user = getUserFromToken(token);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 }
      );
    }

    // Only booking owner can cancel using DELETE
    if (
      user.role === "user" &&
      booking.user.toString() !== user.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to cancel this booking",
        },
        { status: 403 }
      );
    }

    // Operator can cancel only their tour booking
    if (user.role === "operator") {
      const tour = await Tour.findOne({
        _id: booking.tour,
        operator: user.userId,
      });

      if (!tour) {
        return NextResponse.json(
          {
            success: false,
            message: "You are not allowed to cancel this booking",
          },
          { status: 403 }
        );
      }
    }

    if (
      booking.status === "cancelled" ||
      booking.status === "rejected" ||
      booking.status === "completed"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Booking is already ${booking.status}`,
        },
        { status: 400 }
      );
    }

    // Return seats
    if (
      booking.status === "pending" ||
      booking.status === "confirmed"
    ) {
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

    booking.status = "cancelled";
    await booking.save();

     await createNotification({
  user: booking.user,
  type: "booking_cancelled",
  title: "Booking Cancelled",
  message: "Your booking has been cancelled successfully.",
  booking: booking._id,
  tour: booking.tour,
});

    return NextResponse.json(
      {
        success: true,
        message: "Booking cancelled successfully",
        data: booking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cancel booking error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to cancel booking",
      },
      { status: 500 }
    );
  }
}