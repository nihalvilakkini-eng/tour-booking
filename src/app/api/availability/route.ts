import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";
import Availability from "@/models/Availability";
import Tour from "@/models/Tour";
export const dynamic = "force-dynamic";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Please define JWT_SECRET in .env.local");
  }

  return secret;
}

function getUserFromToken(token: string) {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded === "string") {
    throw new Error("Invalid token");
  }

  if (
    typeof decoded.userId !== "string" ||
    typeof decoded.role !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: decoded.userId,
    role: decoded.role,
  };
}

// CREATE AVAILABILITY
// Only operator can create availability
export async function POST(request: NextRequest) {
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

    const { userId, role } = getUserFromToken(token);

    if (role !== "operator") {
      return NextResponse.json(
        {
          success: false,
          message: "Only operators can create availability",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      tourId,
      date,
      startTime,
      endTime,
      totalSeats,
    } = body;

    // Validation

    if (!tourId) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour ID is required",
        },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          message: "Date is required",
        },
        { status: 400 }
      );
    }

    if (!startTime) {
      return NextResponse.json(
        {
          success: false,
          message: "Start time is required",
        },
        { status: 400 }
      );
    }

    if (!totalSeats || totalSeats < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Total seats must be at least 1",
        },
        { status: 400 }
      );
    }

    // Check tour

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour not found",
        },
        { status: 404 }
      );
    }

    // Operator can add availability only to own tour

    if (tour.operator.toString() !== userId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You can only add availability for your own tours",
        },
        { status: 403 }
      );
    }

    // Check duplicate availability

    const existingAvailability = await Availability.findOne({
      tour: tourId,
      date: new Date(date),
      startTime,
      isAvailable: true,
    });

    if (existingAvailability) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Availability already exists for this date and time",
        },
        { status: 409 }
      );
    }

    // Create availability

    const availability = await Availability.create({
      tour: tourId,
      date: new Date(date),
      startTime,
      endTime: endTime || "",
      totalSeats,
      availableSeats: totalSeats,
      isAvailable: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Availability created successfully",
        data: availability,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create availability error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create availability",
      },
      { status: 500 }
    );
  }
}

// GET AVAILABILITY
// Users can check available slots
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const tourId = searchParams.get("tourId");
    const date = searchParams.get("date");

    const filter: Record<string, unknown> = {
      isAvailable: true,
      availableSeats: { $gt: 0 },
    };

    if (tourId) {
      filter.tour = tourId;
    }

    if (date) {
      const selectedDate = new Date(date);

      const nextDate = new Date(selectedDate);
      nextDate.setDate(nextDate.getDate() + 1);

      filter.date = {
        $gte: selectedDate,
        $lt: nextDate,
      };
    }

    const availability = await Availability.find(filter)
      .populate(
        "tour",
        "title destination activityType price duration durationUnit"
      )
      .sort({
        date: 1,
        startTime: 1,
      });

    return NextResponse.json(
      {
        success: true,
        count: availability.length,
        data: availability,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get availability error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch availability",
      },
      { status: 500 }
    );
  }
}