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
      .populate("user", "name lastName email")
      .populate("tour", "title destination images rating reviewCount")
      .sort({ createdAt: -1 })
      .lean();

    const data = reviews.map((review) => {
      const user = review.user as unknown as {
        name?: string;
        lastName?: string;
        email?: string;
      } | null;
      const tour = review.tour as unknown as {
        title?: string;
        destination?: string;
        images?: string[];
      } | null;

      return {
        ...review,
        customerName:
          [user?.name, user?.lastName].filter(Boolean).join(" ") ||
          user?.email ||
          "Customer",
        customerEmail: user?.email || "",
        tourName: tour?.title || "Tour",
        tourDestination: tour?.destination || "",
        tourImages: tour?.images || [],
      };
    });

    return NextResponse.json({
      success: true,
      data,
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