import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Review from "@/models/Review";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request: NextRequest) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json(
        {
          success: false,
          message: "JWT_SECRET is not configured",
        },
        { status: 500 }
      );
    }

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Operator authentication required",
        },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };

    if (decoded.role !== "operator") {
      return NextResponse.json(
        {
          success: false,
          message: "Only operators can access this resource",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const tours = await Tour.find({
      operator: decoded.userId,
    }).select("_id");

    const tourIds = tours.map((tour) => tour._id);

    const reviews = await Review.find({
      tour: { $in: tourIds },
    })
      .populate("user", "firstName lastName email")
      .populate("tour", "title destination rating reviewCount")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error("Operator reviews GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch operator reviews",
      },
      { status: 500 }
    );
  }
}