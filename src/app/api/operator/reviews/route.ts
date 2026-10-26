import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Review from "@/models/Review";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request.cookies.get("token")?.value);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Operator authentication required",
        },
        { status: 401 }
      );
    }

    if (user.role !== "operator") {
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
      operator: user.userId,
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