import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Review from "@/models/Review";
import Tour from "@/models/Tour";
import { getRequestUser } from "@/lib/request-user";
import { isBookingCompleted } from "@/lib/booking-status";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request.cookies.get("token")?.value);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please login to write a review" },
        { status: 401 }
      );
    }

    if (user.role !== "user") {
      return NextResponse.json(
        { success: false, message: "Only customers can submit reviews" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "A valid review is required" },
        { status: 400 }
      );
    }

    const { bookingId, rating, comment } = body as {
      bookingId?: unknown;
      rating?: unknown;
      comment?: unknown;
    };

    if (
      typeof bookingId !== "string" ||
      !mongoose.isValidObjectId(bookingId)
    ) {
      return NextResponse.json(
        { success: false, message: "A valid booking ID is required" },
        { status: 400 }
      );
    }

    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return NextResponse.json(
        { success: false, message: "Rating must be a whole number from 1 to 5" },
        { status: 400 }
      );
    }

    if (typeof comment !== "string" || !comment.trim()) {
      return NextResponse.json(
        { success: false, message: "Review comment is required" },
        { status: 400 }
      );
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length > 1000) {
      return NextResponse.json(
        { success: false, message: "Review comment cannot exceed 1000 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.user.toString() !== user.userId) {
      return NextResponse.json(
        { success: false, message: "You can only review your own booking" },
        { status: 403 }
      );
    }

    if (!isBookingCompleted(booking.status)) {
      return NextResponse.json(
        { success: false, message: "You can review this tour after it is completed" },
        { status: 403 }
      );
    }

    if (await Review.exists({ booking: booking._id })) {
      return NextResponse.json(
        { success: false, message: "You have already reviewed this booking" },
        { status: 409 }
      );
    }

    const tourExists = await Tour.exists({ _id: booking.tour });
    if (!tourExists) {
      return NextResponse.json(
        { success: false, message: "The tour for this booking could not be found" },
        { status: 404 }
      );
    }

    let review;
    try {
      review = await Review.create({
        user: user.userId,
        tour: booking.tour,
        booking: booking._id,
        rating,
        comment: trimmedComment,
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        return NextResponse.json(
          { success: false, message: "You have already reviewed this booking" },
          { status: 409 }
        );
      }
      throw error;
    }

    const [ratingSummary] = await Review.aggregate<{
      averageRating: number;
      reviewCount: number;
    }>([
      { $match: { tour: booking.tour } },
      {
        $group: {
          _id: "$tour",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    if (!ratingSummary) {
      throw new Error("Review rating summary was not available after creation");
    }

    const updatedTour = await Tour.findByIdAndUpdate(
      booking.tour,
      {
        $set: {
          rating: Number(ratingSummary.averageRating.toFixed(1)),
          reviewCount: ratingSummary.reviewCount,
        },
      },
      { new: true }
    );

    if (!updatedTour) {
      throw new Error("Tour rating could not be updated after review creation");
    }

    const populatedReview = await Review.findById(review._id)
      .populate("user", "name lastName")
      .populate("tour", "title destination")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Review submitted successfully. Thank you for sharing your experience!",
        data: populatedReview,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create review" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get("tourId");
    const userId = searchParams.get("userId");
    const bookingId = searchParams.get("bookingId");
    const filter: Record<string, mongoose.Types.ObjectId> = {};

    for (const [label, value] of [
      ["Tour ID", tourId],
      ["User ID", userId],
      ["Booking ID", bookingId],
    ] as const) {
      if (value && !mongoose.isValidObjectId(value)) {
        return NextResponse.json(
          { success: false, message: `${label} is invalid` },
          { status: 400 }
        );
      }
    }

    if (tourId) filter.tour = new mongoose.Types.ObjectId(tourId);
    if (userId) filter.user = new mongoose.Types.ObjectId(userId);
    if (bookingId) filter.booking = new mongoose.Types.ObjectId(bookingId);

    const reviews = await Review.find(filter)
      .populate("user", "name lastName")
      .populate("tour", "title destination")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      { success: true, count: reviews.length, data: reviews },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get reviews error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
