import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Availability from "@/models/Availability";
import Tour from "@/models/Tour";
import { getRequestUser, getTokenFromRequest } from "@/lib/request-user";
import { createNotification } from "@/lib/notifications";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please log in to cancel a booking." },
        { status: 401 }
      );
    }

    const authUser = await getRequestUser(token);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired session. Please log in again." },
        { status: 401 }
      );
    }

    const { id: bookingId } = await params;
    if (!mongoose.isValidObjectId(bookingId)) {
      return NextResponse.json(
        { success: false, message: "A valid booking ID is required." },
        { status: 400 }
      );
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found." },
        { status: 404 }
      );
    }

    // Customer can only cancel their own booking. Admin can cancel any booking.
    if (authUser.role === "user" && booking.user.toString() !== authUser.userId) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to cancel this booking." },
        { status: 403 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { success: false, message: "This booking is already cancelled." },
        { status: 400 }
      );
    }

    if (booking.status === "completed" || booking.status === "rejected") {
      return NextResponse.json(
        { success: false, message: `Cannot cancel a ${booking.status} booking.` },
        { status: 400 }
      );
    }

    // 48-hour cancellation policy check
    const tourDate = new Date(booking.bookingDate);
    const tourDateStr = !Number.isNaN(tourDate.getTime())
      ? tourDate.toISOString().split("T")[0]
      : "";
    const startTimeStr = booking.startTime || "09:00";
    const tourDateTime = new Date(`${tourDateStr}T${startTimeStr}:00`);
    const now = new Date();

    if (!Number.isNaN(tourDateTime.getTime())) {
      const hoursDifference =
        (tourDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const CANCELLATION_LIMIT_HOURS = 48;
      // Admin bypasses 48-hour limit; customers must adhere to policy
      if (authUser.role === "user" && hoursDifference < CANCELLATION_LIMIT_HOURS) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cancellation window closed (less than 48 hours remaining). Please contact Wayora support for assistance.",
          },
          { status: 400 }
        );
      }
    }

    let refundDetails: unknown = null;

    if (booking.paymentStatus === "paid" && booking.razorpayPaymentId) {
      const razorpay = getRazorpayClient();
      if (!razorpay) {
        console.warn("Razorpay credentials not found during refund process.");
      } else {
        try {
          const refund = await razorpay.payments.refund(booking.razorpayPaymentId, {
            amount: Math.round(booking.totalAmount * 100),
            speed: "optimum",
            notes: {
              reason: "User requested cancellation within allowed time window",
              bookingId: booking._id.toString(),
            },
          });
          refundDetails = refund;
          booking.paymentStatus = "refunded";
        } catch (razorpayErr: unknown) {
          console.error("Razorpay Refund Error:", razorpayErr);
          return NextResponse.json(
            {
              success: false,
              message:
                "Failed to process refund through payment gateway. Please contact Wayora support.",
            },
            { status: 500 }
          );
        }
      }
    } else {
      booking.paymentStatus =
        booking.paymentStatus === "paid" ? "refunded" : "unpaid";
    }

    booking.status = "cancelled";
    await booking.save();

    // Correctly restore available seats and set isAvailable to true
    if (booking.availability) {
      await Availability.findByIdAndUpdate(booking.availability, {
        $inc: { availableSeats: booking.participants },
        $set: { isAvailable: true },
      });
    }

    // Send notifications to user and operator
    try {
      const tour = await Tour.findById(booking.tour).select("title operator").lean();
      const tourTitle = tour?.title || "your tour";

      await createNotification({
        user: booking.user,
        type: "booking_cancelled",
        title: "Booking Cancelled",
        message: `Your booking for "${tourTitle}" has been cancelled${
          booking.paymentStatus === "refunded" ? " and your refund has been initiated" : ""
        }.`,
        booking: booking._id,
        tour: booking.tour,
      });

      if (tour?.operator) {
        await createNotification({
          user: tour.operator,
          type: "booking_cancelled",
          title: "Booking Cancelled by Customer",
          message: `Booking for "${tourTitle}" with ${booking.participants} participant(s) was cancelled.`,
          booking: booking._id,
          tour: booking.tour,
        });
      }
    } catch (notifErr) {
      console.error("Cancellation notification error:", notifErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Booking cancelled successfully and refund initiated.",
        booking,
        refund: refundDetails,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Cancellation Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
