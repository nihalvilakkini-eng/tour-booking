import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

// GET SINGLE TOUR
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    const tour = await Tour.findOne({
      _id: id,
      isActive: true,
    }).populate("operator", "name lastName email");

    if (!tour) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: tour,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get tour error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch tour",
      },
      { status: 500 }
    );
  }
}

// UPDATE TOUR
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const user = await getRequestUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired login session" },
        { status: 401 }
      );
    }

    const { userId, role } = user;

    if (role !== "operator" && role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only operators or admins can update tours",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const tour = await Tour.findById(id);

    if (!tour) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour not found",
        },
        { status: 404 }
      );
    }

    // Operator can update only their own tour
    if (
      role === "operator" &&
      tour.operator.toString() !== userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only update your own tours",
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Partial<Record<string, unknown>>;

    const allowedFields = [
      "title",
      "description",
      "destination",
      "activityType",
      "duration",
      "durationUnit",
      "price",
      "currency",
      "maxParticipants",
      "itinerary",
      "highlights",
      "meetingPoint",
      "inclusions",
      "exclusions",
    ] as const;

    const tourRecord = tour as unknown as Record<string, unknown>;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        tourRecord[field] = body[field];
      }
    }

    await tour.save();

    return NextResponse.json(
      {
        success: true,
        message: "Tour updated successfully",
        data: tour,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update tour error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update tour",
      },
      { status: 500 }
    );
  }
}

// DELETE / DEACTIVATE TOUR
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      );
    }

    const user = await getRequestUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired login session" },
        { status: 401 }
      );
    }

    const { userId, role } = user;

    if (role !== "operator" && role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Only operators or admins can delete tours",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const tour = await Tour.findById(id);

    if (!tour) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour not found",
        },
        { status: 404 }
      );
    }

    // Operator can delete only their own tour
    if (
      role === "operator" &&
      tour.operator.toString() !== userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only delete your own tours",
        },
        { status: 403 }
      );
    }

    // Soft delete
    tour.isActive = false;

    await tour.save();

    return NextResponse.json(
      {
        success: true,
        message: "Tour deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete tour error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete tour",
      },
      { status: 500 }
    );
  }
}