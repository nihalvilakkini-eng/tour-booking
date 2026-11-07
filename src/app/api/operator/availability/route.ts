import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Availability from "@/models/Availability";
import { getRequestUser } from "@/lib/request-user";
export const dynamic = "force-dynamic";

async function getOperatorId(request: NextRequest) {
  const user = await getRequestUser(request.cookies.get("token")?.value);
  return user?.role === "operator" ? user.userId : null;
}

// GET - Operator's availability
export async function GET(request: NextRequest) {
  try {
    const operatorId = await getOperatorId(request);

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
      .populate("tour", "title destination images")
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

// PATCH - Update an availability record owned by this operator.
export async function PATCH(request: NextRequest) {
  try {
    const operatorId = await getOperatorId(request);

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
    const { availabilityId, date, endDate, startTime, endTime, totalSeats, availableSeats, isAvailable } = body;

    if (!availabilityId || typeof availabilityId !== "string") {
      return NextResponse.json(
        { success: false, message: "Availability ID is required" },
        { status: 400 }
      );
    }

    const availability = await Availability.findById(availabilityId);

    if (!availability) {
      return NextResponse.json(
        { success: false, message: "Availability not found" },
        { status: 404 }
      );
    }

    const tour = await Tour.findOne({
      _id: availability.tour,
      operator: operatorId,
    });

    if (!tour) {
      return NextResponse.json(
        { success: false, message: "Availability not found or access denied" },
        { status: 404 }
      );
    }

    const nextDate = date ? new Date(date) : availability.date;
    const nextEndDate = endDate ? new Date(endDate) : availability.endDate ?? availability.date;

    if (Number.isNaN(nextDate.getTime()) || Number.isNaN(nextEndDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date" },
        { status: 400 }
      );
    }

    if (nextEndDate < nextDate) {
      return NextResponse.json(
        { success: false, message: "Ending date cannot be before the starting date" },
        { status: 400 }
      );
    }

    const nextTotalSeats = totalSeats === undefined ? availability.totalSeats : Number(totalSeats);
    const bookedSeats = Math.max(0, availability.totalSeats - availability.availableSeats);
    const nextAvailableSeats = availableSeats === undefined
      ? Math.max(0, nextTotalSeats - bookedSeats)
      : Number(availableSeats);

    if (!Number.isInteger(nextTotalSeats) || nextTotalSeats < 1) {
      return NextResponse.json(
        { success: false, message: "Total seats must be at least 1" },
        { status: 400 }
      );
    }

    if (nextTotalSeats > tour.maxParticipants) {
      return NextResponse.json(
        {
          success: false,
          message: `Total seats cannot exceed maximum participants (${tour.maxParticipants})`,
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(nextAvailableSeats) ||
      nextAvailableSeats < bookedSeats ||
      nextAvailableSeats > nextTotalSeats
    ) {
      return NextResponse.json(
        { success: false, message: "Available slots cannot be less than booked seats" },
        { status: 400 }
      );
    }

    if (startTime !== undefined && typeof startTime !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid start time" },
        { status: 400 }
      );
    }

    if (endTime !== undefined && typeof endTime !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid end time" },
        { status: 400 }
      );
    }

    const nextStartTime = startTime ?? availability.startTime;
    const nextEndTime = endTime ?? availability.endTime ?? "";

    if (nextEndTime && nextEndTime <= nextStartTime) {
      return NextResponse.json(
        { success: false, message: "End time must be after start time" },
        { status: 400 }
      );
    }

    availability.date = nextDate;
    availability.endDate = nextEndDate;
    availability.startTime = nextStartTime;
    availability.endTime = nextEndTime;
    availability.totalSeats = nextTotalSeats;
    availability.availableSeats = nextAvailableSeats;

    if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Availability status must be active or deactive" },
          { status: 400 }
        );
      }
      availability.isAvailable = isAvailable;
    }

    await availability.save();

    return NextResponse.json({
      success: true,
      message: "Availability updated successfully",
      data: availability,
    });
  } catch (error) {
    console.error("Operator availability PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update availability" },
      { status: 500 }
    );
  }
}

// POST - Add availability
export async function POST(request: NextRequest) {
  try {
    const operatorId = await getOperatorId(request);

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
      endDate,
      startTime,
      endTime,
      totalSeats,
      availableSeats,
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
    const availabilityEndDate = endDate ? new Date(endDate) : availabilityDate;

    if (
      Number.isNaN(availabilityDate.getTime()) ||
      Number.isNaN(availabilityEndDate.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid date",
        },
        { status: 400 }
      );
    }

    if (availabilityEndDate < availabilityDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Ending date cannot be before the starting date",
        },
        { status: 400 }
      );
    }

    const requestedAvailableSeats =
      availableSeats === undefined ? totalSeats : Number(availableSeats);

    if (
      !Number.isInteger(requestedAvailableSeats) ||
      requestedAvailableSeats < 0 ||
      requestedAvailableSeats > totalSeats
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Available slots must be between 0 and total seats",
        },
        { status: 400 }
      );
    }

    if (endTime && endTime <= startTime) {
      return NextResponse.json(
        {
          success: false,
          message: "End time must be after start time",
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
      endDate: availabilityEndDate,
      startTime,
      endTime: endTime || "",
      totalSeats,
      availableSeats: requestedAvailableSeats,
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