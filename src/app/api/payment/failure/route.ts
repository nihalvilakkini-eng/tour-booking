import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

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
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";

    if (typeof bookingId !== "string" || !mongoose.isValidObjectId(bookingId)) {
      return NextResponse.json(
        { success: false, message: "A valid booking ID is required" },
        { status: 400 }
      );
    }

    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        user: user.userId,
        status: { $in: ["accepted", "confirmed"] },
        paymentStatus: { $ne: "paid" },
      },
      { $set: { paymentStatus: "failed" } },
      { new: true }
    );

    if (!booking) {
      const current = await Booking.findById(bookingId).lean();
      if (!current) {
        return NextResponse.json(
          { success: false, message: "Booking not found" },
          { status: 404 }
        );
      }
      if (current.user.toString() !== user.userId) {
        return NextResponse.json(
          { success: false, message: "You are not allowed to update this booking" },
          { status: 403 }
        );
      }
      if (String(current.paymentStatus || "").toLowerCase() === "paid") {
        return NextResponse.json(
          { success: true, message: "Booking payment status unchanged", data: current },
          { status: 200 }
        );
      }
      const statusLower = String(current.status || "").toLowerCase();
      if (!["accepted", "confirmed"].includes(statusLower)) {
        return NextResponse.json(
          { success: false, message: "Booking is not eligible for payment" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: true, message: "Booking payment status unchanged", data: current },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, message: reason || "Payment marked as failed", data: booking },
      { status: 200 }
    );
  } catch (error) {
    console.error("Mark payment failed error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update payment status" },
      { status: 500 }
    );
  }
}
