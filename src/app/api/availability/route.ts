
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Availability from "@/models/Availability";
import Tour from "@/models/Tour";
import { getRequestUser, type RequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

// CREATE AVAILABILITY
// Admin: any tour
// Operator: own tours only
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return jsonError("Authentication required", 401);
    }

    const user: RequestUser | null = await getRequestUser(token);
    if (!user) {
      return jsonError("Invalid or expired login session", 401);
    }

    const { userId, role } = user;

    if (role !== "admin" && role !== "operator") {
      return jsonError(
        "Only admins and operators can create availability",
        403
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

    if (
      typeof tourId !== "string" ||
      !mongoose.isValidObjectId(tourId)
    ) {
      return jsonError("A valid Tour ID is required", 400);
    }

    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return jsonError(
        "Date is required in YYYY-MM-DD format",
        400
      );
    }

    const selectedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.toISOString().slice(0, 10) !== date
    ) {
      return jsonError("Please provide a valid date", 400);
    }

    // Prevent creating availability for a past date.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return jsonError("Availability date cannot be in the past", 400);
    }

    const validTime = (value: unknown) =>
      typeof value === "string" &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

    if (!validTime(startTime)) {
      return jsonError(
        "Start time is required in HH:MM format",
        400
      );
    }

    if (endTime !== undefined && endTime !== "" && !validTime(endTime)) {
      return jsonError(
        "End time must be in HH:MM format",
        400
      );
    }

    if (
      endTime &&
      validTime(startTime) &&
      endTime <= startTime
    ) {
      return jsonError("End time must be after start time", 400);
    }

    if (
      !Number.isInteger(totalSeats) ||
      totalSeats < 1
    ) {
      return jsonError(
        "Total seats must be a whole number greater than zero",
        400
      );
    }

    const tour = await Tour.findById(tourId);

    if (!tour) {
      return jsonError("Tour not found", 404);
    }

    // Operators can manage only their own tours.
    // Admins can manage availability for any tour.
    if (
      role === "operator" &&
      String(tour.operator) !== userId
    ) {
      return jsonError(
        "You can only add availability for your own tours",
        403
      );
    }

    // Check for an existing slot on the same date and start time.
    const nextDate = new Date(selectedDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const existingAvailability = await Availability.findOne({
      tour: tourId,
      date: {
        $gte: selectedDate,
        $lt: nextDate,
      },
      startTime,
    });

    if (existingAvailability) {
      return jsonError(
        "Availability already exists for this date and start time",
        409
      );
    }

    const availability = await Availability.create({
      tour: tourId,
      date: selectedDate,
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

    return jsonError("Failed to create availability", 500);
  }
}

// GET AVAILABILITY
// Customers can see bookable slots.
// Optional query parameters: tourId and date.
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
      if (!mongoose.isValidObjectId(tourId)) {
        return jsonError("Invalid Tour ID", 400);
      }

      filter.tour = tourId;
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return jsonError(
          "Date must be in YYYY-MM-DD format",
          400
        );
      }

      const selectedDate = new Date(`${date}T00:00:00.000Z`);

      if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate.toISOString().slice(0, 10) !== date
      ) {
        return jsonError("Please provide a valid date", 400);
      }

      const nextDate = new Date(selectedDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

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
      .sort({ date: 1, startTime: 1 });

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

    return jsonError("Failed to fetch availability", 500);
  }
}
