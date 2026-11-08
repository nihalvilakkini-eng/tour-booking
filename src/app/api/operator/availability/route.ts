import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Tour from "@/models/Tour";
import Availability from "@/models/Availability";
import Booking from "@/models/Booking";
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

    if (
      !availabilityId ||
      typeof availabilityId !== "string" ||
      !mongoose.isValidObjectId(availabilityId)
    ) {
      return NextResponse.json(
        { success: false, message: "A valid availability ID is required" },
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

    // Direct toggle if only isAvailable is being updated
    if (
      isAvailable !== undefined &&
      date === undefined &&
      endDate === undefined &&
      startTime === undefined &&
      endTime === undefined &&
      totalSeats === undefined &&
      availableSeats === undefined
    ) {
      if (typeof isAvailable !== "boolean") {
        return NextResponse.json(
          { success: false, message: "Availability status must be active or deactive" },
          { status: 400 }
        );
      }
      availability.isAvailable = isAvailable;
      await availability.save();

      return NextResponse.json({
        success: true,
        message: isAvailable
          ? "Availability activated successfully"
          : "Availability deactivated successfully",
        data: availability,
      });
    }

    const parseDateInput = (value: unknown, fallback: Date) => {
      if (value === undefined || value === null || value === "") {
        return fallback;
      }
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
      }
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
        ? null
        : parsed;
    };

    const nextDate = parseDateInput(date, availability.date);
    const nextEndDate = parseDateInput(
      endDate,
      availability.endDate ?? availability.date
    );

    if (!nextDate || !nextEndDate) {
      return NextResponse.json(
        { success: false, message: "Invalid date. Use YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (nextEndDate < nextDate) {
      return NextResponse.json(
        { success: false, message: "Ending date cannot be before the starting date" },
        { status: 400 }
      );
    }

    const bookedBookings = await Booking.find({
      availability: availability._id,
      status: { $in: ["pending", "accepted", "confirmed", "completed"] },
    })
      .select("participants")
      .lean();
    const bookedSeats = bookedBookings.reduce(
      (total, booking) => total + (booking.participants || 0),
      0
    );

    const nextTotalSeats = totalSeats === undefined ? availability.totalSeats : Number(totalSeats);
    const nextAvailableSeats = availableSeats === undefined
      ? totalSeats === undefined
        ? availability.availableSeats
        : Math.max(0, nextTotalSeats - bookedSeats)
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

    if (nextTotalSeats < bookedSeats) {
      return NextResponse.json(
        {
          success: false,
          message: `Total seats cannot be less than already booked seats (${bookedSeats})`,
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(nextAvailableSeats) ||
      nextAvailableSeats < 0 ||
      nextAvailableSeats > nextTotalSeats - bookedSeats
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Available slots cannot exceed remaining unbooked seats (${Math.max(
            0,
            nextTotalSeats - bookedSeats
          )})`,
        },
        { status: 400 }
      );
    }

    const validTime = (value: unknown) =>
      typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    const nextStartTime = startTime ?? availability.startTime;
    const nextEndTime = endTime ?? availability.endTime ?? "";

    if (!validTime(nextStartTime)) {
      return NextResponse.json(
        { success: false, message: "Start time must be in HH:MM format" },
        { status: 400 }
      );
    }

    if (nextEndTime && (!validTime(nextEndTime) || nextEndTime <= nextStartTime)) {
      return NextResponse.json(
        { success: false, message: "End time must be after start time" },
        { status: 400 }
      );
    }

    const nextDay = new Date(nextDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const duplicateAvailability = await Availability.findOne({
      _id: { $ne: availability._id },
      tour: availability.tour,
      date: { $gte: nextDate, $lt: nextDay },
      startTime: nextStartTime,
    });

    if (duplicateAvailability) {
      return NextResponse.json(
        {
          success: false,
          message: "Availability already exists for this date and start time",
        },
        { status: 409 }
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
      isAvailable,
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

    if (typeof tourId !== "string" || !mongoose.isValidObjectId(tourId)) {
      return NextResponse.json(
        { success: false, message: "A valid tour ID is required" },
        { status: 400 }
      );
    }

    const validTime = (value: unknown) =>
      typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

    if (!validTime(startTime)) {
      return NextResponse.json(
        { success: false, message: "Start time must be in HH:MM format" },
        { status: 400 }
      );
    }

    if (endTime !== undefined && endTime !== "" && !validTime(endTime)) {
      return NextResponse.json(
        { success: false, message: "End time must be in HH:MM format" },
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

    const parseDateInput = (value: unknown) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
      }
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value
        ? null
        : parsed;
    };

    const availabilityDate = parseDateInput(date);
    const availabilityEndDate = endDate ? parseDateInput(endDate) : availabilityDate;

    if (!availabilityDate || !availabilityEndDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Date and end date must use YYYY-MM-DD format",
        },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (availabilityDate < today) {
      return NextResponse.json(
        { success: false, message: "Availability date cannot be in the past" },
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

    if (isAvailable !== undefined && typeof isAvailable !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          message: "Availability status must be true or false",
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
    const nextDay = new Date(availabilityDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const existingAvailability = await Availability.findOne({
      tour: tourId,
      date: { $gte: availabilityDate, $lt: nextDay },
      startTime,
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
      isAvailable: isAvailable ?? true,
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