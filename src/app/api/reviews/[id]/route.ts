import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import Tour from "@/models/Tour";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// =========================
// GET - Single Review
// =========================

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const review = await Review.findById(id)
      .populate("user", "name lastName")
      .populate("tour", "title destination");

    if (!review) {
      return NextResponse.json(
        {
          success: false,
          message: "Review not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: review,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get review error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch review",
      },
      { status: 500 }
    );
  }
}

// =========================
// PATCH - Update Review
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

    const user = await getRequestUser(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const review = await Review.findById(id);

    if (!review) {
      return NextResponse.json(
        {
          success: false,
          message: "Review not found",
        },
        { status: 404 }
      );
    }

    // Only review owner or admin can update
    if (
      user.role !== "admin" &&
      review.user.toString() !== user.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to update this review",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { rating, comment } = body;

    if (rating === undefined && comment === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Rating or comment is required",
        },
        { status: 400 }
      );
    }

    if (rating !== undefined) {
      const newRating = Number(rating);

      if (
        !Number.isInteger(newRating) ||
        newRating < 1 ||
        newRating > 5
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Rating must be between 1 and 5",
          },
          { status: 400 }
        );
      }

      review.rating = newRating;
    }

    if (comment !== undefined) {
      const newComment = String(comment).trim();

      if (!newComment) {
        return NextResponse.json(
          {
            success: false,
            message: "Comment cannot be empty",
          },
          { status: 400 }
        );
      }

      review.comment = newComment;
    }

    await review.save();

    // Recalculate tour rating
    const reviews = await Review.find({
      tour: review.tour,
    });

    const totalRating = reviews.reduce(
      (sum, item) => sum + item.rating,
      0
    );

    const averageRating =
      reviews.length > 0
        ? totalRating / reviews.length
        : 0;

    await Tour.findByIdAndUpdate(
      review.tour,
      {
        rating: Number(averageRating.toFixed(1)),
        reviewCount: reviews.length,
      }
    );

    const updatedReview = await Review.findById(review._id)
      .populate("user", "name lastName")
      .populate("tour", "title destination");

    return NextResponse.json(
      {
        success: true,
        message: "Review updated successfully",
        data: updatedReview,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update review error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update review",
      },
      { status: 500 }
    );
  }
}

// =========================
// DELETE - Delete Review
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

    const user = await getRequestUser(token);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired token",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const review = await Review.findById(id);

    if (!review) {
      return NextResponse.json(
        {
          success: false,
          message: "Review not found",
        },
        { status: 404 }
      );
    }

    // Only owner or admin can delete
    if (
      user.role !== "admin" &&
      review.user.toString() !== user.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to delete this review",
        },
        { status: 403 }
      );
    }

    const tourId = review.tour;

    await Review.findByIdAndDelete(id);

    // Recalculate tour rating
    const reviews = await Review.find({
      tour: tourId,
    });

    const totalRating = reviews.reduce(
      (sum, item) => sum + item.rating,
      0
    );

    const averageRating =
      reviews.length > 0
        ? totalRating / reviews.length
        : 0;

    await Tour.findByIdAndUpdate(
      tourId,
      {
        rating: Number(averageRating.toFixed(1)),
        reviewCount: reviews.length,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Review deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete review error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete review",
      },
      { status: 500 }
    );
  }
}