import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
export const dynamic = "force-dynamic";

type JwtPayload = {
  userId: string;
  role: "user" | "operator" | "admin";
};

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    if (decoded.role !== "admin") {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);

    const rating = searchParams.get("rating")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";

    const query: Record<string, unknown> = {};

    if (rating) {
      const ratingNumber = Number(rating);

      if (
        !Number.isNaN(ratingNumber) &&
        ratingNumber >= 1 &&
        ratingNumber <= 5
      ) {
        query.rating = ratingNumber;
      }
    }

    const reviews = await Review.find(query)
      .populate(
        "user",
        "firstName lastName email"
      )
      .populate(
        "tour",
        "title destination"
      )
      .populate(
        "booking",
        "bookingDate participants status"
      )
      .sort({ createdAt: -1 })
      .lean();

    let filteredReviews = reviews;

    type ReviewSummary = {
      user?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
      } | null;
      tour?: {
        title?: string | null;
        destination?: string | null;
      } | null;
      comment?: string | null;
    };

    if (search) {
      const searchLower = search.toLowerCase();

      filteredReviews = reviews.filter((review) => {
        const reviewSummary = review as unknown as ReviewSummary;
        const userName = `${reviewSummary.user?.firstName || ""} ${
          reviewSummary.user?.lastName || ""
        }`.toLowerCase();

        const userEmail =
          reviewSummary.user?.email?.toLowerCase() || "";

        const tourTitle =
          reviewSummary.tour?.title?.toLowerCase() || "";

        const destination =
          reviewSummary.tour?.destination?.toLowerCase() || "";

        const comment =
          reviewSummary.comment?.toLowerCase() || "";

        return (
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          tourTitle.includes(searchLower) ||
          destination.includes(searchLower) ||
          comment.includes(searchLower)
        );
      });
    }

    return NextResponse.json({
      success: true,
      count: filteredReviews.length,
      data: filteredReviews,
    });
  } catch (error) {
    console.error("ADMIN REVIEWS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch reviews",
      },
      { status: 500 }
    );
  }
}