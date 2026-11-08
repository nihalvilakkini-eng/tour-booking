import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

const SUPPORTED_CURRENCIES = new Set(["INR", "USD", "EUR", "GBP", "AED"]);

function toSmallestUnit(amount: number) {
  return Math.round(amount * 100);
}

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured");
  }

  return {
    keyId,
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
  };
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

    if (typeof bookingId !== "string" || !mongoose.isValidObjectId(bookingId)) {
      return NextResponse.json(
        { success: false, message: "A valid booking ID is required" },
        { status: 400 }
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
        { success: false, message: "You are not allowed to pay for this booking" },
        { status: 403 }
      );
    }

    const status = String(booking.status || "").trim().toLowerCase();
    const paymentStatus = String(booking.paymentStatus || "unpaid").trim().toLowerCase();

    if (["cancelled", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "This booking cannot be paid" },
        { status: 400 }
      );
    }

    if (paymentStatus === "paid") {
      return NextResponse.json(
        { success: false, message: "This booking is already paid" },
        { status: 409 }
      );
    }

    if (paymentStatus === "refunded") {
      return NextResponse.json(
        { success: false, message: "This booking payment was refunded" },
        { status: 409 }
      );
    }

    // Both "accepted" and "confirmed" indicate operator approval allowing payment
    if (!["accepted", "confirmed"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Booking must be accepted before payment" },
        { status: 400 }
      );
    }

    const amount = Number(booking.totalAmount);
    const currency = String(booking.currency || "INR").toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Booking amount is invalid" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_CURRENCIES.has(currency)) {
      return NextResponse.json(
        { success: false, message: `Payments are not supported for ${currency}` },
        { status: 400 }
      );
    }

    const { keyId, client } = getRazorpayClient();

    const order = await client.orders.create({
      amount: toSmallestUnit(amount),
      currency,
      receipt: `booking_${bookingId}`.slice(0, 40),
      notes: {
        bookingId,
        userId: user.userId,
      },
    });

    await Booking.findByIdAndUpdate(bookingId, {
      $set: {
        razorpayOrderId: order.id,
        paymentStatus: "pending",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          bookingId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    const message =
      error instanceof Error && error.message === "Razorpay is not configured"
        ? "Razorpay is not configured"
        : "Failed to create payment order";

    return NextResponse.json(
      { success: false, message },
      { status: message === "Razorpay is not configured" ? 503 : 500 }
    );
  }
}
