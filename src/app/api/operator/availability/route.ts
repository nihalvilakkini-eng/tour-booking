import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Availability from "@/models/Availability";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;

function getOperatorId(request: NextRequest) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, JWT_SECRET) as {
    userId: string;
    role: string;
  };

  if (decoded.role !== "operator") {
    return null;
  }

  return decoded.userId;
}

// GET - Operator's availability
export async function GET(request: NextRequest) {
  try {
    const operatorId = getOperatorId(request);

    if (!operatorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Operator authentication required",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const tours = await Tour.find({
      operator: operatorId,
    }).select("_id");

    const tourIds = tours.map((tour) => tour._id);

    const availability = await Availability.find({
      tour: { $in: tourIds },
    })
      .populate("tour", "title destination")
      .sort({ date: 1, startTime: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("Operator availability GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch availability",
      },
      { status: 500 }
    );
  }
}

// POST - Add availability
export async function POST(request: NextRequest) {
  try {
    const operatorId = getOperatorId(request);

    if (!operatorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Operator authentication required",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();

    const {
      tourId,
      date,
      startTime,
      endTime,
      totalSeats,
    } = body;

    if (!tourId || !date || !startTime || !totalSeats) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tour, date, start time and total seats are required",
        },
        { status: 400 }
      );
    }

    if (!Number.isInteger(totalSeats) || totalSeats < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Total seats must be at least 1",
        },
        { status: 400 }
      );
    }

    // Check tour belongs to this operator
    const tour = await Tour.findOne({
      _id: tourId,
      operator: operatorId,
      isActive: true,
    });

    if (!tour) {
      return NextResponse.json(
        {
          success: false,
          message: "Tour not found or you do not own this tour",
        },
        { status: 404 }
      );
    }

    // Check seats do not exceed tour capacity
    if (totalSeats > tour.maxParticipants) {
      return NextResponse.json(
        {
          success: false,
          message: `Total seats cannot exceed maximum participants (${tour.maxParticipants})`,
        },
        { status: 400 }
      );
    }

    const availabilityDate = new Date(date);

    if (Number.isNaN(availabilityDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date",
        },
        { status: 400 }
      );
    }

    // Check duplicate slot
    const existingAvailability = await Availability.findOne({
      tour: tourId,
      date: availabilityDate,
      startTime,
      isAvailable: true,
    });

    if (existingAvailability) {
      return NextResponse.json(
        {
          success: false,
          message: "Availability already exists for this date and time",
        },
        { status: 409 }
      );
    }

    const availability = await Availability.create({
      tour: tourId,
      date: availabilityDate,
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
    console.error("Operator availability POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create availability",
      },
      { status: 500 }
    );
  }
}