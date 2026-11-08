import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Tour from "@/models/Tour";
import { createNotification } from "@/lib/notifications";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

function signaturesMatch(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = await getRequestUser(request.cookies.get("token")?.value);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const bookingId = body?.bookingId;
    const razorpayOrderId = body?.razorpay_order_id;
    const razorpayPaymentId = body?.razorpay_payment_id;
    const razorpaySignature = body?.razorpay_signature;

    if (
      typeof bookingId !== "string" ||
      !mongoose.isValidObjectId(bookingId) ||
      typeof razorpayOrderId !== "string" ||
      !razorpayOrderId ||
      typeof razorpayPaymentId !== "string" ||
      !razorpayPaymentId ||
      typeof razorpaySignature !== "string" ||
      !razorpaySignature
    ) {
      return NextResponse.json(
        { success: false, message: "Payment verification details are required" },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json(
        { success: false, message: "Razorpay is not configured" },
        { status: 503 }
      );
    }

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.user.toString() !== user.userId) {
      return NextResponse.json(
        { success: false, message: "You are not allowed to verify this booking" },
        { status: 403 }
      );
    }

    if (booking.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        { success: false, message: "Payment order does not belong to this booking" },
        { status: 400 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (!signaturesMatch(expectedSignature, razorpaySignature)) {
      return NextResponse.json(
        { success: false, message: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const updated = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        user: user.userId,
        razorpayOrderId,
        status: { $in: ["accepted", "confirmed"] },
        paymentStatus: { $ne: "paid" },
      },
      {
        $set: {
          status: "confirmed",
          paymentStatus: "paid",
          paidAt: new Date(),
          razorpayPaymentId,
        },
      },
      { new: true }
    );

    if (updated) {
      try {
        const tour = await Tour.findById(updated.tour).select("title").lean();
        const tourTitle = tour?.title || "your tour";
        await createNotification({
          user: updated.user,
          type: "booking_confirmed",
          title: "Payment Successful",
          message: `Your payment of ${updated.currency || "INR"} ${updated.totalAmount} for "${tourTitle}" was successful. Your booking is confirmed!`,
          booking: updated._id,
          tour: updated.tour,
        });
      } catch (notifyErr) {
        console.error("Payment notification error:", notifyErr);
      }

      return NextResponse.json(
        { success: true, message: "Payment verified successfully", data: updated },
        { status: 200 }
      );
    }

    const current = await Booking.findById(bookingId).lean();
    if (String(current?.paymentStatus || "").toLowerCase() === "paid") {
      return NextResponse.json(
        { success: true, message: "Payment already verified", data: current },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Payment could not be verified" },
      { status: 409 }
    );
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
