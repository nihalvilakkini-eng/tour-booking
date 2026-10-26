import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Tour from "@/models/Tour";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

async function checkAdmin(request: NextRequest) {
  const user = await getRequestUser(request.cookies.get("token")?.value);
  return user?.role === "admin" ? user : null;
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

    const search = searchParams.get("search")?.trim() || "";
    const destination =
      searchParams.get("destination")?.trim() || "";
    const activityType =
      searchParams.get("activityType")?.trim() || "";

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          destination: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (destination) {
      query.destination = {
        $regex: destination,
        $options: "i",
      };
    }

    if (activityType) {
      query.activityType = {
        $regex: activityType,
        $options: "i",
      };
    }

    const tours = await Tour.find(query)
      .populate(
        "operator",
        "firstName lastName email"
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: tours.length,
      data: tours,
    });
  } catch (error) {
    console.error("ADMIN TOURS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch tours",
      },
      { status: 500 }
    );
  }
}