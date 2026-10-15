import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import Booking from "@/models/Booking";
import Tour from "@/models/Tour";
export const dynamic = "force-dynamic";

type JwtPayload = {
  userId: string;
  role: "user" | "operator" | "admin";
  email: string;
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
// POST - Create Review
// =========================

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Please login to write a review",
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

    const body = await request.json();

    const { bookingId, rating, comment } = body;

    // Validate booking ID
    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required",
        },
        { status: 400 }
      );
    }

    // Validate rating
    const reviewRating = Number(rating);

    if (
      !Number.isInteger(reviewRating) ||
      reviewRating < 1 ||
      reviewRating > 5
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Rating must be between 1 and 5",
        },
        { status: 400 }
      );
    }

    // Validate comment
    if (!comment || !String(comment).trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Comment is required",
        },
        { status: 400 }
      );
    }

    // Find booking
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

    // Only booking owner can review
    if (booking.user.toString() !== user.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only review your own booking",
        },
        { status: 403 }
      );
    }

    // Review only after completed tour
    if (booking.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          message: "You can review only after completing the tour",
        },
        { status: 400 }
      );
    }

    // Check existing review
    const existingReview = await Review.findOne({
      user: user.userId,
      booking: bookingId,
    });

    if (existingReview) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already reviewed this booking",
        },
        { status: 400 }
      );
    }

    // Create review
    const review = await Review.create({
      user: user.userId,
      tour: booking.tour,
      booking: booking._id,
      rating: reviewRating,
      comment: String(comment).trim(),
    });

    // Calculate new tour rating
    const reviews = await Review.find({
      tour: booking.tour,
    });

    const totalRating = reviews.reduce(
      (sum, item) => sum + item.rating,
      0
    );

    const averageRating =
      reviews.length > 0
        ? totalRating / reviews.length
        : 0;

    // Update tour rating
    await Tour.findByIdAndUpdate(booking.tour, {
      rating: Number(averageRating.toFixed(1)),
      reviewCount: reviews.length,
    });

    const populatedReview = await Review.findById(review._id)
      .populate("user", "name lastName")
      .populate("tour", "title destination");

    return NextResponse.json(
      {
        success: true,
        message: "Review created successfully",
        data: populatedReview,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create review error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create review",
      },
      { status: 500 }
    );
  }
}

// =========================
// GET - Get Reviews
// =========================

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const tourId = searchParams.get("tourId");
    const userId = searchParams.get("userId");

    const filter: Record<string, unknown> = {};

    if (tourId) {
      filter.tour = tourId;
    }

    if (userId) {
      filter.user = userId;
    }

    const reviews = await Review.find(filter)
      .populate("user", "name lastName")
      .populate("tour", "title destination")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        count: reviews.length,
        data: reviews,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get reviews error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch reviews",
      },
      { status: 500 }
    );
  }
}